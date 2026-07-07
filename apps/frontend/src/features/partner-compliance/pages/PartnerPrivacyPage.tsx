import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dataPrivacyApi } from '@/lib/api/dataPrivacy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormTextarea } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/lib/hooks/use-toast';
import { Download } from 'lucide-react';

export function PartnerPrivacyPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [requesting, setRequesting] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['my-erasure-requests'],
    queryFn: dataPrivacyApi.listMyErasureRequests,
  });

  const exportMutation = useMutation({
    mutationFn: dataPrivacyApi.exportMyData,
    onSuccess: (bundle) => {
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'partner-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export downloaded' });
    },
    onError: () => toast({ title: 'Error', description: 'Could not export your data.', variant: 'destructive' }),
  });

  const requestMutation = useMutation({
    mutationFn: () => dataPrivacyApi.requestErasure(reason || undefined),
    onSuccess: () => {
      toast({ title: 'Erasure request submitted' });
      queryClient.invalidateQueries({ queryKey: ['my-erasure-requests'] });
      setRequesting(false);
      setReason('');
    },
  });

  const hasPending = (requests ?? []).some((r) => r.status === 'pending');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Privacy</h1>
        <p className="text-muted-foreground">Export your data, or request that it be erased.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export my data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Download a JSON file containing your organization's profile, documents, agreements, deals,
            leads, commissions, and rewards history.
          </p>
          <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
            <Download className="mr-2 h-4 w-4" />
            Download my data
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request erasure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Submitting a request asks an administrator to permanently anonymize your organization's
            identifying information. Financial and audit records are kept for compliance reasons.
          </p>
          {isLoading ? (
            <Skeleton className="h-16" />
          ) : (
            (requests ?? []).map((r) => (
              <div key={r.requestId} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <p>{r.reason || 'No reason given'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <Badge
                  variant={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'destructive' : 'outline'}
                  className="capitalize"
                >
                  {r.status}
                </Badge>
              </div>
            ))
          )}
          {requesting ? (
            <div className="space-y-2 rounded-md border p-3">
              <FormTextarea label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
              <div className="flex gap-2">
                <Button variant="destructive" disabled={requestMutation.isPending} onClick={() => requestMutation.mutate()}>
                  Submit request
                </Button>
                <Button variant="outline" onClick={() => setRequesting(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" disabled={hasPending} onClick={() => setRequesting(true)}>
              {hasPending ? 'Request pending review' : 'Request erasure'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
