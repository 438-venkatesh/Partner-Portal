import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mdfApi } from '@/lib/api/mdf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormInput, FormTextarea } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/lib/hooks/use-toast';
import { Plus } from 'lucide-react';

function FundsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [roiFundId, setRoiFundId] = useState<string | null>(null);

  const { data: funds, isLoading } = useQuery({ queryKey: ['mdf-funds'], queryFn: mdfApi.listFunds });
  const { data: roi } = useQuery({
    queryKey: ['mdf-funds', roiFundId, 'roi'],
    queryFn: () => mdfApi.getFundRoi(roiFundId!),
    enabled: !!roiFundId,
  });

  const createMutation = useMutation({
    mutationFn: () => mdfApi.createFund({ name, totalBudget: Number(totalBudget) }),
    onSuccess: () => {
      toast({ title: 'Fund created' });
      queryClient.invalidateQueries({ queryKey: ['mdf-funds'] });
      setCreating(false);
      setName('');
      setTotalBudget('');
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>MDF funds</CardTitle>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New fund
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {creating && (
          <div className="grid grid-cols-3 gap-3 rounded-md border p-3">
            <FormInput label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <FormInput label="Total budget" type="number" value={totalBudget} onChange={(e) => setTotalBudget(e.target.value)} />
            <div className="flex items-end">
              <Button disabled={!name.trim() || !totalBudget || createMutation.isPending} onClick={() => createMutation.mutate()}>
                Create
              </Button>
            </div>
          </div>
        )}
        {isLoading ? (
          <Skeleton className="h-24" />
        ) : (
          (funds ?? []).map((fund) => (
            <div key={fund.fundId} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{fund.name}</p>
                <p className="text-muted-foreground">
                  {fund.remainingBudget} / {fund.totalBudget} remaining
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setRoiFundId(fund.fundId)}>
                View ROI
              </Button>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={!!roiFundId} onOpenChange={(open) => !open && setRoiFundId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fund ROI</DialogTitle>
          </DialogHeader>
          {roi && (
            <div className="space-y-2 text-sm">
              <p>Total spent: {roi.totalSpent}</p>
              <p>Revenue from linked won deals: {roi.revenue}</p>
              <p>Deals linked: {roi.dealsLinked} ({roi.dealsWon} won)</p>
              <p className="text-lg font-semibold">ROI: {roi.roi !== null ? `${roi.roi}x` : 'No spend yet'}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function RequestsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: requests, isLoading } = useQuery({ queryKey: ['mdf-requests'], queryFn: () => mdfApi.listRequests() });

  const approveMutation = useMutation({
    mutationFn: (requestId: string) => mdfApi.review(requestId, true),
    onSuccess: () => {
      toast({ title: 'Request approved' });
      queryClient.invalidateQueries({ queryKey: ['mdf-requests'] });
      queryClient.invalidateQueries({ queryKey: ['mdf-funds'] });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.response?.data?.message, variant: 'destructive' }),
  });

  const rejectMutation = useMutation({
    mutationFn: () => mdfApi.review(rejectId!, false, undefined, rejectionReason),
    onSuccess: () => {
      toast({ title: 'Request rejected' });
      queryClient.invalidateQueries({ queryKey: ['mdf-requests'] });
      setRejectId(null);
      setRejectionReason('');
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: mdfApi.markPaid,
    onSuccess: () => {
      toast({ title: 'Marked as paid' });
      queryClient.invalidateQueries({ queryKey: ['mdf-requests'] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>MDF requests</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : (requests ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Campaign</th>
                <th className="p-2">Partner</th>
                <th className="p-2">Fund</th>
                <th className="p-2">Requested</th>
                <th className="p-2">Status</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {(requests ?? []).map((r) => (
                <tr key={r.requestId} className="border-b last:border-0">
                  <td className="p-2">{r.campaignName}</td>
                  <td className="p-2">{r.partnerName}</td>
                  <td className="p-2">{r.fundName}</td>
                  <td className="p-2">{r.requestedAmount}</td>
                  <td className="p-2">
                    <Badge variant="outline" className="capitalize">
                      {r.status}
                    </Badge>
                  </td>
                  <td className="flex gap-2 p-2">
                    {r.status === 'submitted' && (
                      <>
                        <Button size="sm" onClick={() => approveMutation.mutate(r.requestId)}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRejectId(r.requestId)}>
                          Reject
                        </Button>
                      </>
                    )}
                    {r.status === 'claimed' && (
                      <Button size="sm" onClick={() => markPaidMutation.mutate(r.requestId)}>
                        Mark paid
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>

      <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject MDF request</DialogTitle>
          </DialogHeader>
          <FormTextarea label="Reason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => rejectMutation.mutate()}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function MdfAdminPage() {
  return (
    <div className="space-y-6">
      <FundsPanel />
      <RequestsPanel />
    </div>
  );
}
