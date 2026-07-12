import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformAuditApi } from '@/lib/api/adminGovernance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormInput } from '@/components/ui/form-field';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function AuditLogPanel() {
  const [entityType, setEntityType] = useState('');

  const { data: entries, isLoading } = useQuery({
    queryKey: ['platform-audit-log', entityType],
    queryFn: () => platformAuditApi.list({ entityType: entityType || undefined, limit: 100 }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform audit log</CardTitle>
        <CardDescription>
          Admin account changes, tenant CRUD, and billing/commission plan edits — actions that aren't tied to a
          single partner and so don't appear in a partner's own activity log.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormInput
          label="Filter by entity type"
          placeholder="e.g. tenant, admin_user, billing_plan"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="max-w-xs"
        />

        {isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(entries ?? []).map((entry) => (
                <TableRow key={entry.auditId}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>{entry.actorEmail ?? entry.actorId}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{entry.action}</Badge>
                  </TableCell>
                  <TableCell>
                    {entry.entityType}
                    {entry.entityId ? ` (${entry.entityId.slice(0, 8)}…)` : ''}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {JSON.stringify(entry.metadata)}
                  </TableCell>
                </TableRow>
              ))}
              {(entries ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No platform-level actions recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
