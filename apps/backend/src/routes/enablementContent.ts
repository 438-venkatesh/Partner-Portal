import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireOperationsDbRole } from '../middleware/requireRole';
import { playbookService } from '../services/playbookService';
import { assetLibraryService } from '../services/assetLibraryService';
import { createPlaybookSchema, updatePlaybookSchema, updateAssetSchema } from '@partner-portal/common';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function enablementContentRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  // ---- playbooks ----
  fastify.get('/playbooks', async (_request, reply) => {
    const playbooks = await playbookService.listAll();
    return reply.send({ playbooks });
  });

  fastify.post(
    '/playbooks',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { body: zodToFastifySchema(createPlaybookSchema) },
    },
    async (request, reply) => {
      const playbook = await playbookService.create(request.body as any);
      return reply.code(201).send({ playbook });
    }
  );

  fastify.patch(
    '/playbooks/:playbookId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ playbookId: z.string().uuid() })),
        body: zodToFastifySchema(updatePlaybookSchema),
      },
    },
    async (request, reply) => {
      const playbook = await playbookService.update(
        (request.params as { playbookId: string }).playbookId,
        request.body as any
      );
      if (!playbook) return reply.code(404).send({ message: 'Playbook not found' });
      return reply.send({ playbook });
    }
  );

  fastify.delete(
    '/playbooks/:playbookId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { params: zodToFastifySchema(z.object({ playbookId: z.string().uuid() })) },
    },
    async (request, reply) => {
      await playbookService.delete((request.params as { playbookId: string }).playbookId);
      return reply.code(204).send();
    }
  );

  // ---- marketing assets ----
  fastify.get('/assets', async (_request, reply) => {
    const assets = await assetLibraryService.listAll();
    return reply.send({ assets });
  });

  fastify.post(
    '/assets',
    { preHandler: requireOperationsDbRole('admin', 'superadmin') },
    async (request, reply) => {
      try {
        const asset = await assetLibraryService.createFromUpload(request);
        return reply.code(201).send({ asset });
      } catch (error: any) {
        return reply.code(400).send({ message: error.message });
      }
    }
  );

  fastify.patch(
    '/assets/:assetId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ assetId: z.string().uuid() })),
        body: zodToFastifySchema(updateAssetSchema),
      },
    },
    async (request, reply) => {
      const asset = await assetLibraryService.update(
        (request.params as { assetId: string }).assetId,
        request.body as any
      );
      if (!asset) return reply.code(404).send({ message: 'Asset not found' });
      return reply.send({ asset });
    }
  );

  fastify.delete(
    '/assets/:assetId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { params: zodToFastifySchema(z.object({ assetId: z.string().uuid() })) },
    },
    async (request, reply) => {
      await assetLibraryService.delete((request.params as { assetId: string }).assetId);
      return reply.code(204).send();
    }
  );
}
