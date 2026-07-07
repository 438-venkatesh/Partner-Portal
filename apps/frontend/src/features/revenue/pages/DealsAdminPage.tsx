import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dealsApi, type Deal } from '@/lib/api/deals';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FormTextarea, FormInput } from '@/components/ui/form-field';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/lib/hooks/use-toast';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'> = {
  pending_review: 'warning',
  approved: 'secondary',
  won: 'success',
  lost: 'destructive',
  rejected: 'destructive',
  expired: 'outline',
};

export function DealsAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectDeal, setRejectDeal] = useState<Deal | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [resolveDeal, setResolveDeal] = useState<Deal | null>(null);
  const [actualValue, setActualValue] = useState('');

  const { data: deals, isLoading } = useQuery({ queryKey: ['deals'], queryFn: () => dealsApi.listAll() });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['deals'] });

  const approveMutation = useMutation({
    mutationFn: (dealId: string) => dealsApi.review(dealId, true),
    onSuccess: () => {
      toast({ title: 'Deal approved' });
      invalidate();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => dealsApi.review(rejectDeal!.dealId, false, rejectionReason),
    onSuccess: () => {
      toast({ title: 'Deal rejected' });
      invalidate();
      setRejectDeal(null);
      setRejectionReason('');
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (outcome: 'won' | 'lost') =>
      dealsApi.resolve(resolveDeal!.dealId, outcome, actualValue ? Number(actualValue) : undefined),
    onSuccess: (_, outcome) => {
      toast({ title: outcome === 'won' ? 'Deal marked won — commission is calculating' : 'Deal marked lost' });
      invalidate();
      setResolveDeal(null);
      setActualValue('');
    },
  });

  return (
    <div className="space-y-4">
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : !deals || deals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deals registered yet.</p>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3">Deal</th>
                  <th className="p-3">Partner</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Value</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Protected until</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.dealId} className="border-b last:border-0">
                    <td className="p-3 font-medium">{deal.dealName}</td>
                    <td className="p-3">{deal.partnerName}</td>
                    <td className="p-3">{deal.customerName}</td>
                    <td className="p-3">
                      {deal.currency} {deal.actualValue ?? deal.estimatedValue ?? '—'}
                    </td>
                    <td className="p-3">
                      <Badge variant={STATUS_VARIANT[deal.status] ?? 'outline'}>{deal.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {deal.protectionExpiresAt ? new Date(deal.protectionExpiresAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="flex gap-2 p-3">
                      {deal.status === 'pending_review' && (
                        <>
                          <Button size="sm" onClick={() => approveMutation.mutate(deal.dealId)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRejectDeal(deal)}>
                            Reject
                          </Button>
                        </>
                      )}
                      {deal.status === 'approved' && (
                        <Button size="sm" onClick={() => setResolveDeal(deal)}>
                          Mark won/lost
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!rejectDeal} onOpenChange={(open) => !open && setRejectDeal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject deal: {rejectDeal?.dealName}</DialogTitle>
          </DialogHeader>
          <FormTextarea
            label="Reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDeal(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resolveDeal} onOpenChange={(open) => !open && setResolveDeal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve deal: {resolveDeal?.dealName}</DialogTitle>
          </DialogHeader>
          <FormInput
            label="Actual value (optional — defaults to estimated value)"
            type="number"
            value={actualValue}
            onChange={(e) => setActualValue(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDeal(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => resolveMutation.mutate('lost')}>
              Mark lost
            </Button>
            <Button onClick={() => resolveMutation.mutate('won')}>Mark won</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
