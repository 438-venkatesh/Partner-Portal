import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerApi } from '@/lib/api/partners';
import { useToast } from '@/lib/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormTextarea, FormInput } from '@/components/ui/form-field';
import { CheckCircle2, XCircle, AlertTriangle, UserMinus } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PartnerActionsProps {
  partnerId: string;
  currentStatus: string;
  canApprove?: boolean;
  canSuspend?: boolean;
  /** When set for a pending partner, Approve stays disabled until resolved (onboarding / profiles). */
  activationBlockers?: string[];
}

export function PartnerActions({
  partnerId,
  currentStatus,
  canApprove = false,
  canSuspend = false,
  activationBlockers = [],
}: PartnerActionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [offboardDialogOpen, setOffboardDialogOpen] = useState(false);
  const [approveNotes, setApproveNotes] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [offboardReason, setOffboardReason] = useState('');
  const [retentionDays, setRetentionDays] = useState('90');

  const approveMutation = useMutation({
    mutationFn: (notes?: string) => partnerApi.approve(partnerId, true, notes),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Partner approved successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['partners', partnerId] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['partners', partnerId, 'activation-readiness'] });
      setApproveDialogOpen(false);
      setApproveNotes('');
    },
    onError: (error: any) => {
      const blockers = error.response?.data?.blockers as string[] | undefined;
      const msg =
        blockers?.length ? `${error.response?.data?.message || 'Cannot approve'}: ${blockers.join(' ')}` : error.response?.data?.message || 'Failed to approve partner';
      toast({
        title: 'Error',
        description: msg,
        variant: 'destructive',
      });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: () => partnerApi.suspend(partnerId),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Partner suspended successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['partners', partnerId] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      setSuspendDialogOpen(false);
      setSuspendReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to suspend partner',
        variant: 'destructive',
      });
    },
  });

  const offboardMutation = useMutation({
    mutationFn: () =>
      partnerApi.offboard(partnerId, {
        reason: offboardReason || undefined,
        retentionDays: retentionDays ? Number(retentionDays) : undefined,
      }),
    onSuccess: () => {
      toast({
        title: 'Partner offboarded',
        description: `Their data will be permanently purged in ${retentionDays} days.`,
      });
      queryClient.invalidateQueries({ queryKey: ['partners', partnerId] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      setOffboardDialogOpen(false);
      setOffboardReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to offboard partner',
        variant: 'destructive',
      });
    },
  });

  const isPending = currentStatus === 'pending';
  const isActive = currentStatus === 'active';
  const isSuspended = currentStatus === 'suspended';
  const isOffboarded = currentStatus === 'terminated';
  const approvalBlocked = isPending && activationBlockers.length > 0;

  const approvePartnerButton = (
    <Button
      variant="default"
      disabled={approvalBlocked}
      onClick={() => !approvalBlocked && setApproveDialogOpen(true)}
    >
      <CheckCircle2 className="mr-2 h-4 w-4" />
      Approve Partner
    </Button>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center space-x-2">
        {canApprove && isPending && (
          approvalBlocked ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-not-allowed">{approvePartnerButton}</span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm">
                <p className="font-medium">Onboarding not complete</p>
                <ul className="mt-2 list-disc pl-4 text-xs space-y-1">
                  {activationBlockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          ) : (
            approvePartnerButton
          )
        )}
        {canSuspend && isActive && (
          <Button
            variant="destructive"
            onClick={() => setSuspendDialogOpen(true)}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Suspend Partner
          </Button>
        )}
        {canSuspend && isSuspended && (
          <Button
            variant="default"
            onClick={() => setApproveDialogOpen(true)}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Reactivate Partner
          </Button>
        )}
        {canSuspend && !isOffboarded && (isActive || isSuspended) && (
          <Button variant="outline" onClick={() => setOffboardDialogOpen(true)}>
            <UserMinus className="mr-2 h-4 w-4" />
            Offboard Partner
          </Button>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isSuspended ? 'Reactivate Partner' : 'Approve Partner'}
            </DialogTitle>
            <DialogDescription>
              {isSuspended
                ? 'This will reactivate the partner and restore their access.'
                : 'This will approve the partner and activate their account. Onboarding and required checks must already be complete.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormTextarea
              label="Notes (Optional)"
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
              placeholder="Add any notes about this approval"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApproveDialogOpen(false);
                setApproveNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => approveMutation.mutate(approveNotes || undefined)}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending
                ? 'Processing...'
                : isSuspended
                ? 'Reactivate'
                : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Partner</DialogTitle>
            <DialogDescription>
              This will suspend the partner and restrict their access. You can reactivate them later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  Warning: Suspending a Partner
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  This action will immediately restrict the partner's access to the platform.
                  All active service relationships will be paused.
                </p>
              </div>
            </div>
            <FormTextarea
              label="Reason for Suspension (Required)"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Please provide a reason for suspending this partner"
              rows={4}
              required
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSuspendDialogOpen(false);
                setSuspendReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => suspendMutation.mutate()}
              disabled={suspendMutation.isPending || !suspendReason.trim()}
            >
              {suspendMutation.isPending ? 'Suspending...' : 'Suspend Partner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offboard Dialog */}
      <Dialog open={offboardDialogOpen} onOpenChange={setOffboardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Offboard Partner</DialogTitle>
            <DialogDescription>
              This ends the partner relationship. Their personal data is permanently anonymized
              once the retention window below elapses — this cannot be undone after that point.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-700">
                Access is revoked immediately. Financial and audit records are kept regardless of
                the retention setting below — only the partner's identifying information is purged.
              </p>
            </div>
            <FormInput
              label="Retention period (days)"
              type="number"
              min={0}
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
              hint="How long to wait before permanently purging this partner's PII."
            />
            <FormTextarea
              label="Reason (Optional)"
              value={offboardReason}
              onChange={(e) => setOffboardReason(e.target.value)}
              placeholder="Why is this partner being offboarded?"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOffboardDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => offboardMutation.mutate()}
              disabled={offboardMutation.isPending}
            >
              {offboardMutation.isPending ? 'Offboarding...' : 'Offboard Partner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}










