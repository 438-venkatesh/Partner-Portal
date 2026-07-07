import { useQuery } from '@tanstack/react-query';
import { partnerApi } from '@/lib/api/partners';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function PartnerActivityPanel({ partnerId }: { partnerId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['partners', partnerId, 'activity'],
    queryFn: () => partnerApi.getActivity(partnerId),
  });

  const rows = data?.activity ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity log</CardTitle>
        <CardDescription>Recent actions recorded for this partner.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && (
          <p className="text-sm text-destructive">Could not load activity.</p>
        )}
        {!isLoading && !error && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        )}
        {!isLoading && !error && rows.length > 0 && (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.logId}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatWhen(a.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {a.activityType.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md text-sm">{a.activityDescription}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.performedByType}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
