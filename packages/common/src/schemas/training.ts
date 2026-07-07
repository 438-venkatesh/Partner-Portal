import { z } from 'zod';

export const createCourseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  partnerType: z.string().max(50).optional(),
  minTier: z.string().max(50).optional(),
  estimatedMinutes: z.number().int().min(0).optional(),
  passingScorePercent: z.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

export const updateCourseSchema = createCourseSchema.partial();

export const createLessonSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(20000).optional(),
  videoUrl: z.string().url().optional(),
  sortOrder: z.number().int().optional(),
});

export const quizQuestionSchema = z.object({
  questionText: z.string().min(1).max(1000),
  options: z.array(z.string().min(1).max(300)).min(2).max(8),
  correctOptionIndex: z.number().int().min(0),
  sortOrder: z.number().int().optional(),
});

export const submitQuizSchema = z.object({
  answers: z.array(z.number().int().min(0)),
});

export const createLearningPathSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  partnerType: z.string().max(50).optional(),
  minTier: z.string().max(50).optional(),
  courseIds: z.array(z.string().uuid()),
  isActive: z.boolean().optional(),
});

export const updateLearningPathSchema = createLearningPathSchema.partial();

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>;
export type CreateLearningPathInput = z.infer<typeof createLearningPathSchema>;
