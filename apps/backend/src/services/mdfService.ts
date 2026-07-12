import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import { mdfFunds, mdfRequests, deals, partners } from '../db/schema';
import { notificationService } from './notificationService';
import { realtimeBroadcaster } from '../realtime/broadcaster';
import type { CreateMdfFundInput, CreateMdfRequestInput } from '@partner-portal/common';

export const mdfService = {
  async listFunds() {
    return db.select().from(mdfFunds);
  },

  async createFund(input: CreateMdfFundInput) {
    const [fund] = await db
      .insert(mdfFunds)
      .values({
        name: input.name,
        totalBudget: input.totalBudget.toString(),
        remainingBudget: input.totalBudget.toString(),
        fiscalPeriod: input.fiscalPeriod,
        isActive: input.isActive ?? true,
      })
      .returning();
    return fund;
  },

  async updateFund(fundId: string, patch: Partial<CreateMdfFundInput>) {
    const [fund] = await db
      .update(mdfFunds)
      .set({
        ...patch,
        totalBudget: patch.totalBudget !== undefined ? patch.totalBudget.toString() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(mdfFunds.fundId, fundId))
      .returning();
    return fund ?? null;
  },

  async submitRequest(partnerId: string, input: CreateMdfRequestInput) {
    const [request] = await db
      .insert(mdfRequests)
      .values({
        partnerId,
        fundId: input.fundId,
        dealId: input.dealId,
        campaignName: input.campaignName,
        description: input.description,
        requestedAmount: input.requestedAmount.toString(),
        proofOfExpenseUrl: input.proofOfExpenseUrl,
      })
      .returning();
    return request;
  },

  async listForPartner(partnerId: string) {
    return db.select().from(mdfRequests).where(eq(mdfRequests.partnerId, partnerId)).orderBy(desc(mdfRequests.createdAt));
  },

  async listAll(filters?: { status?: string }) {
    const rows = await db
      .select({
        requestId: mdfRequests.requestId,
        partnerId: mdfRequests.partnerId,
        partnerName: partners.partnerName,
        fundId: mdfRequests.fundId,
        fundName: mdfFunds.name,
        dealId: mdfRequests.dealId,
        campaignName: mdfRequests.campaignName,
        requestedAmount: mdfRequests.requestedAmount,
        approvedAmount: mdfRequests.approvedAmount,
        status: mdfRequests.status,
        createdAt: mdfRequests.createdAt,
      })
      .from(mdfRequests)
      .leftJoin(partners, eq(mdfRequests.partnerId, partners.partnerId))
      .leftJoin(mdfFunds, eq(mdfRequests.fundId, mdfFunds.fundId))
      .orderBy(desc(mdfRequests.createdAt));
    return filters?.status ? rows.filter((r) => r.status === filters.status) : rows;
  },

  async review(
    requestId: string,
    approved: boolean,
    approvedAmount: number | undefined,
    rejectionReason: string | undefined,
    actorId: string
  ) {
    const [request] = await db.select().from(mdfRequests).where(eq(mdfRequests.requestId, requestId)).limit(1);
    if (!request) throw new Error('MDF request not found');

    if (approved) {
      const amount = approvedAmount ?? Number(request.requestedAmount);
      const [fund] = await db.select().from(mdfFunds).where(eq(mdfFunds.fundId, request.fundId)).limit(1);
      if (!fund || Number(fund.remainingBudget) < amount) {
        throw new Error('Insufficient remaining budget in this fund');
      }
      await db
        .update(mdfFunds)
        .set({ remainingBudget: (Number(fund.remainingBudget) - amount).toString(), updatedAt: new Date() })
        .where(eq(mdfFunds.fundId, fund.fundId));

      const [updated] = await db
        .update(mdfRequests)
        .set({ status: 'approved', approvedAmount: amount.toString(), approvedBy: actorId, approvedAt: new Date(), updatedAt: new Date() })
        .where(eq(mdfRequests.requestId, requestId))
        .returning();

      await notificationService.createForAllPartnerUsers(request.partnerId, {
        type: 'mdf_reviewed',
        title: `MDF request approved: ${request.campaignName}`,
        body: `Approved for ${amount}. Submit proof of expense to claim it.`,
      });
      realtimeBroadcaster.broadcast({ type: 'mdf_reviewed', requestId, approved: true, amount });
      return updated;
    }

    const [updated] = await db
      .update(mdfRequests)
      .set({ status: 'rejected', rejectionReason, approvedBy: actorId, approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(mdfRequests.requestId, requestId))
      .returning();

    await notificationService.createForAllPartnerUsers(request.partnerId, {
      type: 'mdf_reviewed',
      title: `MDF request rejected: ${request.campaignName}`,
      body: rejectionReason ?? 'No reason given.',
    });
    realtimeBroadcaster.broadcast({ type: 'mdf_reviewed', requestId, approved: false });
    return updated;
  },

  async claim(requestId: string, partnerId: string, proofOfExpenseUrl: string | undefined) {
    const [request] = await db.select().from(mdfRequests).where(eq(mdfRequests.requestId, requestId)).limit(1);
    if (!request || request.partnerId !== partnerId) throw new Error('MDF request not found');
    if (request.status !== 'approved') throw new Error('Only an approved request can be claimed');

    const [updated] = await db
      .update(mdfRequests)
      .set({ status: 'claimed', proofOfExpenseUrl: proofOfExpenseUrl ?? request.proofOfExpenseUrl, claimedAt: new Date(), updatedAt: new Date() })
      .where(eq(mdfRequests.requestId, requestId))
      .returning();
    return updated;
  },

  async markPaid(requestId: string) {
    const [updated] = await db
      .update(mdfRequests)
      .set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() })
      .where(and(eq(mdfRequests.requestId, requestId), eq(mdfRequests.status, 'claimed')))
      .returning();
    return updated ?? null;
  },

  /** Revenue generated by deals linked to this fund's requests, divided by what the fund actually spent. */
  async getFundRoi(fundId: string) {
    const rows = await db
      .select({
        requestId: mdfRequests.requestId,
        approvedAmount: mdfRequests.approvedAmount,
        dealId: mdfRequests.dealId,
        dealStatus: deals.status,
        dealValue: deals.actualValue,
      })
      .from(mdfRequests)
      .leftJoin(deals, eq(mdfRequests.dealId, deals.dealId))
      .where(and(eq(mdfRequests.fundId, fundId), inArray(mdfRequests.status, ['approved', 'claimed', 'paid'])));

    const totalSpent = rows.reduce((sum, r) => sum + Number(r.approvedAmount ?? 0), 0);
    const revenue = rows
      .filter((r) => r.dealStatus === 'won')
      .reduce((sum, r) => sum + Number(r.dealValue ?? 0), 0);
    const dealsLinked = rows.filter((r) => r.dealId).length;
    const dealsWon = rows.filter((r) => r.dealStatus === 'won').length;

    return {
      totalSpent,
      revenue,
      roi: totalSpent > 0 ? Math.round((revenue / totalSpent) * 100) / 100 : null,
      dealsLinked,
      dealsWon,
    };
  },
};
