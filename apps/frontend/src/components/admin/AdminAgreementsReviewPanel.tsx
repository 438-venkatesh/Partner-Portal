import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { partnerApi, PartnerAgreement } from '@/lib/api/partners';
import { onboardingApi } from '@/lib/api/onboarding';
import { useBulkSelection } from '@/lib/hooks/useBulkSelection';
import { AdminBulkReviewToolbar } from '@/components/admin/AdminBulkReviewToolbar';
import { RejectNotesDialog } from '@/components/admin/RejectNotesDialog';
import { useToast } from '@/lib/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import {
  AGREEMENT_STATUS_LABELS,
  getAgreementReviewStatus,
  hasCountersignedAgreement,
} from '@/lib/onboardingReviewRequirements';

interface Props {
  partnerId: string;
  supplierId?: string;
}

function canAcceptAgreement(agreement: PartnerAgreement): boolean {
  return agreement.status === 'signed' && !agreement.platformSignedAt;
}

export function AdminAgreementsReviewPanel({ partnerId, supplierId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['partners', partnerId, 'agreements'],
    queryFn: () => partnerApi.getAgreements(partnerId),
    enabled: Boolean(partnerId),
  });

  const agreements = data?.agreements ?? [];
  const selectable = useMemo(
    () => agreements.map((a) => ({ ...a, id: a.agreementId })),
    [agreements]
  );
  const selection = useBulkSelection(selectable);

  const acceptedCount = agreements.filter((a) => getAgreementReviewStatus(a) === 'accepted').length;
  const rejectedCount = agreements.filter((a) => getAgreementReviewStatus(a) === 'rejected').length;
  const awaitingOpsCount = agreements.filter((a) => getAgreementReviewStatus(a) === 'awaiting_ops').length;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['partners', partnerId, 'agreements'] });
    queryClient.invalidateQueries({ queryKey: ['partner-supplier-onboarding'] });
    queryClient.invalidateQueries({ queryKey: ['partner-onboarding'] });
    queryClient.invalidateQueries({ queryKey: ['supplier-onboarding'] });
  };

  const approveMutation = useMutation({
    mutationFn: async (items: PartnerAgreement[]) => {
      const toAccept = items.filter(canAcceptAgreement);
      if (toAccept.length === 0) {
        throw new Error(
          'Only partner-signed agreements awaiting operations can be accepted. Already accepted or rejected items were skipped.'
        );
      }
      if (!supplierId) {
        throw new Error('Supplier context is required to countersign agreements.');
      }
      for (const agreement of toAccept) {
        await onboardingApi.countersignSupplierAgreement(supplierId, agreement.agreementId);
      }
      return toAccept.length;
    },
    onSuccess: (count) => {
      toast({ title: `Accepted ${count} agreement(s)` });
      selection.clear();
      invalidate();
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : 'Could not accept agreements';
      toast({ title: 'Accept failed', description: message, variant: 'destructive' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ ids, notes }: { ids: string[]; notes?: string }) => {
      await Promise.all(
        ids.map((id) =>
          partnerApi.updateAgreementStatus(partnerId, id, {
            status: 'cancelled',
            notes: notes || undefined,
          })
        )
      );
    },
    onSuccess: (_, { ids }) => {
      toast({ title: `Rejected ${ids.length} agreement(s)` });
      selection.clear();
      setRejectOpen(false);
      setRejectNotes('');
      invalidate();
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast({
        title: 'Reject failed',
        description: err?.response?.data?.message,
        variant: 'destructive',
      });
    },
  });

  const selectedItems = selectable.filter((a) => selection.isSelected(a.id));

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading agreements…
      </p>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Could not load agreements.</AlertDescription>
      </Alert>
    );
  }

  if (agreements.length === 0) {
    return (
      <Alert>
        <AlertDescription>No agreements on file. Issue an agreement or ask the partner to sign.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="outline">{agreements.length} agreement(s)</Badge>
        {hasCountersignedAgreement(agreements) ? (
          <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
            {acceptedCount} accepted by operations
          </Badge>
        ) : (
          <Badge variant="secondary">None accepted yet</Badge>
        )}
        {awaitingOpsCount > 0 && (
          <Badge variant="outline">{awaitingOpsCount} awaiting accept</Badge>
        )}
        {rejectedCount > 0 && (
          <Badge variant="destructive">{rejectedCount} rejected</Badge>
        )}
      </div>

      {rejectedCount > 0 && !hasCountersignedAgreement(agreements) && (
        <Alert variant="destructive">
          <AlertDescription>
            Rejected agreements do not count toward stage completion. Accept at least one signed
            agreement, then approve the stage.
          </AlertDescription>
        </Alert>
      )}

      <AdminBulkReviewToolbar
        totalCount={agreements.length}
        selectedCount={selection.selectedCount}
        allSelected={selection.allSelected}
        onSelectAllChange={(checked) => (checked ? selection.selectAll() : selection.clear())}
        onApproveSelected={() => {
          const items = agreements.filter((a) => selection.selectedIds.includes(a.agreementId));
          approveMutation.mutate(items);
        }}
        onRejectSelected={() => setRejectOpen(true)}
        approvePending={approveMutation.isPending}
        rejectPending={rejectMutation.isPending}
        approveLabel="Accept selected"
        rejectLabel="Reject selected"
      />

      <ul className="space-y-2 max-h-[280px] overflow-y-auto">
        {agreements.map((agreement) => {
          const reviewStatus = getAgreementReviewStatus(agreement);
          return (
            <li
              key={agreement.agreementId}
              className={`flex gap-3 rounded-md border bg-background p-3 text-sm items-start ${
                reviewStatus === 'rejected' ? 'border-red-200 bg-red-50/40' : ''
              }`}
            >
              <Checkbox
                className="mt-0.5"
                checked={selection.isSelected(agreement.agreementId)}
                onCheckedChange={() => selection.toggle(agreement.agreementId)}
                aria-label={`Select ${agreement.title}`}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{agreement.title}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {agreement.agreementNumber} · {agreement.agreementType.replace(/_/g, ' ')}
                </p>
                <Badge
                  variant={reviewStatus === 'rejected' ? 'destructive' : 'outline'}
                  className="mt-2 font-normal"
                >
                  {AGREEMENT_STATUS_LABELS[reviewStatus]}
                </Badge>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {canAcceptAgreement(agreement) && supplierId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate([agreement])}
                  >
                    Accept
                  </Button>
                )}
                {reviewStatus !== 'rejected' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-destructive"
                    disabled={rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate({ ids: [agreement.agreementId] })}
                  >
                    Reject
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">
        Accept the agreement version that meets your terms; reject others. Stage approval requires at
        least one agreement <strong>accepted by operations</strong> (countersigned) — partner-signed-only
        or rejected agreements do not complete the step.
      </p>

      <RejectNotesDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        itemCount={selectedItems.length}
        notes={rejectNotes}
        onNotesChange={setRejectNotes}
        pending={rejectMutation.isPending}
        onConfirm={() =>
          rejectMutation.mutate({ ids: selection.selectedIds, notes: rejectNotes.trim() || undefined })
        }
      />
    </div>
  );
}
