import { useQuery } from '@tanstack/react-query';
import { commissionsApi } from '@/lib/api/commissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

export function PartnerCommissionsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['my-commissions'], queryFn: commissionsApi.getMine });
  const { data: challenges } = useQuery({ queryKey: ['my-challenges'], queryFn: commissionsApi.getMyChallenges });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Approved balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">${data?.balance.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">Approved and awaiting the next payout run.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statement history</CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.records ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No commissions yet — register and win a deal to earn one.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2">Description</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data?.records ?? []).map((r) => (
                  <tr key={r.recordId} className="border-b last:border-0">
                    <td className="p-2">{r.description}</td>
                    <td className="p-2">
                      {r.currency} {r.amount}
                    </td>
                    <td className="p-2">
                      <Badge variant={r.status === 'paid' ? 'success' : r.status === 'approved' ? 'secondary' : 'warning'}>
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Challenges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(challenges ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No active challenges right now.</p>
          ) : (
            (challenges ?? []).map((c) => (
              <div key={c.challengeId} className="space-y-1 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{c.name}</p>
                  {c.completed && <Badge variant="success">Completed</Badge>}
                </div>
                <Progress value={Math.min(100, ((c.progress ?? 0) / Number(c.target)) * 100)} />
                <p className="text-xs text-muted-foreground">
                  {c.progress ?? 0} / {c.target} {c.metric.replace('_', ' ')} → {c.rewardValue}{' '}
                  {c.rewardType.replace('_', ' ')}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
