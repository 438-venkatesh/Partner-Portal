import { and, eq, isNotNull } from 'drizzle-orm';
import { db } from '../db';
import { partnerAgreements, agreementReminderLog, partnerUserAccounts, partners } from '../db/schema';
import { agreementService } from './agreementService';
import { emailService } from './emailService';
import { notificationService } from './notificationService';
import { logPartnerActivity } from '../utils/activityLogger';

/** Reminder cadence: nudge once at each of these "days until expiry" thresholds, most urgent first. */
const REMINDER_STEPS: Array<{ key: string; beforeDays: number }> = [
  { key: 'day7', beforeDays: 7 },
  { key: 'day14', beforeDays: 14 },
  { key: 'day30', beforeDays: 30 },
];

function daysUntil(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00Z`).getTime();
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((target - todayUtc) / (1000 * 60 * 60 * 24));
}

function stepForDaysUntil(daysUntilExpiry: number): { key: string; beforeDays: number } | null {
  const eligible = REMINDER_STEPS.filter((s) => daysUntilExpiry <= s.beforeDays);
  return eligible.length ? eligible[0] : null;
}

export const agreementReminderService = {
  /** Sends (at most) one nudge per expiring agreement per cadence step. Safe to run repeatedly (e.g. daily cron). */
  async sendExpiryReminders() {
    const expiring = await db
      .select({
        agreementId: partnerAgreements.agreementId,
        partnerId: partnerAgreements.partnerId,
        title: partnerAgreements.title,
        agreementNumber: partnerAgreements.agreementNumber,
        endDate: partnerAgreements.endDate,
        partnerName: partners.partnerName,
      })
      .from(partnerAgreements)
      .leftJoin(partners, eq(partnerAgreements.partnerId, partners.partnerId))
      .where(and(eq(partnerAgreements.status, 'signed'), isNotNull(partnerAgreements.endDate)));

    const results: Array<{ agreementId: string; sent: boolean; reason?: string }> = [];

    for (const agreement of expiring) {
      const daysLeft = daysUntil(agreement.endDate!);
      if (daysLeft < 0) continue; // already past expiry — handled by expireOverdueAgreements()

      const step = stepForDaysUntil(daysLeft);
      if (!step) {
        results.push({ agreementId: agreement.agreementId, sent: false, reason: 'no matching cadence step' });
        continue;
      }

      const [already] = await db
        .select()
        .from(agreementReminderLog)
        .where(
          and(
            eq(agreementReminderLog.agreementId, agreement.agreementId),
            eq(agreementReminderLog.reminderStep, step.key)
          )
        )
        .limit(1);

      if (already) {
        results.push({ agreementId: agreement.agreementId, sent: false, reason: 'already sent for this step' });
        continue;
      }

      const admins = await db
        .select({ accountId: partnerUserAccounts.accountId, email: partnerUserAccounts.email })
        .from(partnerUserAccounts)
        .where(
          and(
            eq(partnerUserAccounts.partnerId, agreement.partnerId),
            eq(partnerUserAccounts.role, 'admin'),
            eq(partnerUserAccounts.status, 'active')
          )
        );

      for (const admin of admins) {
        try {
          await emailService.sendAgreementExpiring(admin.email, {
            partnerName: agreement.partnerName || 'your organization',
            agreementTitle: agreement.title,
            agreementNumber: agreement.agreementNumber,
            daysUntilExpiry: daysLeft,
          });
        } catch {
          /* non-fatal — still record the notification + log entry below */
        }
        await notificationService.createForUser({
          userId: admin.accountId,
          partnerId: agreement.partnerId,
          type: 'agreement_expiring',
          title: `Agreement expiring in ${daysLeft} day${daysLeft === 1 ? '' : 's'}: ${agreement.title}`,
          body: `${agreement.agreementNumber} expires soon — review or renew.`,
        });
      }

      await db.insert(agreementReminderLog).values({ agreementId: agreement.agreementId, reminderStep: step.key });
      results.push({ agreementId: agreement.agreementId, sent: true });
    }

    return {
      checked: expiring.length,
      sent: results.filter((r) => r.sent).length,
      results,
    };
  },

  /** Flips any signed agreement past its end date to 'expired' — the state machine already supports this. */
  async expireOverdueAgreements() {
    const candidates = await db
      .select({
        agreementId: partnerAgreements.agreementId,
        partnerId: partnerAgreements.partnerId,
        title: partnerAgreements.title,
        endDate: partnerAgreements.endDate,
      })
      .from(partnerAgreements)
      .where(and(eq(partnerAgreements.status, 'signed'), isNotNull(partnerAgreements.endDate)));

    let expiredCount = 0;
    for (const agreement of candidates) {
      if (daysUntil(agreement.endDate!) >= 0) continue;

      await agreementService.updateStatus(agreement.agreementId, agreement.partnerId, 'expired');
      await logPartnerActivity({
        partnerId: agreement.partnerId,
        activityType: 'status_changed',
        activityDescription: `Agreement "${agreement.title}" automatically expired (end date passed).`,
        performedBy: '00000000-0000-0000-0000-000000000000',
        performedByType: 'platform_admin',
        metadata: { agreementId: agreement.agreementId, newStatus: 'expired' },
      });
      expiredCount++;
    }

    return { checked: candidates.length, expired: expiredCount };
  },
};
