import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mdfApi } from '@/lib/api/mdf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormInput, FormTextarea, FormSelect } from '@/components/ui/form-field';
import { SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/lib/hooks/use-toast';
import { Plus } from 'lucide-react';

export function PartnerMdfPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [fundId, setFundId] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [description, setDescription] = useState('');

  const { data: funds } = useQuery({ queryKey: ['my-mdf-funds'], queryFn: mdfApi.listFundsMine });
  const { data: requests, isLoading } = useQuery({ queryKey: ['my-mdf-requests'], queryFn: mdfApi.listRequestsMine });

  const submitMutation = useMutation({
    mutationFn: () =>
      mdfApi.submitRequest({
        fundId,
        campaignName,
        requestedAmount: Number(requestedAmount),
        description: description || undefined,
      }),
    onSuccess: () => {
      toast({ title: 'MDF request submitted' });
      queryClient.invalidateQueries({ queryKey: ['my-mdf-requests'] });
      setOpen(false);
      setCampaignName('');
      setRequestedAmount('');
      setDescription('');
    },
  });

  const claimMutation = useMutation({
    mutationFn: (requestId: string) => mdfApi.claim(requestId),
    onSuccess: () => {
      toast({ title: 'Claim submitted' });
      queryClient.invalidateQueries({ queryKey: ['my-mdf-requests'] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Request MDF
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : !requests || requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No MDF requests yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {requests.map((r) => (
            <Card key={r.requestId}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{r.campaignName}</CardTitle>
                <Badge variant="outline" className="capitalize">
                  {r.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Requested: {r.requestedAmount}</p>
                {r.approvedAmount && <p>Approved: {r.approvedAmount}</p>}
                {r.status === 'approved' && (
                  <Button size="sm" onClick={() => claimMutation.mutate(r.requestId)}>
                    Submit claim
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request market development funds</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormSelect label="Fund" value={fundId} onValueChange={setFundId} placeholder="Select a fund…">
              {(funds ?? []).map((f) => (
                <SelectItem key={f.fundId} value={f.fundId}>
                  {f.name} ({f.remainingBudget} remaining)
                </SelectItem>
              ))}
            </FormSelect>
            <FormInput label="Campaign name" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
            <FormInput
              label="Requested amount"
              type="number"
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(e.target.value)}
            />
            <FormTextarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!fundId || !campaignName.trim() || !requestedAmount || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
