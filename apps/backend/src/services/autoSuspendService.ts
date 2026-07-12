import { eq, max } from 'drizzle-orm';
import { db } from '../db';
import { partners, partnerAutoSuspendRules, partnerUserAccounts } from '../db/schema';
import { partnerService } from './partnerService';

/** Reserved nil UUID used to attribute system-triggered activity log entries (no real admin user involved). */
const SYSTEM_ACTOR = { userId: '00000000-0000-0000-0000-000000000000' };

export const autoSuspendService = {
  async listRules() {
    return db.select().from(partnerAutoSuspendRules);
  },

  async createRule(input: { name: string; inactivityDays?: number; autoSuspend?: boolean; isActive?: boolean }) {
    const [rule] = await db
      .insert(partnerAutoSuspendRules)
      .values({
        name: input.name,
        inactivityDays: input.inactivityDays ?? 90,
        autoSuspend: input.autoSuspend ?? false,
        isActive: input.isActive ?? true,
      })
      .returning();
    return rule;
  },

  async updateRule(
    ruleId: string,
    patch: Partial<{ name: string; inactivityDays: number; autoSuspend: boolean; isActive: boolean }>
  ) {
    const [rule] = await db
      .update(partnerAutoSuspendRules)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(partnerAutoSuspendRules.ruleId, ruleId))
      .returning();
    return rule ?? null;
  },

  async deleteRule(ruleId: string) {
    await db.delete(partnerAutoSuspendRules).where(eq(partnerAutoSuspendRules.ruleId, ruleId));
  },

  /** Runs every active rule against currently-active partners; suspends those past the threshold if autoSuspend is on. */
  async runInactivityCheck() {
    const rules = await db
      .select()
      .from(partnerAutoSuspendRules)
      .where(eq(partnerAutoSuspendRules.isActive, true));
    if (rules.length === 0) return { flagged: [], suspended: [] };

    const activePartners = await db
      .select({ partnerId: partners.partnerId, partnerName: partners.partnerName, registrationDate: partners.registrationDate })
      .from(partners)
      .where(eq(partners.status, 'active'));

    const lastLogins = await db
      .select({ partnerId: partnerUserAccounts.partnerId, lastLoginAt: max(partnerUserAccounts.lastLoginAt) })
      .from(partnerUserAccounts)
      .groupBy(partnerUserAccounts.partnerId);
    const lastLoginByPartner = new Map(lastLogins.map((r) => [r.partnerId, r.lastLoginAt]));

    const now = new Date();
    const flagged: { partnerId: string; partnerName: string; daysInactive: number }[] = [];
    const suspended: string[] = [];

    for (const partner of activePartners) {
      const lastActivity = lastLoginByPartner.get(partner.partnerId) ?? partner.registrationDate;
      if (!lastActivity) continue;
      const daysInactive = Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));

      const matchingRule = rules.find((r) => daysInactive >= r.inactivityDays);
      if (!matchingRule) continue;

      flagged.push({ partnerId: partner.partnerId, partnerName: partner.partnerName, daysInactive });

      if (matchingRule.autoSuspend) {
        await partnerService.suspendPartner(partner.partnerId, SYSTEM_ACTOR);
        suspended.push(partner.partnerId);
      }
    }

    return { flagged, suspended };
  },
};
