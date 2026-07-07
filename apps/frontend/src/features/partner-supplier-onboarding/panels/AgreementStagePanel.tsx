import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerAgreementsApi } from '@/lib/api/partnerAgreementsApi';
import { partnerSupplierOnboardingApi } from '@/lib/api/partnerSupplierOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import {
  AGREEMENT_STATUS_LABELS,
  getAgreementReviewStatus,
  hasCountersignedAgreement,
} from '@/lib/onboardingReviewRequirements';

interface Props {
  editable: boolean;
  submitted: boolean;
  completed?: boolean;
  adminMessage?: string;
  onSubmit: () => void;
  submitting: boolean;
}

function statusBadgeVariant(
  status: ReturnType<typeof getAgreementReviewStatus>
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'accepted') return 'default';
  if (status === 'rejected') return 'destructive';
  if (status === 'awaiting_ops') return 'secondary';
  return 'outline';
}

export function AgreementStagePanel({
  editable,
  submitted,
  completed = false,
  adminMessage,
  onSubmit,
  submitting,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [signTarget, setSignTarget] = useState<PartnerPortalAgreement | null>(null);

  const { isSuccess: workflowReady, data: workflowData } = useQuery({
    queryKey: ['partner-supplier-onboarding'],
    queryFn: () => partnerSupplierOnboardingApi.getWorkflow(),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const verificationDone = (workflowData?.workflow?.completedStages ?? []).includes(
    'supplier_verification'
  );

  const ensureAgreementMutation = useMutation({
    mutationFn: () => partnerSupplierOnboardingApi.ensureAgreement(),
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
  const supplierAgreements = agreements.filter(
    (a) => a.agreementType === 'supplier' || a.agreementType?.includes('supplier')
  );
  const rows = supplierAgreements.length > 0 ? supplierAgreements : agreements;

  const acceptedCount = rows.filter((a) => getAgreementReviewStatus(a) === 'accepted').length;
  const rejectedCount = rows.filter((a) => getAgreementReviewStatus(a) === 'rejected').length;
  const awaitingOpsCount = rows.filter((a) => getAgreementReviewStatus(a) === 'awaiting_ops').length;
  const awaitingPartnerCount = rows.filter(
    (a) => getAgreementReviewStatus(a) === 'awaiting_partner' || getAgreementReviewStatus(a) === 'draft'
  ).length;

  const partnerSigned = rows.some((a) => a.status === 'signed');
  const opsAccepted = hasCountersignedAgreement(rows);
  const canSubmit = partnerSigned && !submitted && !completed;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            Supplier agreement
          </CardTitle>
          <CardDescription>
            You may have multiple agreement versions on file. Sign at least one; operations accepts the
            version that meets terms and may reject others. Only an <strong>accepted by operations</strong>{' '}
            agreement completes this step — rejected agreements do not count.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {acceptedCount > 0 && (
              <Badge className="bg-emerald-600 hover:bg-emerald-600">
                {acceptedCount} accepted by operations
              </Badge>
            )}
            {awaitingOpsCount > 0 && (
              <Badge variant="secondary">{awaitingOpsCount} awaiting operations</Badge>
            )}
            {awaitingPartnerCount > 0 && (
              <Badge variant="outline">{awaitingPartnerCount} need your signature</Badge>
            )}
            {rejectedCount > 0 && (
              <Badge variant="destructive">{rejectedCount} rejected</Badge>
            )}
          </div>

          {rejectedCount > 0 && !opsAccepted && (
            <Alert variant="destructive">
              <AlertDescription>
                {rejectedCount === rows.length
                  ? 'All agreements on file were rejected by operations. Ask operations to issue a new agreement, or sign a new version when available.'
                  : `${rejectedCount} agreement(s) were rejected and will not count toward this step. Operations must accept at least one signed agreement before you can continue.`}
              </AlertDescription>
            </Alert>
          )}

          {completed && opsAccepted && (
            <Alert className="border-emerald-200 bg-emerald-50/90 text-emerald-900">
              <AlertDescription>
                <span className="font-medium">Agreement step complete.</span>
                {acceptedCount > 1
                  ? ` Operations accepted ${acceptedCount} agreement(s).`
                  : ' Operations accepted your agreement.'}
                {rejectedCount > 0
                  ? ` ${rejectedCount} other agreement(s) on file were rejected and are shown for your records only.`
                  : ''}
                {adminMessage ? ` ${adminMessage}` : ' Continue to payment & terms.'}
              </AlertDescription>
            </Alert>
          )}

          {isLoading || isFetching || ensureAgreementMutation.isPending ? (
            <p className="text-sm text-muted-foreground">Loading agreements…</p>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-lg">
              <p className="font-medium text-gray-800">No agreement available yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                A <strong>Supplier Master Agreement</strong> is created automatically after platform
                verification is approved.
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
                  {rows.map((a) => {
                    const reviewStatus = getAgreementReviewStatus(a);
                    return (
                      <TableRow
                        key={a.agreementId}
                        className={reviewStatus === 'rejected' ? 'bg-red-50/50' : undefined}
                      >
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
                          <Badge variant={statusBadgeVariant(reviewStatus)} className="font-normal">
                            {AGREEMENT_STATUS_LABELS[reviewStatus]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {editable &&
                            reviewStatus !== 'accepted' &&
                            reviewStatus !== 'rejected' &&
                            reviewStatus !== 'expired' && (
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
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {editable && canSubmit && (
            <Button disabled={submitting} onClick={() => onSubmit()}>
              {submitting ? 'Submitting…' : 'Submit for platform countersign'}
            </Button>
          )}

          {submitted && !completed && (
            <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-md p-3">
              {opsAccepted
                ? 'Operations has accepted an agreement. This step will show as complete once they finalize the stage.'
                : awaitingOpsCount > 0
                  ? 'You signed and submitted for operations review. They will accept or reject each agreement — only accepted agreements complete this step.'
                  : 'Waiting for you to sign an agreement before operations can review.'}
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
