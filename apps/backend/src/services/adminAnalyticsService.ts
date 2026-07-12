import { gte } from 'drizzle-orm';
import { db } from '../db';
import { partners, deals, commissionRecords, mdfFunds, mdfRequests } from '../db/schema';
import { mdfService } from './mdfService';

export const adminAnalyticsService = {
  /** Cross-partner rollup: partner counts, deal funnel, revenue leaderboard, commission and MDF totals. */
  async getOverview(periodDays: number = 90) {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const [allPartners, periodDeals, periodCommissions, requests] = await Promise.all([
      db
        .select({
          partnerId: partners.partnerId,
          partnerName: partners.partnerName,
          status: partners.status,
          tier: partners.tier,
        })
        .from(partners),
      db.select().from(deals).where(gte(deals.createdAt, since)),
      db.select().from(commissionRecords).where(gte(commissionRecords.createdAt, since)),
      db.select().from(mdfRequests),
    ]);

    const partnersByStatus: Record<string, number> = {};
    const partnersByTier: Record<string, number> = {};
    for (const p of allPartners) {
      const status = p.status ?? 'unknown';
      partnersByStatus[status] = (partnersByStatus[status] ?? 0) + 1;
      if (p.tier) partnersByTier[p.tier] = (partnersByTier[p.tier] ?? 0) + 1;
    }

    const funnel: Record<string, number> = {};
    const revenueByPartner = new Map<string, number>();
    let totalRevenue = 0;
    for (const d of periodDeals) {
      const status = d.status ?? 'unknown';
      funnel[status] = (funnel[status] ?? 0) + 1;
      if (status === 'won') {
        const value = Number(d.actualValue ?? 0);
        totalRevenue += value;
        revenueByPartner.set(d.partnerId, (revenueByPartner.get(d.partnerId) ?? 0) + value);
      }
    }

    const partnerNameById = new Map(allPartners.map((p) => [p.partnerId, p.partnerName]));
    const leaderboard = [...revenueByPartner.entries()]
      .map(([partnerId, revenue]) => ({ partnerId, partnerName: partnerNameById.get(partnerId) ?? partnerId, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const commissionTotals: Record<string, number> = {};
    for (const c of periodCommissions) {
      const status = c.status ?? 'unknown';
      commissionTotals[status] = (commissionTotals[status] ?? 0) + Number(c.amount);
    }

    const mdfSpent = requests
      .filter((r) => ['approved', 'claimed', 'paid'].includes(r.status ?? ''))
      .reduce((sum, r) => sum + Number(r.approvedAmount ?? 0), 0);

    return {
      periodDays,
      partners: { total: allPartners.length, byStatus: partnersByStatus, byTier: partnersByTier },
      dealFunnel: funnel,
      revenue: { total: totalRevenue, leaderboard },
      commissions: commissionTotals,
      mdf: { totalSpent: mdfSpent, requestCount: requests.length },
    };
  },

  /** Platform-wide MDF spend-to-revenue, aggregated across every fund and ranked by ROI. */
  async getMdfRoiSummary() {
    const funds = await db.select().from(mdfFunds);
    const perFund = await Promise.all(
      funds.map(async (fund) => ({
        fundId: fund.fundId,
        name: fund.name,
        ...(await mdfService.getFundRoi(fund.fundId)),
      }))
    );

    const totalSpent = perFund.reduce((sum, f) => sum + f.totalSpent, 0);
    const totalRevenue = perFund.reduce((sum, f) => sum + f.revenue, 0);

    return {
      totalSpent,
      totalRevenue,
      roi: totalSpent > 0 ? Math.round((totalRevenue / totalSpent) * 100) / 100 : null,
      funds: perFund.sort((a, b) => (b.roi ?? -1) - (a.roi ?? -1)),
    };
  },
};
