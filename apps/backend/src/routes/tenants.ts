import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { tenantService } from '../services/tenantService';
import { zodToFastifySchema } from '../utils/schemaConverter';

const createSchema = z.object({
  tenantCode: z.string().min(1).max(50),
  tenantName: z.string().min(1).max(255),
  industry: z.string().max(100).optional(),
  contactEmail: z.string().email().optional(),
});

const updateSchema = z.object({
  tenantName: z.string().min(1).max(255).optional(),
  industry: z.string().max(100).optional(),
  contactEmail: z.string().email().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

const idParams = z.object({
  tenantId: z.string().uuid(),
});

export async function tenantRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  fastify.get('/', async (_request, reply) => {
    const rows = await tenantService.list();
    return reply.send({ tenants: rows });
  });

  fastify.post(
    '/',
    {
      schema: { body: zodToFastifySchema(createSchema) },
    },
    async (request, reply) => {
      const body = request.body as z.infer<typeof createSchema>;
      try {
        const row = await tenantService.create(body);
        return reply.code(201).send({ tenant: row });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Create failed';
        return reply.code(400).send({ error: msg });
      }
    }
  );

  fastify.get(
    '/:tenantId',
    {
      schema: { params: zodToFastifySchema(idParams) },
    },
    async (request, reply) => {
      const { tenantId } = request.params as z.infer<typeof idParams>;
      const row = await tenantService.getById(tenantId);
      if (!row) return reply.code(404).send({ error: 'Not found' });
      return reply.send({ tenant: row });
    }
  );

  fastify.put(
    '/:tenantId',
    {
      schema: {
        params: zodToFastifySchema(idParams),
        body: zodToFastifySchema(updateSchema),
      },
    },
    async (request, reply) => {
      const { tenantId } = request.params as z.infer<typeof idParams>;
      const body = request.body as z.infer<typeof updateSchema>;
      const row = await tenantService.update(tenantId, body);
      if (!row) return reply.code(404).send({ error: 'Not found' });
      return reply.send({ tenant: row });
    }
  );
}
