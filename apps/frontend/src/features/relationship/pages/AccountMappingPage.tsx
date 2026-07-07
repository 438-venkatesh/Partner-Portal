import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { relationshipApi } from '@/lib/api/relationship';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function AccountMappingPage() {
  const { data, isLoading } = useQuery({ queryKey: ['account-mapping', 'overlaps'], queryFn: relationshipApi.getOverlaps });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Account mapping</h1>
        <p className="text-sm text-muted-foreground">
          Tenants served by more than one partner right now — a channel-conflict watch list.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No overlaps right now — every tenant has exactly one partner.</p>
      ) : (
        <div className="space-y-4">
          {data.map((overlap) => (
            <Card key={overlap.tenantId}>
              <CardHeader>
                <CardTitle className="text-base">{overlap.tenantName || overlap.tenantId}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {overlap.partners.map((p) => (
                  <Link key={p.partnerId} to="/partners/$partnerId" params={{ partnerId: p.partnerId }}>
                    <Badge variant="outline" className="hover:bg-muted">
                      {p.partnerName || p.partnerId}
                    </Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
