import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db';
import {
  trainingCourses,
  trainingLessons,
  trainingQuizQuestions,
  trainingEnrollments,
  learningPaths,
  partners,
} from '../db/schema';
import { notificationService } from './notificationService';
import { rewardsService } from './rewardsService';
import type {
  CreateCourseInput,
  CreateLessonInput,
  QuizQuestionInput,
  CreateLearningPathInput,
} from '@partner-portal/common';

const TIER_RANK: Record<string, number> = { bronze: 0, silver: 1, gold: 2, platinum: 3 };

function tierMeetsMinimum(partnerTier: string | null, minTier: string | null | undefined): boolean {
  if (!minTier) return true;
  if (!partnerTier) return false;
  return (TIER_RANK[partnerTier.toLowerCase()] ?? -1) >= (TIER_RANK[minTier.toLowerCase()] ?? Infinity);
}

export const trainingService = {
  // ---- admin: courses ----
  async listCourses() {
    return db.select().from(trainingCourses).orderBy(asc(trainingCourses.sortOrder));
  },

  async createCourse(input: CreateCourseInput) {
    const [course] = await db
      .insert(trainingCourses)
      .values({
        title: input.title,
        description: input.description,
        partnerType: input.partnerType,
        minTier: input.minTier,
        estimatedMinutes: input.estimatedMinutes,
        passingScorePercent: input.passingScorePercent ?? 70,
        isActive: input.isActive ?? true,
      })
      .returning();
    return course;
  },

  async updateCourse(courseId: string, patch: Partial<CreateCourseInput>) {
    const [course] = await db
      .update(trainingCourses)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(trainingCourses.courseId, courseId))
      .returning();
    return course ?? null;
  },

  async deleteCourse(courseId: string) {
    await db.delete(trainingLessons).where(eq(trainingLessons.courseId, courseId));
    await db.delete(trainingQuizQuestions).where(eq(trainingQuizQuestions.courseId, courseId));
    await db.delete(trainingCourses).where(eq(trainingCourses.courseId, courseId));
  },

  // ---- admin: lessons & quiz ----
  async addLesson(courseId: string, input: CreateLessonInput) {
    const [lesson] = await db
      .insert(trainingLessons)
      .values({ courseId, title: input.title, content: input.content, videoUrl: input.videoUrl, sortOrder: input.sortOrder ?? 0 })
      .returning();
    return lesson;
  },

  async deleteLesson(lessonId: string) {
    await db.delete(trainingLessons).where(eq(trainingLessons.lessonId, lessonId));
  },

  async setQuizQuestions(courseId: string, questions: QuizQuestionInput[]) {
    await db.delete(trainingQuizQuestions).where(eq(trainingQuizQuestions.courseId, courseId));
    if (questions.length === 0) return [];
    return db
      .insert(trainingQuizQuestions)
      .values(
        questions.map((q, idx) => ({
          courseId,
          questionText: q.questionText,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          sortOrder: q.sortOrder ?? idx,
        }))
      )
      .returning();
  },

  async getCourseWithContent(courseId: string) {
    const [course] = await db.select().from(trainingCourses).where(eq(trainingCourses.courseId, courseId)).limit(1);
    if (!course) return null;
    const lessons = await db
      .select()
      .from(trainingLessons)
      .where(eq(trainingLessons.courseId, courseId))
      .orderBy(asc(trainingLessons.sortOrder));
    const questions = await db
      .select()
      .from(trainingQuizQuestions)
      .where(eq(trainingQuizQuestions.courseId, courseId))
      .orderBy(asc(trainingQuizQuestions.sortOrder));
    return { course, lessons, questions };
  },

  /** Same as above but strips the correct answer — this is what a partner's browser actually receives. */
  async getCourseForPartner(courseId: string) {
    const full = await this.getCourseWithContent(courseId);
    if (!full) return null;
    return {
      course: full.course,
      lessons: full.lessons,
      questions: full.questions.map((q) => ({
        questionId: q.questionId,
        questionText: q.questionText,
        options: q.options,
        sortOrder: q.sortOrder,
      })),
    };
  },

  // ---- admin: learning paths ----
  async listLearningPaths() {
    return db.select().from(learningPaths);
  },

  async createLearningPath(input: CreateLearningPathInput) {
    const [path] = await db
      .insert(learningPaths)
      .values({
        name: input.name,
        description: input.description,
        partnerType: input.partnerType,
        minTier: input.minTier,
        courseIds: input.courseIds,
        isActive: input.isActive ?? true,
      })
      .returning();
    return path;
  },

  async updateLearningPath(pathId: string, patch: Partial<CreateLearningPathInput>) {
    const [path] = await db
      .update(learningPaths)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(learningPaths.pathId, pathId))
      .returning();
    return path ?? null;
  },

  async deleteLearningPath(pathId: string) {
    await db.delete(learningPaths).where(eq(learningPaths.pathId, pathId));
  },

  // ---- partner-facing ----
  async listAvailableForPartner(partnerId: string) {
    const [partner] = await db
      .select({ partnerType: partners.partnerType, tier: partners.tier })
      .from(partners)
      .where(eq(partners.partnerId, partnerId))
      .limit(1);

    const courses = (await this.listCourses()).filter(
      (c) =>
        c.isActive &&
        (!c.partnerType || c.partnerType === partner?.partnerType) &&
        tierMeetsMinimum(partner?.tier ?? null, c.minTier)
    );
    const paths = (await this.listLearningPaths()).filter(
      (p) =>
        p.isActive &&
        (!p.partnerType || p.partnerType === partner?.partnerType) &&
        tierMeetsMinimum(partner?.tier ?? null, p.minTier)
    );
    return { courses, paths };
  },

  async getOrCreateEnrollment(courseId: string, accountId: string, partnerId: string) {
    const [existing] = await db
      .select()
      .from(trainingEnrollments)
      .where(and(eq(trainingEnrollments.courseId, courseId), eq(trainingEnrollments.accountId, accountId)))
      .limit(1);
    if (existing) return existing;

    const [created] = await db
      .insert(trainingEnrollments)
      .values({ courseId, accountId, partnerId, status: 'in_progress' })
      .returning();
    return created;
  },

  async markLessonComplete(courseId: string, lessonId: string, accountId: string, partnerId: string) {
    const enrollment = await this.getOrCreateEnrollment(courseId, accountId, partnerId);
    const completed = new Set((enrollment.completedLessonIds as string[]) ?? []);
    completed.add(lessonId);

    const [updated] = await db
      .update(trainingEnrollments)
      .set({ completedLessonIds: [...completed], status: 'in_progress' })
      .where(eq(trainingEnrollments.enrollmentId, enrollment.enrollmentId))
      .returning();
    return updated;
  },

  async submitQuiz(courseId: string, accountId: string, partnerId: string, answers: number[]) {
    const [course] = await db.select().from(trainingCourses).where(eq(trainingCourses.courseId, courseId)).limit(1);
    if (!course) throw new Error('Course not found');

    const questions = await db
      .select()
      .from(trainingQuizQuestions)
      .where(eq(trainingQuizQuestions.courseId, courseId))
      .orderBy(asc(trainingQuizQuestions.sortOrder));

    const correct = questions.filter((q, idx) => answers[idx] === q.correctOptionIndex).length;
    const scorePercent = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 100;
    const passed = scorePercent >= (course.passingScorePercent ?? 70);

    const enrollment = await this.getOrCreateEnrollment(courseId, accountId, partnerId);
    const [updated] = await db
      .update(trainingEnrollments)
      .set({
        quizScorePercent: scorePercent,
        quizAttempts: (enrollment.quizAttempts ?? 0) + 1,
        status: passed ? 'completed' : 'failed',
        certificateIssuedAt: passed ? new Date() : enrollment.certificateIssuedAt,
        completedAt: passed ? new Date() : null,
      })
      .where(eq(trainingEnrollments.enrollmentId, enrollment.enrollmentId))
      .returning();

    if (passed && !enrollment.certificateIssuedAt) {
      await rewardsService.addPoints(partnerId, 50, `Certified: ${course.title}`);
      await notificationService.createForUser({
        userId: accountId,
        partnerId,
        type: 'certificate_earned',
        title: `Certificate earned: ${course.title}`,
        body: `You scored ${scorePercent}% — certificate issued.`,
      });
    }

    return { enrollment: updated, scorePercent, passed };
  },

  async getMyProgress(partnerId: string, accountId: string) {
    const enrollments = await db
      .select()
      .from(trainingEnrollments)
      .where(and(eq(trainingEnrollments.partnerId, partnerId), eq(trainingEnrollments.accountId, accountId)));
    const courses = await this.listCourses();
    const courseById = new Map(courses.map((c) => [c.courseId, c]));
    return enrollments.map((e) => ({ ...e, course: courseById.get(e.courseId) }));
  },
};
