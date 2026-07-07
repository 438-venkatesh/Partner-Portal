import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireOperationsDbRole } from '../middleware/requireRole';
import { trainingService } from '../services/trainingService';
import {
  createCourseSchema,
  updateCourseSchema,
  createLessonSchema,
  quizQuestionSchema,
  createLearningPathSchema,
  updateLearningPathSchema,
} from '@partner-portal/common';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function trainingRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  // ---- courses ----
  fastify.get('/courses', async (_request, reply) => {
    const courses = await trainingService.listCourses();
    return reply.send({ courses });
  });

  fastify.get(
    '/courses/:courseId',
    { schema: { params: zodToFastifySchema(z.object({ courseId: z.string().uuid() })) } },
    async (request, reply) => {
      const content = await trainingService.getCourseWithContent(
        (request.params as { courseId: string }).courseId
      );
      if (!content) return reply.code(404).send({ message: 'Course not found' });
      return reply.send(content);
    }
  );

  fastify.post(
    '/courses',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { body: zodToFastifySchema(createCourseSchema) },
    },
    async (request, reply) => {
      const course = await trainingService.createCourse(request.body as any);
      return reply.code(201).send({ course });
    }
  );

  fastify.patch(
    '/courses/:courseId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ courseId: z.string().uuid() })),
        body: zodToFastifySchema(updateCourseSchema),
      },
    },
    async (request, reply) => {
      const course = await trainingService.updateCourse(
        (request.params as { courseId: string }).courseId,
        request.body as any
      );
      if (!course) return reply.code(404).send({ message: 'Course not found' });
      return reply.send({ course });
    }
  );

  fastify.delete(
    '/courses/:courseId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { params: zodToFastifySchema(z.object({ courseId: z.string().uuid() })) },
    },
    async (request, reply) => {
      await trainingService.deleteCourse((request.params as { courseId: string }).courseId);
      return reply.code(204).send();
    }
  );

  // ---- lessons ----
  fastify.post(
    '/courses/:courseId/lessons',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ courseId: z.string().uuid() })),
        body: zodToFastifySchema(createLessonSchema),
      },
    },
    async (request, reply) => {
      const lesson = await trainingService.addLesson(
        (request.params as { courseId: string }).courseId,
        request.body as any
      );
      return reply.code(201).send({ lesson });
    }
  );

  fastify.delete(
    '/lessons/:lessonId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { params: zodToFastifySchema(z.object({ lessonId: z.string().uuid() })) },
    },
    async (request, reply) => {
      await trainingService.deleteLesson((request.params as { lessonId: string }).lessonId);
      return reply.code(204).send();
    }
  );

  // ---- quiz ----
  fastify.put(
    '/courses/:courseId/quiz',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ courseId: z.string().uuid() })),
        body: zodToFastifySchema(z.object({ questions: z.array(quizQuestionSchema) })),
      },
    },
    async (request, reply) => {
      const { questions } = request.body as { questions: any[] };
      const saved = await trainingService.setQuizQuestions(
        (request.params as { courseId: string }).courseId,
        questions
      );
      return reply.send({ questions: saved });
    }
  );

  // ---- learning paths ----
  fastify.get('/paths', async (_request, reply) => {
    const paths = await trainingService.listLearningPaths();
    return reply.send({ paths });
  });

  fastify.post(
    '/paths',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { body: zodToFastifySchema(createLearningPathSchema) },
    },
    async (request, reply) => {
      const path = await trainingService.createLearningPath(request.body as any);
      return reply.code(201).send({ path });
    }
  );

  fastify.patch(
    '/paths/:pathId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: {
        params: zodToFastifySchema(z.object({ pathId: z.string().uuid() })),
        body: zodToFastifySchema(updateLearningPathSchema),
      },
    },
    async (request, reply) => {
      const path = await trainingService.updateLearningPath(
        (request.params as { pathId: string }).pathId,
        request.body as any
      );
      if (!path) return reply.code(404).send({ message: 'Learning path not found' });
      return reply.send({ path });
    }
  );

  fastify.delete(
    '/paths/:pathId',
    {
      preHandler: requireOperationsDbRole('admin', 'superadmin'),
      schema: { params: zodToFastifySchema(z.object({ pathId: z.string().uuid() })) },
    },
    async (request, reply) => {
      await trainingService.deleteLearningPath((request.params as { pathId: string }).pathId);
      return reply.code(204).send();
    }
  );
}
