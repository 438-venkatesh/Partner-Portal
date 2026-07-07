import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticatePartner } from '../middleware/partnerAuth';
import { documentService } from '../services/documentService';
import { collectMultipartUpload, trimField } from '../utils/readMultipartField';
import { zodToFastifySchema } from '../utils/schemaConverter';

/**
 * Partner JWT–scoped document list and upload (partnerId forced from token).
 */
export async function partnerDocumentsPortalRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticatePartner);

  fastify.get('/', async (request, reply) => {
    const partnerId = request.partnerUser?.partnerId;
    if (!partnerId) return reply.code(401).send({ error: 'Unauthorized' });
    const documents = await documentService.getPartnerDocuments(partnerId);
    return reply.send({ documents });
  });

  fastify.post('/upload', async (request, reply) => {
    const partnerId = request.partnerUser?.partnerId;
    const accountId = request.partnerUser?.accountId;
    if (!partnerId || !accountId) return reply.code(401).send({ error: 'Unauthorized' });

    if (!request.isMultipart()) {
      return reply.code(400).send({ message: 'Expected multipart/form-data' });
    }

    const collected = await collectMultipartUpload(request);
    const textFields = collected.textFields ?? {};

    if (!collected.file) {
      return reply.code(400).send({ message: 'No file uploaded' });
    }
    const file = collected.file;

    const documentType = trimField(textFields, 'documentType');
    const documentName = trimField(textFields, 'documentName');
    const expiryRaw = trimField(textFields, 'expiryDate');
    const notes = trimField(textFields, 'notes');

    if (!documentType || !documentName) {
      return reply.code(400).send({ message: 'documentType and documentName are required' });
    }

    let expiryDate: Date | undefined;
    if (expiryRaw) {
      const d = new Date(expiryRaw);
      if (Number.isNaN(d.getTime())) {
        return reply.code(400).send({ message: 'expiryDate must be a valid date' });
      }
      expiryDate = d;
    }

    try {
      const document = await documentService.uploadForPartner(partnerId, accountId, {
        documentType,
        documentName,
        file: {
          buffer: file.buffer,
          size: file.buffer.length,
          mimetype: file.mimetype,
          originalFilename: file.originalFilename || documentName,
        },
        expiryDate,
        notes,
      });

      return reply.code(201).send({ document });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      const status = message.includes('Cloudinary') ? 503 : 400;
      return reply.code(status).send({ message });
    }
  });

  fastify.get('/:documentId/content', {
    schema: {
      params: zodToFastifySchema(z.object({ documentId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const partnerId = request.partnerUser?.partnerId;
    if (!partnerId) return reply.code(401).send({ error: 'Unauthorized' });

    try {
      const { buffer, mimeType, filename } = await documentService.getDocumentContentForPartner(
        request.params.documentId,
        partnerId
      );
      return reply
        .header('Content-Type', mimeType)
        .header('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`)
        .header('Cache-Control', 'private, max-age=300')
        .send(buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load document';
      const status = message === 'Document not found' ? 404 : 400;
      return reply.code(status).send({ message });
    }
  });

  fastify.delete('/:documentId', {
    schema: {
      params: zodToFastifySchema(z.object({ documentId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const partnerId = request.partnerUser?.partnerId;
    const accountId = request.partnerUser?.accountId;
    if (!partnerId || !accountId) return reply.code(401).send({ error: 'Unauthorized' });

    try {
      await documentService.deleteDocumentForPartner(request.params.documentId, partnerId, accountId);
      return reply.code(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete document';
      const status = message === 'Document not found' ? 404 : 400;
      return reply.code(status).send({ message });
    }
  });

  fastify.get('/:documentId/access', {
    schema: {
      params: zodToFastifySchema(z.object({ documentId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const partnerId = request.partnerUser?.partnerId;
    if (!partnerId) return reply.code(401).send({ error: 'Unauthorized' });

    try {
      const url = await documentService.getDocumentAccessUrlForPartner(
        request.params.documentId,
        partnerId
      );
      return reply.send({ url });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get document URL';
      const status = message === 'Document not found' ? 404 : 400;
      return reply.code(status).send({ message });
    }
  });
}
