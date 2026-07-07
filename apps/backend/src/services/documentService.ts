import { db } from '../db';
import { partnerDocuments } from '../db/schema/documents';
import { eq } from 'drizzle-orm';
import { cloudinaryService } from './cloudinaryService';

/** Drizzle `date('col')` defaults to string mode — PG expects YYYY-MM-DD. */
function toPgDateString(value: Date | string | undefined): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    const s = value.trim();
    return s.length >= 10 ? s.slice(0, 10) : s || undefined;
  }
  return value.toISOString().slice(0, 10);
}

export type UploadedFilePayload = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalFilename?: string;
};

async function storeFileOnCloudinary(
  partnerId: string,
  documentName: string,
  file: UploadedFilePayload
): Promise<{ fileUrl: string; storageKey: string }> {
  if (!cloudinaryService.isConfigured()) {
    throw new Error(
      'Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to apps/backend/.env'
    );
  }

  const uploaded = await cloudinaryService.uploadPartnerDocument({
    partnerId,
    buffer: file.buffer,
    mimetype: file.mimetype,
    originalFilename: file.originalFilename || documentName,
  });

  return { fileUrl: uploaded.secureUrl, storageKey: uploaded.publicId };
}

export const documentService = {
  async uploadDocument(
    data: {
      partnerId: string;
      documentType: string;
      documentName: string;
      file: UploadedFilePayload;
      expiryDate?: Date;
      notes?: string;
    },
    user: { userId: string }
  ) {
    if (!data?.partnerId || !data?.documentType || !data?.documentName) {
      throw new Error('Missing required upload fields');
    }
    if (!user?.userId) {
      throw new Error('Missing authenticated user');
    }
    if (!data.file?.buffer?.length) {
      throw new Error('Uploaded file is empty');
    }

    const { fileUrl, storageKey } = await storeFileOnCloudinary(data.partnerId, data.documentName, data.file);

    const [document] = await db
      .insert(partnerDocuments)
      .values({
        partnerId: data.partnerId,
        documentType: data.documentType,
        documentName: data.documentName,
        fileUrl,
        storageKey,
        fileSize: data.file.size || data.file.buffer.length,
        mimeType: data.file.mimetype || 'application/octet-stream',
        expiryDate: toPgDateString(data.expiryDate),
        notes: data.notes,
        uploadedBy: user.userId,
        uploadedAt: new Date(),
        status: 'pending',
      })
      .returning();

    return document;
  },

  async uploadForPartner(
    partnerId: string,
    uploadedByAccountId: string,
    data: {
      documentType: string;
      documentName: string;
      file: UploadedFilePayload;
      expiryDate?: Date;
      notes?: string;
    }
  ) {
    if (!data.file?.buffer?.length) {
      throw new Error('Uploaded file is empty');
    }

    const { fileUrl, storageKey } = await storeFileOnCloudinary(partnerId, data.documentName, data.file);

    const [document] = await db
      .insert(partnerDocuments)
      .values({
        partnerId,
        documentType: data.documentType,
        documentName: data.documentName,
        fileUrl,
        storageKey,
        fileSize: data.file.size || data.file.buffer.length,
        mimeType: data.file.mimetype || 'application/octet-stream',
        expiryDate: toPgDateString(data.expiryDate),
        notes: data.notes,
        uploadedBy: uploadedByAccountId,
        uploadedAt: new Date(),
        status: 'pending',
      })
      .returning();

    return document;
  },

  async getPartnerDocuments(partnerId: string) {
    return db
      .select()
      .from(partnerDocuments)
      .where(eq(partnerDocuments.partnerId, partnerId))
      .orderBy(partnerDocuments.uploadedAt);
  },

  async getDocumentById(documentId: string) {
    const [document] = await db
      .select()
      .from(partnerDocuments)
      .where(eq(partnerDocuments.documentId, documentId))
      .limit(1);
    return document ?? null;
  },

  async getDocumentAccessUrlForPartner(
    documentId: string,
    partnerId: string,
    opts: { disposition?: 'inline' | 'attachment' } = {}
  ): Promise<string> {
    const document = await this.getDocumentById(documentId);
    if (!document || document.partnerId !== partnerId) {
      throw new Error('Document not found');
    }
    return this.getDocumentAccessUrl(documentId, opts);
  },

  async getDocumentAccessUrl(
    documentId: string,
    opts: { disposition?: 'inline' | 'attachment' } = {}
  ): Promise<string> {
    const document = await this.getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    if (document.storageKey) {
      return cloudinaryService.getDocumentDeliveryUrl(document.storageKey, {
        mimeType: document.mimeType,
        disposition: opts.disposition ?? 'inline',
        filename: document.documentName,
        secureUrl: document.fileUrl,
      });
    }

    if (document.fileUrl?.startsWith('http://') || document.fileUrl?.startsWith('https://')) {
      return document.fileUrl;
    }

    throw new Error(
      'This document was saved before Cloudinary storage was enabled. Please upload it again.'
    );
  },

  async getDocumentContent(
    documentId: string
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const document = await this.getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const mimeType = document.mimeType || 'application/octet-stream';
    const filename = document.documentName;
    const failures: string[] = [];

    const fetchFromFileUrl = async (): Promise<Buffer | null> => {
      const url = document.fileUrl?.trim();
      if (!url?.startsWith('http://') && !url?.startsWith('https://')) {
        return null;
      }
      try {
        const response = await fetch(url);
        if (!response.ok) {
          failures.push(`file URL returned ${response.status}`);
          return null;
        }
        const buf = Buffer.from(await response.arrayBuffer());
        if (!buf.length) {
          failures.push('file URL returned empty body');
          return null;
        }
        return buf;
      } catch (err) {
        failures.push(err instanceof Error ? err.message : 'file URL fetch failed');
        return null;
      }
    };

    const fetchFromCloudinary = async (): Promise<Buffer | null> => {
      const storageKey = document.storageKey?.trim();
      if (!storageKey || storageKey.startsWith('seed/')) {
        return null;
      }
      if (!cloudinaryService.isConfigured()) {
        failures.push('Cloudinary is not configured');
        return null;
      }
      try {
        const buf = await cloudinaryService.fetchDocumentBuffer(storageKey, {
          mimeType: document.mimeType,
          secureUrl: document.fileUrl,
        });
        if (!buf.length) {
          failures.push('Cloudinary returned empty body');
          return null;
        }
        return buf;
      } catch (err) {
        failures.push(err instanceof Error ? err.message : 'Cloudinary fetch failed');
        return null;
      }
    };

    const storageKey = document.storageKey?.trim();
    const hasCloudinaryAsset = Boolean(storageKey && !storageKey.startsWith('seed/'));

    const attempts = hasCloudinaryAsset
      ? [fetchFromCloudinary, fetchFromFileUrl]
      : [fetchFromFileUrl, fetchFromCloudinary];

    for (const attempt of attempts) {
      const buffer = await attempt();
      if (buffer) {
        return { buffer, mimeType, filename };
      }
    }

    if (!storageKey && !document.fileUrl?.startsWith('http')) {
      throw new Error(
        'This document was saved before Cloudinary storage was enabled. Please upload it again.'
      );
    }

    throw new Error(
      failures.length
        ? `Could not load document: ${failures.join('; ')}`
        : 'Could not load document'
    );
  },

  async getDocumentContentForPartner(
    documentId: string,
    partnerId: string
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const document = await this.getDocumentById(documentId);
    if (!document || document.partnerId !== partnerId) {
      throw new Error('Document not found');
    }
    return this.getDocumentContent(documentId);
  },

  async deleteDocument(documentId: string): Promise<void> {
    const document = await this.getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    if (document.storageKey) {
      await cloudinaryService.deleteStoredDocument(document.storageKey, {
        mimeType: document.mimeType,
        secureUrl: document.fileUrl,
      });
    }

    const deleted = await db
      .delete(partnerDocuments)
      .where(eq(partnerDocuments.documentId, documentId))
      .returning({ id: partnerDocuments.documentId });

    if (deleted.length === 0) {
      throw new Error('Document not found');
    }
  },

  async deleteDocumentForPartner(documentId: string, partnerId: string): Promise<void> {
    const document = await this.getDocumentById(documentId);
    if (!document || document.partnerId !== partnerId) {
      throw new Error('Document not found');
    }
    await this.deleteDocument(documentId);
  },

  async verifyDocument(
    documentId: string,
    data: { verified: boolean; notes?: string },
    user: { userId: string }
  ) {
    const [document] = await db
      .update(partnerDocuments)
      .set({
        status: data.verified ? 'approved' : 'rejected',
        verifiedBy: user.userId,
        verifiedAt: new Date(),
        notes: data.notes,
        updatedAt: new Date(),
      })
      .where(eq(partnerDocuments.documentId, documentId))
      .returning();

    if (!document) {
      throw new Error('Document not found');
    }

    return document;
  },
};
