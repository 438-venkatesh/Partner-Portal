import { v2 as cloudinary } from 'cloudinary';

export type DocumentDisposition = 'inline' | 'attachment';

function ensureConfigured(): void {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in apps/backend/.env'
    );
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
}

/** PDFs use image delivery so browsers can preview them inline. */
function resourceTypeForMime(mime: string): 'image' | 'video' | 'raw' {
  const m = (mime || '').toLowerCase();
  if (m === 'application/pdf') return 'image';
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  return 'raw';
}

function resourceTypeFromDeliveryUrl(url: string): 'image' | 'video' | 'raw' | null {
  if (url.includes('/image/upload/')) return 'image';
  if (url.includes('/video/upload/')) return 'video';
  if (url.includes('/raw/upload/')) return 'raw';
  return null;
}

export const cloudinaryService = {
  isConfigured(): boolean {
    return Boolean(
      process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
        process.env.CLOUDINARY_API_KEY?.trim() &&
        process.env.CLOUDINARY_API_SECRET?.trim()
    );
  },

  async uploadPartnerDocument(opts: {
    partnerId: string;
    buffer: Buffer;
    mimetype: string;
    originalFilename: string;
  }): Promise<{ secureUrl: string; publicId: string; resourceType: 'image' | 'video' | 'raw' }> {
    ensureConfigured();
    const resourceType = resourceTypeForMime(opts.mimetype);
    const safeName = opts.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'document';

    return new Promise((resolve, reject) => {
      const uploadOptions: Record<string, unknown> = {
        folder: `partner-portal/documents/${opts.partnerId}`,
        resource_type: resourceType,
        public_id: `${Date.now()}-${safeName}`,
        overwrite: false,
        access_mode: 'public',
      };

      // Preserve .pdf extension on public_id when using image delivery.
      if (resourceType === 'image' && opts.mimetype.toLowerCase() === 'application/pdf') {
        if (!safeName.toLowerCase().endsWith('.pdf')) {
          uploadOptions.public_id = `${Date.now()}-${safeName}.pdf`;
        }
      }

      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          if (!result?.secure_url || !result.public_id) {
            reject(new Error('Cloudinary upload returned no URL'));
            return;
          }
          resolve({
            secureUrl: result.secure_url,
            publicId: result.public_id,
            resourceType: (result.resource_type as 'image' | 'video' | 'raw') || resourceType,
          });
        }
      );
      stream.end(opts.buffer);
    });
  },

  async uploadAsset(opts: {
    buffer: Buffer;
    mimetype: string;
    originalFilename: string;
  }): Promise<{ secureUrl: string; publicId: string; resourceType: 'image' | 'video' | 'raw' }> {
    ensureConfigured();
    const resourceType = resourceTypeForMime(opts.mimetype);
    const safeName = opts.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'asset';

    return new Promise((resolve, reject) => {
      const uploadOptions: Record<string, unknown> = {
        folder: 'partner-portal/marketing-assets',
        resource_type: resourceType,
        public_id: `${Date.now()}-${safeName}`,
        overwrite: false,
        access_mode: 'public',
      };

      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result?.secure_url || !result.public_id) {
          reject(new Error('Cloudinary upload returned no URL'));
          return;
        }
        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
          resourceType: (result.resource_type as 'image' | 'video' | 'raw') || resourceType,
        });
      });
      stream.end(opts.buffer);
    });
  },

  /**
   * Build a delivery URL for public uploads. Do not use sign_url/expires_at here —
   * those break inline PDF viewing for standard public assets.
   */
  getDocumentDeliveryUrl(
    publicId: string,
    opts: {
      mimeType?: string | null;
      disposition?: DocumentDisposition;
      filename?: string;
      secureUrl?: string | null;
    }
  ): string {
    ensureConfigured();

    const disposition = opts.disposition ?? 'inline';
    const resourceType =
      (opts.secureUrl ? resourceTypeFromDeliveryUrl(opts.secureUrl) : null) ||
      resourceTypeForMime(opts.mimeType || 'application/octet-stream');

    if (disposition === 'inline' && opts.secureUrl?.startsWith('https://')) {
      return opts.secureUrl;
    }

    const urlOptions: Record<string, unknown> = {
      resource_type: resourceType,
      type: 'upload',
      secure: true,
    };

    if (disposition === 'attachment') {
      urlOptions.flags = opts.filename ? `attachment:${opts.filename}` : 'attachment';
    }

    return cloudinary.url(publicId, urlOptions);
  },

  /**
   * Download file bytes using the Admin API (works when public CDN delivery returns 401 for PDFs).
   */
  async fetchDocumentBuffer(
    publicId: string,
    opts: { mimeType?: string | null; secureUrl?: string | null }
  ): Promise<Buffer> {
    ensureConfigured();

    const resourceType =
      (opts.secureUrl ? resourceTypeFromDeliveryUrl(opts.secureUrl) : null) ||
      resourceTypeForMime(opts.mimeType || 'application/octet-stream');

    if (opts.secureUrl?.startsWith('https://')) {
      try {
        const publicRes = await fetch(opts.secureUrl);
        if (publicRes.ok) {
          return Buffer.from(await publicRes.arrayBuffer());
        }
      } catch {
        /* fall through to authenticated download */
      }
    }

    const extension =
      publicId.includes('.') ? (publicId.split('.').pop() || '') : mimeToExtension(opts.mimeType);

    const expiresAt =
      Math.floor(Date.now() / 1000) + Number(process.env.CLOUDINARY_URL_TTL_SECONDS || 3600);

    const downloadUrl = cloudinary.utils.private_download_url(publicId, extension, {
      resource_type: resourceType,
      type: 'upload',
      expires_at: expiresAt,
    });

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download document from Cloudinary (${response.status})`);
    }

    return Buffer.from(await response.arrayBuffer());
  },

  /**
   * A genuinely time-limited, signed download link — unlike `getDocumentDeliveryUrl`, which
   * deliberately returns the permanent public URL for inline viewing. Use this wherever a link
   * is handed to a client to hold onto (rather than fetched and served by our own backend), so a
   * leaked/bookmarked link stops working once CLOUDINARY_URL_TTL_SECONDS elapses. Always forces
   * an attachment-style download (Cloudinary's Admin API private-download links don't support
   * inline rendering), which is fine here since in-app viewing already goes through the
   * `/content` proxy, not this method.
   */
  getSignedDownloadUrl(
    publicId: string,
    opts: { mimeType?: string | null; secureUrl?: string | null }
  ): string {
    ensureConfigured();

    const resourceType =
      (opts.secureUrl ? resourceTypeFromDeliveryUrl(opts.secureUrl) : null) ||
      resourceTypeForMime(opts.mimeType || 'application/octet-stream');
    const extension =
      publicId.includes('.') ? (publicId.split('.').pop() || '') : mimeToExtension(opts.mimeType);
    const expiresAt =
      Math.floor(Date.now() / 1000) + Number(process.env.CLOUDINARY_URL_TTL_SECONDS || 3600);

    return cloudinary.utils.private_download_url(publicId, extension, {
      resource_type: resourceType,
      type: 'upload',
      expires_at: expiresAt,
    });
  },

  async deleteStoredDocument(
    publicId: string,
    opts: { mimeType?: string | null; secureUrl?: string | null }
  ): Promise<void> {
    ensureConfigured();
    const resourceType =
      (opts.secureUrl ? resourceTypeFromDeliveryUrl(opts.secureUrl) : null) ||
      resourceTypeForMime(opts.mimeType || 'application/octet-stream');

    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true,
      });
    } catch {
      /* asset may already be removed */
    }
  },
};

function mimeToExtension(mime?: string | null): string {
  const m = (mime || '').toLowerCase();
  if (m === 'application/pdf') return 'pdf';
  if (m === 'image/png') return 'png';
  if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg';
  if (m === 'image/gif') return 'gif';
  if (m === 'image/webp') return 'webp';
  return '';
}
