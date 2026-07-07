import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dataPrivacyApi } from '@/lib/api/dataPrivacy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormTextarea } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/lib/hooks/use-toast';

export function ComplianceAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['erasure-requests'],
    queryFn: () => dataPrivacyApi.listAllErasureRequests(),
  });

  const approveMutation = useMutation({
    mutationFn: (requestId: string) => dataPrivacyApi.reviewErasureRequest(requestId, true),
    onSuccess: () => {
      toast({ title: 'Erasure approved — partner data anonymized' });
      queryClient.invalidateQueries({ queryKey: ['erasure-requests'] });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.response?.data?.message, variant: 'destructive' }),
  });

  const rejectMutation = useMutation({
    mutationFn: () => dataPrivacyApi.reviewErasureRequest(rejectId!, false, rejectionReason),
    onSuccess: () => {
      toast({ title: 'Request rejected' });
      queryClient.invalidateQueries({ queryKey: ['erasure-requests'] });
      setRejectId(null);
      setRejectionReason('');
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Compliance</h1>
        <p className="text-sm text-muted-foreground">
          GDPR erasure requests submitted by partners. Approving one immediately anonymizes the
          partner's identifying fields; financial and audit records are left intact, same as the
          scheduled retention-purge job.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Erasure requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32" />
          ) : (requests ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No erasure requests yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2">Partner</th>
                  <th className="p-2">Reason</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Requested</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {(requests ?? []).map(({ request, partnerName }) => (
                  <tr key={request.requestId} className="border-b last:border-0">
                    <td className="p-2">{partnerName}</td>
                    <td className="p-2 text-muted-foreground">{request.reason || '—'}</td>
                    <td className="p-2">
                      <Badge
                        variant={
                          request.status === 'approved'
                            ? 'success'
                            : request.status === 'rejected'
                              ? 'destructive'
                              : 'outline'
                        }
                        className="capitalize"
                      >
                        {request.status}
                      </Badge>
                    </td>
                    <td className="p-2">{new Date(request.createdAt).toLocaleDateString()}</td>
                    <td className="flex gap-2 p-2">
                      {request.status === 'pending' && (
                        <>
                          <Button size="sm" onClick={() => approveMutation.mutate(request.requestId)}>
                            Approve &amp; erase
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRejectId(request.requestId)}>
                            Reject
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject erasure request</DialogTitle>
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
    </div>
  );
}
