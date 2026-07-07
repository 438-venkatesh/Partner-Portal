import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticatePartner } from '../middleware/partnerAuth';
import { trainingService } from '../services/trainingService';
import { submitQuizSchema } from '@partner-portal/common';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function partnerTrainingPortalRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticatePartner);

  fastify.get('/', async (request, reply) => {
    const partnerId = request.partnerUser!.partnerId;
    const available = await trainingService.listAvailableForPartner(partnerId);
    return reply.send(available);
  });

  fastify.get(
    '/courses/:courseId',
    { schema: { params: zodToFastifySchema(z.object({ courseId: z.string().uuid() })) } },
    async (request, reply) => {
      const content = await trainingService.getCourseForPartner(
        (request.params as { courseId: string }).courseId
      );
      if (!content) return reply.code(404).send({ message: 'Course not found' });
      return reply.send(content);
    }
  );

  fastify.post(
    '/courses/:courseId/lessons/:lessonId/complete',
    {
      schema: {
        params: zodToFastifySchema(z.object({ courseId: z.string().uuid(), lessonId: z.string().uuid() })),
      },
    },
    async (request, reply) => {
      const { courseId, lessonId } = request.params as { courseId: string; lessonId: string };
      const enrollment = await trainingService.markLessonComplete(
        courseId,
        lessonId,
        request.partnerUser!.accountId,
        request.partnerUser!.partnerId
      );
      return reply.send({ enrollment });
    }
  );

  fastify.post(
    '/courses/:courseId/quiz',
    {
      schema: {
        params: zodToFastifySchema(z.object({ courseId: z.string().uuid() })),
        body: zodToFastifySchema(submitQuizSchema),
      },
    },
    async (request, reply) => {
      const { courseId } = request.params as { courseId: string };
      const { answers } = request.body as { answers: number[] };
      try {
        const result = await trainingService.submitQuiz(
          courseId,
          request.partnerUser!.accountId,
          request.partnerUser!.partnerId,
          answers
        );
        return reply.send(result);
      } catch (error: any) {
        return reply.code(400).send({ message: error.message });
      }
    }
  );

  fastify.get('/my-progress', async (request, reply) => {
    const progress = await trainingService.getMyProgress(
      request.partnerUser!.partnerId,
      request.partnerUser!.accountId
    );
    return reply.send({ progress });
  });
}
