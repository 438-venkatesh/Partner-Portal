import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AgreementSignConfirmDialog } from '@/components/agreements/AgreementSignConfirmDialog';
import type { PartnerPortalAgreement } from '@/lib/api/partnerAgreementsApi';
import { partnerAgreementsApi } from '@/lib/api/partnerAgreementsApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/lib/hooks/use-toast';

export const Route = createFileRoute('/partner/agreements')({
  component: PartnerAgreementsPage,
});

function PartnerAgreementsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [signTarget, setSignTarget] = useState<PartnerPortalAgreement | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['partner-agreements'],
    queryFn: () => partnerAgreementsApi.list(),
  });

  const signMutation = useMutation({
    mutationFn: (agreementId: string) => partnerAgreementsApi.sign(agreementId),
    onSuccess: () => {
      setSignTarget(null);
      toast({ title: 'Agreement signed' });
      queryClient.invalidateQueries({ queryKey: ['partner-agreements'] });
    },
    onError: (e: any) => {
      toast({
        title: 'Sign failed',
        description: e?.message ?? 'Could not sign agreement',
        variant: 'destructive',
      });
    },
  });

  const rows = data?.agreements ?? [];

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Agreements</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Review commercial and legal agreements for your organization. Open a row for the full text and signing
          action.
        </p>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>Your agreements</CardTitle>
          <CardDescription>Status updates when you sign from this portal.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && (
            <p className="text-sm text-destructive">Could not load agreements.</p>
          )}
          {!isLoading && !error && rows.length === 0 && (
            <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
              <p className="font-medium text-gray-800">No agreements yet</p>
              <p className="text-sm mt-1">When the platform issues agreements to your partner, they will show here.</p>
            </div>
          )}
          {!isLoading && !error && rows.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((a) => (
                    <TableRow key={a.agreementId}>
                      <TableCell className="font-mono text-sm">{a.agreementNumber}</TableCell>
                      <TableCell className="max-w-xs">
                        <Link
                          to="/partner/agreements/$agreementId"
                          params={{ agreementId: a.agreementId }}
                          className="font-medium text-primary hover:underline"
                        >
                          {a.title}
                        </Link>
                      </TableCell>
                      <TableCell>{a.agreementType}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {a.status !== 'signed' && a.status !== 'cancelled' && a.status !== 'terminated' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={signMutation.isPending}
                            onClick={() => setSignTarget(a)}
                          >
                            Sign
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AgreementSignConfirmDialog
        open={!!signTarget}
        onOpenChange={(open) => !open && setSignTarget(null)}
        agreementTitle={signTarget?.title ?? 'Agreement'}
        agreementNumber={signTarget?.agreementNumber}
        isPending={signMutation.isPending}
        onConfirm={() => {
          if (signTarget) signMutation.mutate(signTarget.agreementId);
        }}
      />
    </div>
  );
}
