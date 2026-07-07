import crypto from 'crypto';

/**
 * Object storage abstraction — wire `STORAGE_PUBLIC_BASE_URL` or S3-compatible credentials for production.
 * Returns signed URL placeholders suitable for local development.
 */
export const storageService = {
  buildObjectKey(partnerId: string, filename: string): string {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `partners/${partnerId}/${Date.now()}-${safe}`;
  },

  getSignedDownloadUrl(storageKey: string, _expiresSeconds = 3600): string {
    const base = process.env.STORAGE_PUBLIC_BASE_URL?.replace(/\/$/, '');
    if (!base) {
      return `/api/documents/file-placeholder?key=${encodeURIComponent(storageKey)}`;
    }
    const tok = crypto.createHmac('sha256', process.env.JWT_SECRET || 'secret').update(storageKey).digest('hex').slice(0, 16);
    return `${base}/${encodeURIComponent(storageKey)}?sig=${tok}`;
  },
};
