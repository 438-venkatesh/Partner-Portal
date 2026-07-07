import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { partners, partnerAutoApprovalRules } from '../db/schema';
import { getPartnerActivationBlockers } from './partnerApprovalPreconditions';
import { partnerService } from './partnerService';

const TIER_RANK: Record<string, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
};

function tierMeetsMinimum(partnerTier: string | null, minTier: string | null | undefined): boolean {
  if (!minTier) return true;
  if (!partnerTier) return false;
  const have = TIER_RANK[partnerTier.toLowerCase()] ?? -1;
  const need = TIER_RANK[minTier.toLowerCase()] ?? Infinity;
  return have >= need;
}

/** Reserved nil UUID used to attribute system-triggered activity log entries (no real admin user involved). */
const SYSTEM_ACTOR = { userId: '00000000-0000-0000-0000-000000000000' };

export const autoApprovalService = {
  async listRules() {
    return db.select().from(partnerAutoApprovalRules);
  },

  async createRule(input: {
    name: string;
    partnerType?: string;
    minTier?: string;
    requireDocumentsVerified?: boolean;
    isActive?: boolean;
  }, createdBy?: string) {
    const [rule] = await db
      .insert(partnerAutoApprovalRules)
      .values({
        name: input.name,
        partnerType: input.partnerType ?? null,
        minTier: input.minTier ?? null,
        requireDocumentsVerified: input.requireDocumentsVerified ?? true,
        isActive: input.isActive ?? true,
        createdBy: createdBy ?? null,
      })
      .returning();
    return rule;
  },

  async updateRule(ruleId: string, patch: Partial<{
    name: string;
    partnerType: string | null;
    minTier: string | null;
    requireDocumentsVerified: boolean;
    isActive: boolean;
  }>) {
    const [rule] = await db
      .update(partnerAutoApprovalRules)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(partnerAutoApprovalRules.ruleId, ruleId))
      .returning();
    return rule ?? null;
  },

  async deleteRule(ruleId: string) {
    await db.delete(partnerAutoApprovalRules).where(eq(partnerAutoApprovalRules.ruleId, ruleId));
  },

  /** Finds an active rule (if any) whose criteria this partner satisfies right now. */
  async findMatchingRule(partnerId: string) {
    const [partner] = await db
      .select()
      .from(partners)
      .where(eq(partners.partnerId, partnerId))
      .limit(1);
    if (!partner || partner.status !== 'pending') return null;

    const rules = await db
      .select()
      .from(partnerAutoApprovalRules)
      .where(eq(partnerAutoApprovalRules.isActive, true));

    const candidateRules = rules.filter(
      (r) => !r.partnerType || r.partnerType === partner.partnerType
    );
    if (candidateRules.length === 0) return null;

    const blockers = await getPartnerActivationBlockers(partnerId);
    if (blockers.length > 0) return null;

    for (const rule of candidateRules) {
      if (!tierMeetsMinimum(partner.tier, rule.minTier)) continue;
      // Document verification is already folded into getPartnerActivationBlockers via the
      // onboarding "documentation" stage, so requireDocumentsVerified is satisfied whenever
      // there are no blockers left — the flag exists for rules that want to be explicit about it.
      return rule;
    }
    return null;
  },

  /** Call after any onboarding stage transition — auto-activates the partner if a rule matches. */
  async maybeAutoApprove(partnerId: string) {
    try {
      const rule = await this.findMatchingRule(partnerId);
      if (!rule) return null;
      return partnerService.approvePartner(
        partnerId,
        { approved: true, notes: `Auto-approved by rule "${rule.name}"` },
        SYSTEM_ACTOR
      );
    } catch {
      // Auto-approval is a convenience layer on top of manual approval — never let it
      // block or fail the onboarding action that triggered it.
      return null;
    }
  },
};
