import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { relationshipApi } from '@/lib/api/relationship';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const BAND_VARIANT: Record<string, 'success' | 'warning' | 'destructive'> = {
  healthy: 'success',
  at_risk: 'warning',
  critical: 'destructive',
};

export function PartnerHealthPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['partners', 'health-scores'],
    queryFn: relationshipApi.listHealthScores,
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Partner health</h1>
        <p className="text-sm text-muted-foreground">Sorted worst-first, so at-risk partners surface immediately.</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {(data ?? []).map((p) => (
              <Link
                key={p.partnerId}
                to="/partners/$partnerId"
                params={{ partnerId: p.partnerId }}
                className="flex items-center justify-between p-3 hover:bg-muted"
              >
                <span className="font-medium">{p.partnerName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{p.score}/100</span>
                  <Badge variant={BAND_VARIANT[p.band] ?? 'outline'}>{p.band.replace('_', ' ')}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
