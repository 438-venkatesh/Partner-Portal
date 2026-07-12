import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { bulkAdminActionsApi } from '@/lib/api/adminGovernance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormSelect, FormTextarea } from '@/components/ui/form-field';
import { SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/lib/hooks/use-toast';

function parseIds(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function BulkActionsPanel() {
  const { toast } = useToast();
  const [partnerIdsRaw, setPartnerIdsRaw] = useState('');
  const [partnerAction, setPartnerAction] = useState<'approve' | 'suspend' | 'reactivate'>('approve');
  const [partnerResults, setPartnerResults] = useState<{ partnerId: string; ok: boolean; message?: string }[] | null>(
    null
  );

  const [documentIdsRaw, setDocumentIdsRaw] = useState('');
  const [documentVerified, setDocumentVerified] = useState<'true' | 'false'>('true');
  const [documentResults, setDocumentResults] = useState<{ documentId: string; ok: boolean; message?: string }[] | null>(
    null
  );

  const partnerMutation = useMutation({
    mutationFn: () => bulkAdminActionsApi.bulkPartnerAction({ partnerIds: parseIds(partnerIdsRaw), action: partnerAction }),
    onSuccess: (data) => {
      setPartnerResults(data.results);
      toast({ title: `Processed ${data.results.length} partner(s)` });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const documentMutation = useMutation({
    mutationFn: () =>
      bulkAdminActionsApi.bulkVerifyDocuments({
        documentIds: parseIds(documentIdsRaw),
        verified: documentVerified === 'true',
      }),
    onSuccess: (data) => {
      setDocumentResults(data.results);
      toast({ title: `Processed ${data.results.length} document(s)` });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk partner action</CardTitle>
          <CardDescription>Paste partner IDs (one per line, or comma-separated) to approve, suspend, or reactivate in bulk.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <FormTextarea
              label="Partner IDs"
              rows={4}
              value={partnerIdsRaw}
              onChange={(e) => setPartnerIdsRaw(e.target.value)}
              className="md:col-span-2"
            />
            <FormSelect label="Action" value={partnerAction} onValueChange={(v) => setPartnerAction(v as any)}>
              <SelectItem value="approve">Approve</SelectItem>
              <SelectItem value="suspend">Suspend</SelectItem>
              <SelectItem value="reactivate">Reactivate</SelectItem>
            </FormSelect>
          </div>
          <Button
            disabled={parseIds(partnerIdsRaw).length === 0 || partnerMutation.isPending}
            onClick={() => partnerMutation.mutate()}
          >
            Run on {parseIds(partnerIdsRaw).length} partner(s)
          </Button>
          {partnerResults && (
            <div className="flex flex-wrap gap-2 pt-2">
              {partnerResults.map((r) => (
                <Badge key={r.partnerId} variant={r.ok ? 'default' : 'destructive'} title={r.message}>
                  {r.partnerId.slice(0, 8)}… {r.ok ? 'ok' : 'failed'}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bulk document verification</CardTitle>
          <CardDescription>Paste document IDs to verify or reject in bulk.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <FormTextarea
              label="Document IDs"
              rows={4}
              value={documentIdsRaw}
              onChange={(e) => setDocumentIdsRaw(e.target.value)}
              className="md:col-span-2"
            />
            <FormSelect label="Outcome" value={documentVerified} onValueChange={(v) => setDocumentVerified(v as any)}>
              <SelectItem value="true">Verify</SelectItem>
              <SelectItem value="false">Reject</SelectItem>
            </FormSelect>
          </div>
          <Button
            disabled={parseIds(documentIdsRaw).length === 0 || documentMutation.isPending}
            onClick={() => documentMutation.mutate()}
          >
            Run on {parseIds(documentIdsRaw).length} document(s)
          </Button>
          {documentResults && (
            <div className="flex flex-wrap gap-2 pt-2">
              {documentResults.map((r) => (
                <Badge key={r.documentId} variant={r.ok ? 'default' : 'destructive'} title={r.message}>
                  {r.documentId.slice(0, 8)}… {r.ok ? 'ok' : 'failed'}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
