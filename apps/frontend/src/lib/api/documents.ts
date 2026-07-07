import { apiClient } from './client';
import { parseBlobError } from '@/lib/documentFile';

export interface Document {
  documentId: string;
  partnerId: string;
  documentType: string;
  documentName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  version?: string;
  expiryDate?: string;
  status: string;
  verifiedBy?: string;
  verifiedAt?: string;
  uploadedBy?: string;
  uploadedAt: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadDocumentData {
  partnerId: string;
  documentType: string;
  documentName: string;
  file: File;
  expiryDate?: string;
  notes?: string;
}

export interface VerifyDocumentData {
  verified: boolean;
  notes?: string;
}

function normalizePartnerDocument(row: Record<string, unknown>): Document | null {
  const documentId = row.documentId ?? row.document_id;
  const documentName = row.documentName ?? row.document_name;
  if (!documentId || !documentName) return null;
  return {
    documentId: String(documentId),
    partnerId: String(row.partnerId ?? row.partner_id ?? ''),
    documentType: String(row.documentType ?? row.document_type ?? ''),
    documentName: String(documentName),
    fileUrl: String(row.fileUrl ?? row.file_url ?? ''),
    fileSize: (row.fileSize ?? row.file_size) as number | undefined,
    mimeType: (row.mimeType ?? row.mime_type) as string | undefined,
    version: row.version as string | undefined,
    expiryDate: (row.expiryDate ?? row.expiry_date) as string | undefined,
    status: String(row.status ?? 'pending'),
    verifiedBy: (row.verifiedBy ?? row.verified_by) as string | undefined,
    verifiedAt: (row.verifiedAt ?? row.verified_at) as string | undefined,
    uploadedBy: (row.uploadedBy ?? row.uploaded_by) as string | undefined,
    uploadedAt: String(row.uploadedAt ?? row.uploaded_at ?? new Date().toISOString()),
    notes: row.notes as string | undefined,
    createdAt: String(row.createdAt ?? row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? new Date().toISOString()),
  };
}

export const documentApi = {
  async getPartnerDocuments(partnerId: string): Promise<Document[]> {
    const response = await apiClient.get(`/documents/partner/${partnerId}`);
    const data = response.data;
    const raw: unknown[] = Array.isArray(data)
      ? data
      : data && typeof data === 'object' && Array.isArray((data as { documents?: unknown[] }).documents)
        ? (data as { documents: unknown[] }).documents
        : [];
    return raw
      .map((row) =>
        row && typeof row === 'object'
          ? normalizePartnerDocument(row as Record<string, unknown>)
          : null
      )
      .filter((d): d is Document => d !== null);
  },

  async uploadDocument(data: UploadDocumentData): Promise<Document> {
    const formData = new FormData();
    formData.append('partnerId', data.partnerId);
    formData.append('documentType', data.documentType);
    formData.append('documentName', data.documentName);
    formData.append('file', data.file);
    if (data.expiryDate) {
      formData.append('expiryDate', data.expiryDate);
    }
    if (data.notes) {
      formData.append('notes', data.notes);
    }

    // Let the runtime set multipart boundary (manual Content-Type breaks uploads).
    const response = await apiClient.post('/documents/upload', formData);
    return response.data;
  },

  async verifyDocument(documentId: string, data: VerifyDocumentData): Promise<void> {
    await apiClient.post(`/documents/${documentId}/verify`, data);
  },

  async fetchDocumentContent(documentId: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/documents/${documentId}/content`, {
      responseType: 'blob',
    });
    const contentType = response.headers['content-type'] || '';
    if (response.status >= 400) {
      await parseBlobError(response.data, contentType);
    }
    if (contentType.includes('application/json') || response.data.type.includes('json')) {
      await parseBlobError(response.data, contentType);
    }
    return response.data;
  },

  async deleteDocument(documentId: string): Promise<void> {
    await apiClient.delete(`/documents/${documentId}`);
  },
};










