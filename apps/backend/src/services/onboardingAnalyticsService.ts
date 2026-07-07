import { eq } from 'drizzle-orm';
import { db } from '../db';
import { partnerOnboardingWorkflows, partners } from '../db/schema';

/** A partner is "stalled" once their onboarding workflow hasn't moved in this many days. */
const STALLED_AFTER_DAYS = 3;

function daysSince(date: Date | null | undefined): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export const onboardingAnalyticsService = {
  /** Admin-facing view of where every in-flight partner sits, and who's gone quiet. */
  async getAnalytics() {
    const rows = await db
      .select({
        partnerId: partnerOnboardingWorkflows.partnerId,
        currentStage: partnerOnboardingWorkflows.currentStage,
        stageStatus: partnerOnboardingWorkflows.stageStatus,
        startedAt: partnerOnboardingWorkflows.startedAt,
        updatedAt: partnerOnboardingWorkflows.updatedAt,
        completedAt: partnerOnboardingWorkflows.completedAt,
        partnerName: partners.partnerName,
        partnerType: partners.partnerType,
        partnerStatus: partners.status,
      })
      .from(partnerOnboardingWorkflows)
      .leftJoin(partners, eq(partnerOnboardingWorkflows.partnerId, partners.partnerId));

    const byStage: Record<string, number> = {};
    const byType: Record<string, { total: number; completed: number }> = {};
    const stalled: Array<{
      partnerId: string;
      partnerName: string | null;
      partnerType: string | null;
      currentStage: string;
      daysSinceLastActivity: number;
    }> = [];

    let totalInProgress = 0;
    let totalCompleted = 0;
    let totalDaysToComplete = 0;
    let completedWithDuration = 0;

    for (const row of rows) {
      if (row.stageStatus === 'completed') {
        totalCompleted++;
        if (row.startedAt && row.completedAt) {
          totalDaysToComplete += Math.max(
            0,
            Math.floor((row.completedAt.getTime() - row.startedAt.getTime()) / (1000 * 60 * 60 * 24))
          );
          completedWithDuration++;
        }
      } else {
        totalInProgress++;
        const stage = row.currentStage ?? 'unknown';
        byStage[stage] = (byStage[stage] ?? 0) + 1;

        const idleDays = daysSince(row.updatedAt);
        if (idleDays !== null && idleDays >= STALLED_AFTER_DAYS) {
          stalled.push({
            partnerId: row.partnerId,
            partnerName: row.partnerName,
            partnerType: row.partnerType,
            currentStage: stage,
            daysSinceLastActivity: idleDays,
          });
        }
      }

      const type = row.partnerType ?? 'unknown';
      if (!byType[type]) byType[type] = { total: 0, completed: 0 };
      byType[type].total++;
      if (row.stageStatus === 'completed') byType[type].completed++;
    }

    stalled.sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity);

    return {
      totalPartnersInOnboarding: rows.length,
      totalInProgress,
      totalCompleted,
      averageDaysToComplete:
        completedWithDuration > 0 ? Math.round(totalDaysToComplete / completedWithDuration) : null,
      stalledCount: stalled.length,
      stalledAfterDays: STALLED_AFTER_DAYS,
      byStage,
      byPartnerType: byType,
      stalledPartners: stalled.slice(0, 50),
    };
  },

  /** Raw list used by the reminder job — every partner idle >= minDays in their current stage. */
  async listStalledPartners(minDays: number) {
    const rows = await db
      .select({
        partnerId: partnerOnboardingWorkflows.partnerId,
        currentStage: partnerOnboardingWorkflows.currentStage,
        stageStatus: partnerOnboardingWorkflows.stageStatus,
        updatedAt: partnerOnboardingWorkflows.updatedAt,
        partnerName: partners.partnerName,
      })
      .from(partnerOnboardingWorkflows)
      .leftJoin(partners, eq(partnerOnboardingWorkflows.partnerId, partners.partnerId));

    return rows
      .filter((r) => r.stageStatus !== 'completed')
      .map((r) => ({
        ...r,
        currentStage: r.currentStage ?? 'unknown',
        idleDays: daysSince(r.updatedAt) ?? 0,
      }))
      .filter((r) => r.idleDays >= minDays);
  },
};
