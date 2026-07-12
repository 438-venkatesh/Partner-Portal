import { and, eq, gte, lte, inArray } from 'drizzle-orm';
import { db } from '../db';
import { deals } from '../db/schema/dealRegistration';
import { purchaseOrders, suppliers } from '../db/schema/suppliers';
import { shipments, logisticsPartners } from '../db/schema/logistics';

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

function bucketKey(date: Date, periodType: PeriodType): string {
  if (periodType === 'daily') return date.toISOString().slice(0, 10);
  if (periodType === 'weekly') {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() - day + 1); // Monday of that week
    return d.toISOString().slice(0, 10);
  }
  if (periodType === 'quarterly') return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
  if (periodType === 'yearly') return String(date.getUTCFullYear());
  return date.toISOString().slice(0, 7); // monthly: YYYY-MM
}

export const performanceService = {
  /** Real Won-deal revenue, transaction volume, review-turnaround, and rejection signal for a partner. */
  async getPartnerMetrics(partnerId: string, query: { periodStart: Date; periodEnd: Date; periodType: string }) {
    const periodType = query.periodType as PeriodType;
    const rows = await db
      .select()
      .from(deals)
      .where(
        and(
          eq(deals.partnerId, partnerId),
          gte(deals.createdAt, query.periodStart),
          lte(deals.createdAt, query.periodEnd)
        )
      );

    const won = rows.filter((d) => d.status === 'won');
    const lost = rows.filter((d) => d.status === 'lost');
    const rejected = rows.filter((d) => d.status === 'rejected');
    const reviewed = rows.filter((d) => d.reviewedAt);

    const revenueByBucket = new Map<string, number>();
    for (const deal of won) {
      const at = deal.resolvedAt ?? deal.createdAt ?? query.periodStart;
      const key = bucketKey(at, periodType);
      revenueByBucket.set(key, (revenueByBucket.get(key) ?? 0) + Number(deal.actualValue ?? 0));
    }
    const breakdown = [...revenueByBucket.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, amount]) => ({ period, amount }));
    const totalRevenue = breakdown.reduce((sum, b) => sum + b.amount, 0);

    const resolvedCount = won.length + lost.length;
    const successRate = resolvedCount > 0 ? Math.round((won.length / resolvedCount) * 1000) / 10 : 0;

    const responseTimesSeconds = reviewed
      .filter((d) => d.createdAt)
      .map((d) => (d.reviewedAt!.getTime() - d.createdAt!.getTime()) / 1000)
      .filter((s) => s >= 0);
    const averageResponseTime =
      responseTimesSeconds.length > 0
        ? Math.round(responseTimesSeconds.reduce((a, b) => a + b, 0) / responseTimesSeconds.length)
        : undefined;

    /** No formal SLA is configured anywhere in this codebase for deal review — 3 calendar days is a reasonable default threshold. */
    const SLA_SECONDS = 3 * 24 * 60 * 60;
    const slaCompliance =
      reviewed.length > 0
        ? Math.round((responseTimesSeconds.filter((s) => s <= SLA_SECONDS).length / reviewed.length) * 1000) / 10
        : 0;

    return {
      partnerId,
      period: bucketKey(query.periodStart, periodType),
      revenue: { total: totalRevenue, currency: won[0]?.currency ?? 'USD', breakdown },
      transactions: rows.length,
      successRate,
      averageResponseTime,
      // No CSAT survey system exists in this codebase yet — honestly 0 rather than invented.
      customerSatisfaction: 0,
      slaCompliance,
      // No support/ticketing system exists yet (tracked separately) — rejected deals are the closest real signal.
      issuesCount: rejected.length,
      resolvedIssuesCount: 0,
      metrics: { wonCount: won.length, lostCount: lost.length, rejectedCount: rejected.length },
    };
  },

  async getSupplierMetrics(
    supplierId: string,
    query: { tenantId?: string; periodStart: Date; periodEnd: Date; periodType: string }
  ) {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.supplierId, supplierId)).limit(1);

    const conditions = [
      eq(purchaseOrders.supplierId, supplierId),
      gte(purchaseOrders.poDate, query.periodStart.toISOString().slice(0, 10)),
      lte(purchaseOrders.poDate, query.periodEnd.toISOString().slice(0, 10)),
    ];
    if (query.tenantId) conditions.push(eq(purchaseOrders.tenantId, query.tenantId));

    const orders = await db.select().from(purchaseOrders).where(and(...conditions));
    const completed = orders.filter((o) => o.status === 'completed' || o.status === 'closed');
    const totalSpend = orders.reduce((sum, o) => sum + Number(o.totalAmount ?? 0), 0);

    const poIds = orders.map((o) => o.poId);
    const linkedShipments = poIds.length
      ? await db.select().from(shipments).where(inArray(shipments.poId, poIds))
      : [];
    const delivered = linkedShipments.filter((s) => s.actualDeliveryDate && s.slaDeadline);
    const onTime = delivered.filter((s) => s.actualDeliveryDate! <= s.slaDeadline!);
    const onTimeDeliveryRate = delivered.length > 0 ? Math.round((onTime.length / delivered.length) * 1000) / 10 : 0;

    return {
      supplierId,
      partnerId: supplier?.partnerId,
      period: bucketKey(query.periodStart, query.periodType as PeriodType),
      metrics: {
        totalOrders: orders.length,
        completedOrders: completed.length,
        onTimeDeliveryRate,
        // No supplier quality-rating system exists in this codebase yet.
        qualityScore: 0,
        totalSpend,
      },
    };
  },

  async getLogisticsMetrics(
    logisticsId: string,
    query: { tenantId?: string; periodStart: Date; periodEnd: Date; periodType: string }
  ) {
    const [logisticsPartner] = await db
      .select()
      .from(logisticsPartners)
      .where(eq(logisticsPartners.logisticsId, logisticsId))
      .limit(1);

    const conditions = [
      eq(shipments.logisticsId, logisticsId),
      gte(shipments.createdAt, query.periodStart),
      lte(shipments.createdAt, query.periodEnd),
    ];
    if (query.tenantId) conditions.push(eq(shipments.tenantId, query.tenantId));

    const rows = await db.select().from(shipments).where(and(...conditions));
    const delivered = rows.filter((s) => s.actualDeliveryDate && s.slaDeadline);
    const onTime = delivered.filter((s) => s.actualDeliveryDate! <= s.slaDeadline!);
    const rate = delivered.length > 0 ? Math.round((onTime.length / delivered.length) * 1000) / 10 : 0;

    return {
      logisticsId,
      partnerId: logisticsPartner?.partnerId,
      period: bucketKey(query.periodStart, query.periodType as PeriodType),
      metrics: {
        totalShipments: rows.length,
        onTimeDeliveryRate: rate,
        slaComplianceRate: rate,
        // No logistics-billing concept exists in this codebase yet.
        totalRevenue: 0,
      },
    };
  },
};
