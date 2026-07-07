import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { partnerUserAccounts, onboardingReminderLog, partners } from '../db/schema';
import { onboardingAnalyticsService } from './onboardingAnalyticsService';
import { onboardingStageConfigService } from './onboardingStageConfigService';
import { emailService } from './emailService';
import { notificationService } from './notificationService';

async function getPartnerType(partnerId: string): Promise<string> {
  const [partner] = await db
    .select({ partnerType: partners.partnerType })
    .from(partners)
    .where(eq(partners.partnerId, partnerId))
    .limit(1);
  return partner?.partnerType ?? 'agency';
}

/** Reminder cadence: nudge once at each of these idle thresholds, never more than once per step. */
const REMINDER_STEPS: Array<{ key: string; afterDays: number }> = [
  { key: 'day3', afterDays: 3 },
  { key: 'day7', afterDays: 7 },
  { key: 'day14', afterDays: 14 },
];

function stepForIdleDays(idleDays: number): { key: string; afterDays: number } | null {
  const eligible = REMINDER_STEPS.filter((s) => idleDays >= s.afterDays);
  if (eligible.length === 0) return null;
  return eligible[eligible.length - 1];
}

export const onboardingReminderService = {
  /** Sends (at most) one nudge per stalled partner per cadence step. Safe to run repeatedly (e.g. daily cron). */
  async runOnce() {
    const stalled = await onboardingAnalyticsService.listStalledPartners(REMINDER_STEPS[0].afterDays);
    const results: Array<{ partnerId: string; sent: boolean; reason?: string }> = [];

    for (const partner of stalled) {
      const step = stepForIdleDays(partner.idleDays);
      if (!step) {
        results.push({ partnerId: partner.partnerId, sent: false, reason: 'no matching cadence step' });
        continue;
      }

      const [already] = await db
        .select()
        .from(onboardingReminderLog)
        .where(
          and(
            eq(onboardingReminderLog.partnerId, partner.partnerId),
            eq(onboardingReminderLog.stage, partner.currentStage),
            eq(onboardingReminderLog.reminderStep, step.key)
          )
        )
        .limit(1);

      if (already) {
        results.push({ partnerId: partner.partnerId, sent: false, reason: 'already sent for this step' });
        continue;
      }

      const admins = await db
        .select({ accountId: partnerUserAccounts.accountId, email: partnerUserAccounts.email })
        .from(partnerUserAccounts)
        .where(
          and(
            eq(partnerUserAccounts.partnerId, partner.partnerId),
            eq(partnerUserAccounts.role, 'admin'),
            eq(partnerUserAccounts.status, 'active')
          )
        );

      const partnerType = await getPartnerType(partner.partnerId);
      const stages = await onboardingStageConfigService.listForAdmin(partnerType);
      const stageLabel = stages.find((s) => s.stageCode === partner.currentStage)?.label || partner.currentStage;

      for (const admin of admins) {
        try {
          await emailService.sendOnboardingReminder(admin.email, {
            partnerName: partner.partnerName || 'your organization',
            stageLabel,
            idleDays: partner.idleDays,
          });
        } catch {
          /* non-fatal — still record the notification + log entry below */
        }
        await notificationService.createForUser({
          userId: admin.accountId,
          partnerId: partner.partnerId,
          type: 'onboarding_reminder',
          title: `Continue onboarding: ${stageLabel}`,
          body: `Your application has been on "${stageLabel}" for ${partner.idleDays} days.`,
        });
      }

      await db.insert(onboardingReminderLog).values({
        partnerId: partner.partnerId,
        stage: partner.currentStage,
        reminderStep: step.key,
      });

      results.push({ partnerId: partner.partnerId, sent: true });
    }

    return {
      checked: stalled.length,
      sent: results.filter((r) => r.sent).length,
      results,
    };
  },
};
