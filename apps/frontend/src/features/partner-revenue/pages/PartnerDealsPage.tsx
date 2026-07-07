import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dealsApi } from '@/lib/api/deals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormInput, FormTextarea } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/lib/hooks/use-toast';
import { Plus } from 'lucide-react';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'> = {
  pending_review: 'warning',
  approved: 'secondary',
  won: 'success',
  lost: 'destructive',
  rejected: 'destructive',
  expired: 'outline',
};

export function PartnerDealsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [dealName, setDealName] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [notes, setNotes] = useState('');

  const { data: deals, isLoading } = useQuery({ queryKey: ['my-deals'], queryFn: dealsApi.listMine });

  const registerMutation = useMutation({
    mutationFn: () =>
      dealsApi.register({
        customerName,
        dealName,
        estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
        notes: notes || undefined,
      }),
    onSuccess: (result) => {
      toast({
        title: 'Deal registered',
        description:
          result.conflicts.length > 0
            ? `Heads up: ${result.conflicts.length} other partner(s) already have an active registration for this customer.`
            : 'Awaiting review.',
      });
      queryClient.invalidateQueries({ queryKey: ['my-deals'] });
      setOpen(false);
      setCustomerName('');
      setDealName('');
      setEstimatedValue('');
      setNotes('');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Register a deal
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : !deals || deals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deals registered yet — protect your opportunities early.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {deals.map((deal) => (
            <Card key={deal.dealId}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{deal.dealName}</CardTitle>
                <Badge variant={STATUS_VARIANT[deal.status] ?? 'outline'}>{deal.status.replace('_', ' ')}</Badge>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p>Customer: {deal.customerName}</p>
                <p>
                  Value: {deal.currency} {deal.actualValue ?? deal.estimatedValue ?? '—'}
                </p>
                {deal.protectionExpiresAt && (
                  <p>Protected until {new Date(deal.protectionExpiresAt).toLocaleDateString()}</p>
                )}
                {deal.rejectionReason && <p className="text-destructive">Reason: {deal.rejectionReason}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register a deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormInput label="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <FormInput label="Deal name" value={dealName} onChange={(e) => setDealName(e.target.value)} />
            <FormInput
              label="Estimated value (optional)"
              type="number"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
            />
            <FormTextarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!customerName.trim() || !dealName.trim() || registerMutation.isPending}
              onClick={() => registerMutation.mutate()}
            >
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
