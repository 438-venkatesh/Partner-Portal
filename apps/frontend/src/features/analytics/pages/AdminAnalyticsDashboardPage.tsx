import { useQuery } from '@tanstack/react-query';
import { adminAnalyticsApi } from '@/lib/api/adminAnalytics';
import { useAdminRealtime } from '@/lib/hooks/useAdminRealtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const OVERVIEW_KEY = ['admin-analytics-overview'];
const MDF_ROI_KEY = ['admin-analytics-mdf-roi'];

export function AdminAnalyticsDashboardPage() {
  useAdminRealtime([OVERVIEW_KEY, MDF_ROI_KEY]);

  const { data: overview, isLoading } = useQuery({
    queryKey: OVERVIEW_KEY,
    queryFn: () => adminAnalyticsApi.getOverview(90),
  });
  const { data: mdfRoi, isLoading: mdfLoading } = useQuery({
    queryKey: MDF_ROI_KEY,
    queryFn: () => adminAnalyticsApi.getMdfRoiSummary(),
  });

  if (isLoading || !overview) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  const funnelData = Object.entries(overview.dealFunnel).map(([status, count]) => ({ status, count }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Won revenue (90d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overview.revenue.total.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.partners.total}</div>
            <p className="text-xs text-muted-foreground">
              {overview.partners.byStatus.active ?? 0} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Commissions paid (90d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(overview.commissions.paid ?? 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ${(overview.commissions.approved ?? 0).toLocaleString()} approved, pending payout
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MDF spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overview.mdf.totalSpent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{overview.mdf.requestCount} requests</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deal funnel (90d)</CardTitle>
          </CardHeader>
          <CardContent>
            {funnelData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deals in this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={funnelData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0088FE" name="Deals" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.revenue.leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground">No won deals in this period.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.revenue.leaderboard.map((row) => (
                    <TableRow key={row.partnerId}>
                      <TableCell>{row.partnerName}</TableCell>
                      <TableCell className="text-right">${row.revenue.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>MDF ROI across all funds</CardTitle>
        </CardHeader>
        <CardContent>
          {mdfLoading ? (
            <Skeleton className="h-32" />
          ) : !mdfRoi || mdfRoi.funds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No MDF funds yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-muted-foreground">Total spent</p>
                  <p className="text-lg font-semibold">${mdfRoi.totalSpent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Attributed revenue</p>
                  <p className="text-lg font-semibold">${mdfRoi.totalRevenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Platform ROI</p>
                  <p className="text-lg font-semibold">{mdfRoi.roi !== null ? `${mdfRoi.roi}x` : 'No spend yet'}</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fund</TableHead>
                    <TableHead className="text-right">Spent</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                    <TableHead className="text-right">Deals won</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mdfRoi.funds.map((f) => (
                    <TableRow key={f.fundId}>
                      <TableCell>{f.name}</TableCell>
                      <TableCell className="text-right">${f.totalSpent.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${f.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {f.roi !== null ? (
                          <Badge variant="outline">{f.roi}x</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{f.dealsWon}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
