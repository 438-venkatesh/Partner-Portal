import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db';
import { leads, leadRoutingRules, partners } from '../db/schema';
import { notificationService } from './notificationService';
import type { CreateLeadInput, CreateLeadRoutingRuleInput } from '@partner-portal/common';

const TIER_RANK: Record<string, number> = { bronze: 0, silver: 1, gold: 2, platinum: 3 };

function tierMeetsMinimum(partnerTier: string | null, minTier: string | null | undefined): boolean {
  if (!minTier) return true;
  if (!partnerTier) return false;
  return (TIER_RANK[partnerTier.toLowerCase()] ?? -1) >= (TIER_RANK[minTier.toLowerCase()] ?? Infinity);
}

export const leadService = {
  async listRoutingRules() {
    return db.select().from(leadRoutingRules);
  },

  async createRoutingRule(input: CreateLeadRoutingRuleInput) {
    const [rule] = await db
      .insert(leadRoutingRules)
      .values({
        name: input.name,
        partnerType: input.partnerType,
        minTier: input.minTier,
        tags: input.tags ?? [],
        isActive: input.isActive ?? true,
      })
      .returning();
    return rule;
  },

  async updateRoutingRule(ruleId: string, patch: Partial<CreateLeadRoutingRuleInput>) {
    const [rule] = await db
      .update(leadRoutingRules)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(leadRoutingRules.ruleId, ruleId))
      .returning();
    return rule ?? null;
  },

  async deleteRoutingRule(ruleId: string) {
    await db.delete(leadRoutingRules).where(eq(leadRoutingRules.ruleId, ruleId));
  },

  async eligiblePartners(rule: typeof leadRoutingRules.$inferSelect) {
    const rows = await db
      .select({ partnerId: partners.partnerId, partnerType: partners.partnerType, tier: partners.tier, tags: partners.tags })
      .from(partners)
      .where(
        rule.partnerType
          ? and(eq(partners.status, 'active'), eq(partners.partnerType, rule.partnerType as any))
          : eq(partners.status, 'active')
      );

    const requiredTags = (rule.tags as string[] | null) ?? [];
    return rows
      .filter((p) => tierMeetsMinimum(p.tier, rule.minTier))
      .filter((p) => {
        if (requiredTags.length === 0) return true;
        const partnerTags = (p.tags as string[] | null) ?? [];
        return requiredTags.some((t) => partnerTags.includes(t));
      })
      .map((p) => p.partnerId)
      .sort();
  },

  /** Simple round-robin: pick the eligible partner right after whoever the rule assigned last time. */
  async pickNextPartner(rule: typeof leadRoutingRules.$inferSelect): Promise<string | null> {
    const eligible = await this.eligiblePartners(rule);
    if (eligible.length === 0) return null;
    if (!rule.lastAssignedPartnerId) return eligible[0];
    const idx = eligible.indexOf(rule.lastAssignedPartnerId);
    return eligible[(idx + 1) % eligible.length];
  },

  async routeLead(leadId: string) {
    const [lead] = await db.select().from(leads).where(eq(leads.leadId, leadId)).limit(1);
    if (!lead || lead.status !== 'new') return null;

    const rules = (await this.listRoutingRules()).filter((r) => r.isActive);
    for (const rule of rules) {
      const partnerId = await this.pickNextPartner(rule);
      if (!partnerId) continue;

      await db
        .update(leads)
        .set({ assignedPartnerId: partnerId, status: 'assigned', routingRuleId: rule.ruleId, assignedAt: new Date() })
        .where(eq(leads.leadId, leadId));
      await db
        .update(leadRoutingRules)
        .set({ lastAssignedPartnerId: partnerId, updatedAt: new Date() })
        .where(eq(leadRoutingRules.ruleId, rule.ruleId));

      await notificationService.createForAllPartnerUsers(partnerId, {
        type: 'lead_assigned',
        title: `New lead: ${lead.customerName}`,
        body: 'A new lead has been routed to you — accept it to start working the opportunity.',
      });

      return { ...lead, assignedPartnerId: partnerId, status: 'assigned' };
    }
    return null;
  },

  async createLead(input: CreateLeadInput) {
    const [lead] = await db
      .insert(leads)
      .values({
        customerName: input.customerName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        tenantId: input.tenantId,
        notes: input.notes,
      })
      .returning();

    const routed = await this.routeLead(lead.leadId);
    return routed ?? lead;
  },

  async listForPartner(partnerId: string) {
    return db.select().from(leads).where(eq(leads.assignedPartnerId, partnerId)).orderBy(asc(leads.createdAt));
  },

  async listAll() {
    return db
      .select({
        leadId: leads.leadId,
        customerName: leads.customerName,
        contactEmail: leads.contactEmail,
        assignedPartnerId: leads.assignedPartnerId,
        partnerName: partners.partnerName,
        status: leads.status,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .leftJoin(partners, eq(leads.assignedPartnerId, partners.partnerId))
      .orderBy(asc(leads.createdAt));
  },

  /** Partner accepts or rejects an assigned lead; a rejection re-routes it to the next eligible partner. */
  async respond(leadId: string, partnerId: string, accepted: boolean) {
    const [lead] = await db.select().from(leads).where(eq(leads.leadId, leadId)).limit(1);
    if (!lead || lead.assignedPartnerId !== partnerId) throw new Error('Lead not found');

    await db
      .update(leads)
      .set({ status: accepted ? 'accepted' : 'new', respondedAt: new Date() })
      .where(eq(leads.leadId, leadId));

    if (!accepted) {
      return this.routeLead(leadId);
    }
    return this.getById(leadId);
  },

  async getById(leadId: string) {
    const [row] = await db.select().from(leads).where(eq(leads.leadId, leadId)).limit(1);
    return row ?? null;
  },
};
