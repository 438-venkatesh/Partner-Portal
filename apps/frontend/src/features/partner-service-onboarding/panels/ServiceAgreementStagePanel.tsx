import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerAgreementsApi } from '@/lib/api/partnerAgreementsApi';
import { partnerOnboardingApi } from '@/lib/api/partnerOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Handshake } from 'lucide-react';
import { useToast } from '@/lib/hooks/use-toast';
import { AgreementSignConfirmDialog } from '@/components/agreements/AgreementSignConfirmDialog';
import type { PartnerPortalAgreement } from '@/lib/api/partnerAgreementsApi';

interface Props {
  editable: boolean;
  submitted: boolean;
  onSubmit: () => void;
  submitting: boolean;
}

function isServiceAgreement(a: PartnerPortalAgreement) {
  return (
    a.agreementType === 'service_partner' ||
    a.agreementType === 'partner' ||
    a.agreementType === 'agency' ||
    (!a.agreementType.includes('supplier') && !a.agreementType.includes('logistics'))
  );
}

export function ServiceAgreementStagePanel({ editable, submitted, onSubmit, submitting }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [signTarget, setSignTarget] = useState<PartnerPortalAgreement | null>(null);

  const { isSuccess: workflowReady, data: workflowData } = useQuery({
    queryKey: ['partner-onboarding'],
    queryFn: () => partnerOnboardingApi.getWorkflow(),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const verificationDone = (workflowData?.workflow?.completedStages ?? []).includes('verification');

  const ensureAgreementMutation = useMutation({
    mutationFn: () => partnerOnboardingApi.ensureAgreement(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-agreements'] });
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not load agreement';
      toast({ title: 'Agreement not ready', description: msg, variant: 'destructive' });
    },
  });

  useEffect(() => {
    if (workflowReady && verificationDone) {
      ensureAgreementMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when workflow loads
  }, [workflowReady, verificationDone]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['partner-agreements'],
    queryFn: () => partnerAgreementsApi.list(),
    enabled: workflowReady,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const signMutation = useMutation({
    mutationFn: ({ agreementId, fullName }: { agreementId: string; fullName: string }) =>
      partnerAgreementsApi.sign(agreementId, fullName),
    onSuccess: () => {
      setSignTarget(null);
      toast({ title: 'Agreement signed' });
      queryClient.invalidateQueries({ queryKey: ['partner-agreements'] });
    },
    onError: () => {
      toast({ title: 'Sign failed', variant: 'destructive' });
    },
  });

  const agreements = data?.agreements ?? [];
  const serviceAgreements = agreements.filter(isServiceAgreement);
  const rows = serviceAgreements.length > 0 ? serviceAgreements : agreements;
  const signed = rows.some((a) => a.status === 'signed');
  const pendingSign = rows.filter(
    (a) => a.status === 'pending_signature' || a.status === 'draft'
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            Partner agreement
          </CardTitle>
          <CardDescription>
            Review and sign the commercial agreement issued by the platform. After you sign, submit for
            operations approval to complete this stage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={signed ? 'default' : 'outline'}>
              {signed ? 'Signed by you' : 'Signature required'}
            </Badge>
            {pendingSign.length > 0 && (
              <Badge variant="secondary">{pendingSign.length} awaiting signature</Badge>
            )}
          </div>

          {isLoading || isFetching || ensureAgreementMutation.isPending ? (
            <p className="text-sm text-muted-foreground">Loading agreements…</p>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-lg">
              <p className="font-medium text-gray-800">No agreement available yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                A <strong>Partner Master Agreement</strong> is created automatically after platform
                verification is approved. If you just completed verification, refresh this page.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <Button
                  variant="default"
                  size="sm"
                  disabled={ensureAgreementMutation.isPending}
                  onClick={() => {
                    ensureAgreementMutation.mutate();
                    void refetch();
                  }}
                >
                  Refresh list
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/partner/agreements">Agreements page</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((a) => (
                    <TableRow key={a.agreementId}>
                      <TableCell>
                        <Link
                          to="/partner/agreements/$agreementId"
                          params={{ agreementId: a.agreementId }}
                          className="font-medium text-primary hover:underline"
                        >
                          {a.title}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{a.agreementNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {editable &&
                          a.status !== 'signed' &&
                          a.status !== 'cancelled' &&
                          a.status !== 'terminated' && (
                            <Button
                              size="sm"
                              onClick={() => setSignTarget(a)}
                              disabled={signMutation.isPending}
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

          {editable && !submitted && signed && (
            <Button disabled={submitting} onClick={() => onSubmit()}>
              {submitting ? 'Submitting…' : 'Submit for platform review'}
            </Button>
          )}

          {submitted && (
            <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-md p-3">
              Agreement submitted for platform review.
            </p>
          )}
        </CardContent>
      </Card>

      <AgreementSignConfirmDialog
        open={!!signTarget}
        onOpenChange={(open) => !open && setSignTarget(null)}
        agreementTitle={signTarget?.title ?? 'Agreement'}
        agreementNumber={signTarget?.agreementNumber}
        isPending={signMutation.isPending}
        onConfirm={(fullName) => {
          if (signTarget) signMutation.mutate({ agreementId: signTarget.agreementId, fullName });
        }}
      />
    </div>
  );
}
