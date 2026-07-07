export async function parseBlobError(blob: Blob, contentType: string): Promise<never> {
  let message = 'Request failed';
  if (contentType.includes('application/json') || blob.type.includes('json')) {
    try {
      const text = await blob.text();
      const parsed = JSON.parse(text) as { message?: string };
      message = parsed.message || message;
    } catch {
      /* use default */
    }
  }
  throw new Error(message);
}

export function downloadFilename(displayName: string, mimeType?: string | null, blobType?: string): string {
  if (displayName.includes('.')) return displayName;
  const mime = (mimeType || blobType || '').toLowerCase();
  if (mime.includes('pdf')) return `${displayName}.pdf`;
  if (mime.includes('png')) return `${displayName}.png`;
  if (mime.includes('jpeg') || mime.includes('jpg')) return `${displayName}.jpg`;
  if (mime.includes('gif')) return `${displayName}.gif`;
  if (mime.includes('webp')) return `${displayName}.webp`;
  return displayName;
}

export function saveBlobAsFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
