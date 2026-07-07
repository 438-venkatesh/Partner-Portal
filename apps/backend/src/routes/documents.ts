import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { documentService } from '../services/documentService';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import { zodToFastifySchema } from '../utils/schemaConverter';
import { collectMultipartUpload, trimField } from '../utils/readMultipartField';
import { db } from '../db';
import { partners } from '../db/schema/partners';
import { tierService } from '../services/tierService';

export async function documentRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  // Upload document
  fastify.post('/upload', async (request, reply) => {
    if (!request.isMultipart()) {
      return reply.code(400).send({ message: 'Expected multipart/form-data' });
    }

    const collected = await collectMultipartUpload(request);
    const textFields = collected.textFields ?? {};

    if (!collected.file) {
      return reply.code(400).send({ message: 'No file uploaded' });
    }
    const file = collected.file;

    if (!request.user?.userId) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }

    const partnerId = trimField(textFields, 'partnerId');
    const documentType = trimField(textFields, 'documentType');
    const documentName = trimField(textFields, 'documentName');
    const expiryRaw = trimField(textFields, 'expiryDate');
    const notes = trimField(textFields, 'notes');

    if (!partnerId) {
      return reply.code(400).send({ message: 'partnerId is required' });
    }
    if (!documentType || !documentName) {
      return reply.code(400).send({ message: 'documentType and documentName are required' });
    }

    const [partnerRow] = await db
      .select({ id: partners.partnerId })
      .from(partners)
      .where(eq(partners.partnerId, partnerId))
      .limit(1);
    if (!partnerRow) {
      return reply.code(400).send({
        message:
          'Partner not found in the database. Run database migrations and `pnpm db:seed` (from apps/backend), then refresh the partner list.',
      });
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
      const document = await documentService.uploadDocument(
        {
          partnerId,
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
        },
        request.user
      );

      return reply.code(201).send(document);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      const status = message.includes('Cloudinary') ? 503 : 400;
      return reply.code(status).send({ message });
    }
  });

  // Stream document bytes for in-app preview (auth required)
  fastify.get('/:documentId/content', {
    schema: {
      params: zodToFastifySchema(z.object({ documentId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    try {
      const { buffer, mimeType, filename } = await documentService.getDocumentContent(
        request.params.documentId
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

  // Signed Cloudinary URL for view or download
  fastify.get('/:documentId/access', {
    schema: {
      params: zodToFastifySchema(z.object({ documentId: z.string().uuid() })),
      querystring: zodToFastifySchema(
        z.object({
          disposition: z.enum(['inline', 'attachment']).optional(),
        })
      ),
    },
  }, async (request, reply) => {
    try {
      const disposition = request.query.disposition ?? 'inline';
      const url = await documentService.getDocumentAccessUrl(request.params.documentId, {
        disposition,
      });
      return reply.send({ url });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get document URL';
      const status = message === 'Document not found' ? 404 : 400;
      return reply.code(status).send({ message });
    }
  });

  // Get partner documents
  fastify.get('/partner/:partnerId', {
    schema: {
      params: zodToFastifySchema(z.object({ partnerId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const documents = await documentService.getPartnerDocuments(request.params.partnerId);
    return reply.send(documents);
  });

  fastify.delete('/:documentId', {
    schema: {
      params: zodToFastifySchema(z.object({ documentId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    try {
      await documentService.deleteDocument(request.params.documentId);
      return reply.code(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete document';
      const status = message === 'Document not found' ? 404 : 400;
      return reply.code(status).send({ message });
    }
  });

  // Verify document
  fastify.post('/:documentId/verify', {
    schema: {
      params: zodToFastifySchema(z.object({ documentId: z.string().uuid() })),
      body: zodToFastifySchema(z.object({
        verified: z.boolean(),
        notes: z.string().optional(),
      })),
    },
  }, async (request, reply) => {
    const document = await documentService.verifyDocument(
      request.params.documentId,
      request.body,
      request.user
    );
    await tierService.evaluateAndPromote(document.partnerId);
    return reply.code(204).send();
  });
}

