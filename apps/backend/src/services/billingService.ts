import { and, desc, eq, lte } from 'drizzle-orm';
import { db } from '../db';
import { partnerBillingPlans, partnerSubscriptions, partnerBillingInvoices, partners } from '../db/schema';
import { notificationService } from './notificationService';
import type { CreateBillingPlanInput } from '@partner-portal/common';

function addBillingCycle(date: Date, cycle: string): Date {
  const next = new Date(date);
  if (cycle === 'annual') {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

function toPgDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const billingService = {
  async listPlans() {
    return db.select().from(partnerBillingPlans).orderBy(desc(partnerBillingPlans.createdAt));
  },

  async createPlan(input: CreateBillingPlanInput) {
    const [plan] = await db
      .insert(partnerBillingPlans)
      .values({
        planName: input.planName,
        priceCents: input.priceCents,
        currency: input.currency,
        features: input.features ?? [],
        isActive: input.isActive ?? true,
      })
      .returning();
    return plan;
  },

  async updatePlan(planId: string, patch: Partial<CreateBillingPlanInput>) {
    const [plan] = await db
      .update(partnerBillingPlans)
      .set(patch)
      .where(eq(partnerBillingPlans.planId, planId))
      .returning();
    return plan ?? null;
  },

  async getPartnerSubscription(partnerId: string) {
    const [row] = await db
      .select()
      .from(partnerSubscriptions)
      .where(eq(partnerSubscriptions.partnerId, partnerId))
      .orderBy(desc(partnerSubscriptions.createdAt))
      .limit(1);
    return row ?? null;
  },

  async assignPlan(partnerId: string, planId: string, billingCycle: string = 'monthly') {
    const [row] = await db
      .insert(partnerSubscriptions)
      .values({
        partnerId,
        planId,
        status: 'active',
        billingCycle,
        nextBillingDate: addBillingCycle(new Date(), billingCycle),
      })
      .returning();
    return row;
  },

  // ---- invoicing (no real payment gateway — see routes/integrationStubs.ts) ----

  async generateInvoiceForSubscription(subscriptionId: string) {
    const [subscription] = await db
      .select()
      .from(partnerSubscriptions)
      .where(eq(partnerSubscriptions.subscriptionId, subscriptionId))
      .limit(1);
    if (!subscription || !subscription.nextBillingDate) return null;

    const [plan] = await db
      .select()
      .from(partnerBillingPlans)
      .where(eq(partnerBillingPlans.planId, subscription.planId))
      .limit(1);
    if (!plan) return null;

    const periodStart = subscription.nextBillingDate;
    const periodEnd = addBillingCycle(periodStart, subscription.billingCycle);

    const [invoice] = await db
      .insert(partnerBillingInvoices)
      .values({
        partnerId: subscription.partnerId,
        subscriptionId: subscription.subscriptionId,
        planName: plan.planName,
        amountCents: plan.priceCents,
        currency: plan.currency,
        periodStart: toPgDateString(periodStart),
        periodEnd: toPgDateString(periodEnd),
        dueDate: toPgDateString(periodEnd),
      })
      .returning();

    await db
      .update(partnerSubscriptions)
      .set({ nextBillingDate: periodEnd })
      .where(eq(partnerSubscriptions.subscriptionId, subscriptionId));

    await notificationService.createForAllPartnerUsers(subscription.partnerId, {
      type: 'billing_invoice_generated',
      title: `New invoice: ${plan.planName}`,
      body: `${(plan.priceCents / 100).toFixed(2)} ${plan.currency} due ${toPgDateString(periodEnd)}.`,
    });

    return invoice;
  },

  /** Generates an invoice for every active subscription whose next billing date has arrived. Safe to run daily. */
  async runBillingCycle() {
    const due = await db
      .select({ subscriptionId: partnerSubscriptions.subscriptionId })
      .from(partnerSubscriptions)
      .where(and(eq(partnerSubscriptions.status, 'active'), lte(partnerSubscriptions.nextBillingDate, new Date())));

    const results: Array<{ subscriptionId: string; invoiceId: string | null }> = [];
    for (const { subscriptionId } of due) {
      const invoice = await this.generateInvoiceForSubscription(subscriptionId);
      results.push({ subscriptionId, invoiceId: invoice?.invoiceId ?? null });
    }
    return { checked: due.length, generated: results.filter((r) => r.invoiceId).length, results };
  },

  async listInvoicesForPartner(partnerId: string) {
    return db
      .select()
      .from(partnerBillingInvoices)
      .where(eq(partnerBillingInvoices.partnerId, partnerId))
      .orderBy(desc(partnerBillingInvoices.createdAt));
  },

  async listAllInvoices(status?: string) {
    const rows = await db
      .select({ invoice: partnerBillingInvoices, partnerName: partners.partnerName })
      .from(partnerBillingInvoices)
      .leftJoin(partners, eq(partnerBillingInvoices.partnerId, partners.partnerId))
      .orderBy(desc(partnerBillingInvoices.createdAt));
    return status ? rows.filter((r) => r.invoice.status === status) : rows;
  },

  async markInvoicePaid(invoiceId: string, paidReference?: string) {
    const [invoice] = await db
      .update(partnerBillingInvoices)
      .set({ status: 'paid', paidAt: new Date(), paidReference, updatedAt: new Date() })
      .where(and(eq(partnerBillingInvoices.invoiceId, invoiceId), eq(partnerBillingInvoices.status, 'unpaid')))
      .returning();
    return invoice ?? null;
  },
};
