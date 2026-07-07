import type { FastifyRequest } from 'fastify';
import type { MultipartFields } from '@fastify/multipart';

/** Read a non-empty string from multipart `fields` (not from `request.body`, which is unset for raw multipart). */
export function readMultipartFieldString(
  fields: MultipartFields | undefined,
  name: string
): string | undefined {
  if (!fields) return undefined;
  const raw = fields[name];
  if (raw === undefined) return undefined;
  const items = Array.isArray(raw) ? raw : [raw];
  for (const item of items) {
    if (item && item.type === 'field') {
      const v = item.value;
      if (v === undefined || v === null) continue;
      const s = String(v).trim();
      if (s !== '') return s;
    }
  }
  return undefined;
}

export interface CollectedMultipartUpload {
  textFields: Record<string, string>;
  /** First file part only; extra file parts are drained from the stream. */
  file: { buffer: Buffer; mimetype: string; originalFilename?: string } | null;
}

/**
 * Walk the full multipart stream so text fields are available regardless of field vs file order.
 * Prefer this over `request.file()` + `file.fields` when clients may reorder parts or send a bad Content-Type.
 */
export async function collectMultipartUpload(
  request: FastifyRequest
): Promise<CollectedMultipartUpload> {
  const textFields: Record<string, string> = {};
  let file: { buffer: Buffer; mimetype: string; originalFilename?: string } | null = null;

  if (!request.isMultipart()) {
    return { textFields, file: null };
  }

  for await (const part of request.parts()) {
    if (part.type === 'file') {
      const buffer = await part.toBuffer();
      if (!file) {
        file = {
          buffer,
          mimetype: part.mimetype || 'application/octet-stream',
          originalFilename: part.filename || undefined,
        };
      }
    } else {
      textFields[part.fieldname] =
        part.value === undefined || part.value === null ? '' : String(part.value);
    }
  }

  return { textFields, file };
}

export function trimField(
  map: Record<string, string> | undefined | null,
  name: string
): string | undefined {
  if (map == null) return undefined;
  const s = map[name]?.trim();
  return s === '' ? undefined : s;
}