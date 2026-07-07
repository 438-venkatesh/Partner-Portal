import { useQuery } from '@tanstack/react-query';
import { onboardingLifecycleApi } from '@/lib/api/onboardingLifecycle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Link } from '@tanstack/react-router';

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

export function OnboardingAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['onboarding', 'analytics'],
    queryFn: onboardingLifecycleApi.getAnalytics,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Onboarding analytics</h1>
        <p className="text-sm text-muted-foreground">
          Where every in-flight partner sits, and who's gone quiet.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="In progress" value={data.totalInProgress} />
        <StatTile label="Completed" value={data.totalCompleted} />
        <StatTile
          label="Avg. days to complete"
          value={data.averageDaysToComplete ?? '—'}
        />
        <StatTile
          label="Stalled"
          value={
            <span className={data.stalledCount > 0 ? 'text-destructive' : ''}>
              {data.stalledCount}
            </span>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By current stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(data.byStage).length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing in progress right now.</p>
            )}
            {Object.entries(data.byStage)
              .sort((a, b) => b[1] - a[1])
              .map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{stage.replace(/_/g, ' ')}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By partner type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(data.byPartnerType).map(([type, stats]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                <span className="text-muted-foreground">
                  {stats.completed} / {stats.total} completed
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stalled partners</CardTitle>
          <p className="text-sm text-muted-foreground">
            No activity for {data.stalledAfterDays}+ days on their current stage.
          </p>
        </CardHeader>
        <CardContent>
          {data.stalledPartners.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody's stalled right now.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Partner</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Stage</th>
                    <th className="py-2 pr-4">Idle</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stalledPartners.map((p) => (
                    <tr key={p.partnerId} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <Link
                          to="/partners/$partnerId"
                          params={{ partnerId: p.partnerId }}
                          className="font-medium text-primary hover:underline"
                        >
                          {p.partnerName || p.partnerId}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 capitalize">{(p.partnerType ?? '').replace(/_/g, ' ')}</td>
                      <td className="py-2 pr-4 capitalize">{p.currentStage.replace(/_/g, ' ')}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="warning">{p.daysSinceLastActivity} days</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
