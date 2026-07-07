import { pgTable, uuid, varchar, text, integer, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core';

/** A course a partner's team members work through — the core LMS object. */
export const trainingCourses = pgTable('training_courses', {
  courseId: uuid('course_id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  partnerType: varchar('partner_type', { length: 50 }),
  minTier: varchar('min_tier', { length: 50 }),
  estimatedMinutes: integer('estimated_minutes'),
  passingScorePercent: integer('passing_score_percent').default(70),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const trainingLessons = pgTable('training_lessons', {
  lessonId: uuid('lesson_id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content'),
  videoUrl: varchar('video_url', { length: 500 }),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

/** One final quiz per course; passingScorePercent on the course decides pass/fail. */
export const trainingQuizQuestions = pgTable('training_quiz_questions', {
  questionId: uuid('question_id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull(),
  questionText: text('question_text').notNull(),
  options: jsonb('options').notNull(),
  correctOptionIndex: integer('correct_option_index').notNull(),
  sortOrder: integer('sort_order').default(0),
});

/** Per-team-member progress through a course, including their certificate once they pass. */
export const trainingEnrollments = pgTable('training_enrollments', {
  enrollmentId: uuid('enrollment_id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull(),
  accountId: uuid('account_id').notNull(),
  partnerId: uuid('partner_id').notNull(),
  /** not_started | in_progress | completed | failed */
  status: varchar('status', { length: 20 }).notNull().default('not_started'),
  completedLessonIds: jsonb('completed_lesson_ids').default([]),
  quizScorePercent: integer('quiz_score_percent'),
  quizAttempts: integer('quiz_attempts').default(0),
  certificateIssuedAt: timestamp('certificate_issued_at'),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

/** A curated, ordered sequence of courses — Allbound-style "Learning Tracks" by type/tier. */
export const learningPaths = pgTable('learning_paths', {
  pathId: uuid('path_id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  partnerType: varchar('partner_type', { length: 50 }),
  minTier: varchar('min_tier', { length: 50 }),
  courseIds: jsonb('course_ids').notNull().default([]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
