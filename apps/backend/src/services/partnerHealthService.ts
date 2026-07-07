import { and, count, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { partners, partnerUserAccounts, partnerOnboardingWorkflows, partnerDocuments } from '../db/schema';

type HealthFactor = { label: string; weight: number; earned: number; detail: string };

const STALLED_AFTER_DAYS = 3;

function daysSince(date: Date | null | undefined): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function band(score: number): 'healthy' | 'at_risk' | 'critical' {
  if (score >= 70) return 'healthy';
  if (score >= 40) return 'at_risk';
  return 'critical';
}

export const partnerHealthService = {
  /** Composite 0-100 score built only from signals this platform actually has today. */
  async computeHealthScore(partnerId: string) {
    const [partner] = await db
      .select({ status: partners.status, approvalDate: partners.approvalDate })
      .from(partners)
      .where(eq(partners.partnerId, partnerId))
      .limit(1);
    if (!partner) throw new Error('Partner not found');

    const factors: HealthFactor[] = [];

    // Active status (15 pts)
    factors.push({
      label: 'Account in good standing',
      weight: 15,
      earned: partner.status === 'active' ? 15 : 0,
      detail: `Status: ${partner.status}`,
    });

    // Recent user activity (30 pts) — any partner user active in the last 30 days
    const [{ lastActive }] = await db
      .select({ lastActive: sql<Date | null>`max(${partnerUserAccounts.lastLoginAt})` })
      .from(partnerUserAccounts)
      .where(eq(partnerUserAccounts.partnerId, partnerId));
    const idleDays = daysSince(lastActive as Date | null);
    const activityScore = idleDays === null ? 0 : idleDays <= 30 ? 30 : idleDays <= 60 ? 15 : 0;
    factors.push({
      label: 'Recent login activity',
      weight: 30,
      earned: activityScore,
      detail: idleDays === null ? 'No login recorded' : `Last login ${idleDays} day(s) ago`,
    });

    // Onboarding health (20 pts) — completed, or in progress and not stalled
    const [workflow] = await db
      .select({ stageStatus: partnerOnboardingWorkflows.stageStatus, updatedAt: partnerOnboardingWorkflows.updatedAt })
      .from(partnerOnboardingWorkflows)
      .where(eq(partnerOnboardingWorkflows.partnerId, partnerId))
      .limit(1);
    let onboardingScore = 20;
    let onboardingDetail = 'No onboarding record';
    if (workflow) {
      if (workflow.stageStatus === 'completed') {
        onboardingDetail = 'Onboarding complete';
      } else {
        const stalledDays = daysSince(workflow.updatedAt);
        const stalled = stalledDays !== null && stalledDays >= STALLED_AFTER_DAYS;
        onboardingScore = stalled ? 0 : 12;
        onboardingDetail = stalled
          ? `Stalled ${stalledDays} day(s) on current stage`
          : 'Onboarding in progress, moving normally';
      }
    }
    factors.push({ label: 'Onboarding progress', weight: 20, earned: onboardingScore, detail: onboardingDetail });

    // Document compliance (20 pts)
    const [{ total }] = await db
      .select({ total: count() })
      .from(partnerDocuments)
      .where(eq(partnerDocuments.partnerId, partnerId));
    const [{ approved }] = await db
      .select({ approved: count() })
      .from(partnerDocuments)
      .where(and(eq(partnerDocuments.partnerId, partnerId), eq(partnerDocuments.status, 'approved')));
    const docTotal = Number(total);
    const docApproved = Number(approved);
    const docScore = docTotal === 0 ? 10 : Math.round((docApproved / docTotal) * 20);
    factors.push({
      label: 'Document compliance',
      weight: 20,
      earned: docScore,
      detail: docTotal === 0 ? 'No documents on file' : `${docApproved}/${docTotal} approved`,
    });

    // Team presence (15 pts) — at least one active user account
    const [{ activeUsers }] = await db
      .select({ activeUsers: count() })
      .from(partnerUserAccounts)
      .where(and(eq(partnerUserAccounts.partnerId, partnerId), eq(partnerUserAccounts.status, 'active')));
    const teamScore = Number(activeUsers) > 0 ? 15 : 0;
    factors.push({
      label: 'Active team members',
      weight: 15,
      earned: teamScore,
      detail: `${activeUsers} active user(s)`,
    });

    const score = factors.reduce((sum, f) => sum + f.earned, 0);
    return { partnerId, score, band: band(score), factors };
  },

  /** Admin-facing list, worst-first, so the riskiest partners surface at the top. */
  async listHealthScores(limit = 100) {
    const rows = await db
      .select({ partnerId: partners.partnerId, partnerName: partners.partnerName, status: partners.status })
      .from(partners)
      .where(eq(partners.status, 'active'))
      .orderBy(desc(partners.updatedAt))
      .limit(limit);

    const scored = await Promise.all(
      rows.map(async (p) => {
        const health = await this.computeHealthScore(p.partnerId);
        return { partnerId: p.partnerId, partnerName: p.partnerName, score: health.score, band: health.band };
      })
    );

    return scored.sort((a, b) => a.score - b.score);
  },
};
