import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireOperationsDbRole } from '../middleware/requireRole';
import { reportingService } from '../services/reportingService';
import { zodToFastifySchema } from '../utils/schemaConverter';

const exportQuerySchema = z.object({
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  columns: z.string().optional(), // comma-separated
});

export async function reportRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  fastify.get('/entities', async (_request, reply) => {
    return reply.send({ entities: reportingService.listEntities() });
  });

  fastify.get(
    '/:entity/export',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ entity: z.string() })),
        querystring: zodToFastifySchema(exportQuerySchema),
      },
    },
    async (request, reply) => {
      const { entity } = request.params as { entity: string };
      const { status, dateFrom, dateTo, columns } = request.query as z.infer<typeof exportQuerySchema>;

      try {
        const { csv, label } = await reportingService.exportCsv(
          entity,
          {
            status,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
          },
          columns ? columns.split(',').map((c) => c.trim()) : undefined
        );
        return reply
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', `attachment; filename="${label.toLowerCase().replace(/\s+/g, '-')}.csv"`)
          .send(csv);
      } catch (error: any) {
        return reply.code(400).send({ message: error.message });
      }
    }
  );
}
