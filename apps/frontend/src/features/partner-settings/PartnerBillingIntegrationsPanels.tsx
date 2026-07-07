import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { partnerBillingApi } from '@/lib/api/partnerBilling';
import { partnerApiKeysApi } from '@/lib/api/partnerApiKeys';
import { partnerWebhooksApi } from '@/lib/api/partnerWebhooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormInput } from '@/components/ui/form-field';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/lib/hooks/use-toast';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const WEBHOOK_EVENT_OPTIONS = [
  { id: 'invoice.paid', label: 'invoice.paid' },
  { id: 'agreement.signed', label: 'agreement.signed' },
  { id: 'partner.updated', label: 'partner.updated' },
  { id: 'test', label: 'test' },
];

export function SubscriptionSettingsPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['partner-billing-subscription'],
    queryFn: () => partnerBillingApi.getSubscription(),
  });
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['partner-billing-invoices'],
    queryFn: () => partnerBillingApi.listInvoices(),
  });

  const sub = data?.subscription;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Current billing plan for your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && (
            <p className="text-sm text-destructive">Could not load subscription.</p>
          )}
          {!isLoading && !error && !sub && (
            <p className="text-sm text-muted-foreground">No subscription assigned yet.</p>
          )}
          {!isLoading && !error && sub && (
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge variant="outline">{sub.status}</Badge>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Billing cycle</dt>
                <dd>{sub.billingCycle}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Plan ID</dt>
                <dd className="font-mono text-xs break-all">{sub.planId}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Amounts due for your subscription each billing period.</CardDescription>
        </CardHeader>
        <CardContent>
          {invoicesLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!invoicesLoading && (invoices ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          )}
          {!invoicesLoading && (invoices ?? []).length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoices ?? []).map((inv) => (
                  <TableRow key={inv.invoiceId}>
                    <TableCell>{inv.planName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {inv.periodStart} – {inv.periodEnd}
                    </TableCell>
                    <TableCell>
                      {(inv.amountCents / 100).toFixed(2)} {inv.currency}
                    </TableCell>
                    <TableCell className="text-xs">{inv.dueDate}</TableCell>
                    <TableCell>
                      <Badge variant={inv.status === 'paid' ? 'success' : 'outline'} className="capitalize">
                        {inv.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ApiKeysSettingsPanel({ canManage }: { canManage: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['partner-api-keys'],
    queryFn: () => partnerApiKeysApi.list(),
    enabled: canManage,
  });

  const createMutation = useMutation({
    mutationFn: () => partnerApiKeysApi.create(),
    onSuccess: (res) => {
      setNewKey(res.rawKey);
      toast({
        title: 'API key created',
        description: 'Copy the key now — it will not be shown again.',
      });
      queryClient.invalidateQueries({ queryKey: ['partner-api-keys'] });
    },
    onError: (e: any) => {
      toast({
        title: 'Failed',
        description: e?.message ?? 'Could not create key',
        variant: 'destructive',
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) => partnerApiKeysApi.revoke(keyId),
    onSuccess: () => {
      toast({ title: 'Key revoked' });
      queryClient.invalidateQueries({ queryKey: ['partner-api-keys'] });
    },
    onError: (e: any) => {
      toast({
        title: 'Revoke failed',
        description: e?.message ?? 'Could not revoke',
        variant: 'destructive',
      });
    },
  });

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API keys</CardTitle>
          <CardDescription>Partner admins can create and revoke API keys.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You need the <strong>admin</strong> role to manage API keys.
          </p>
        </CardContent>
      </Card>
    );
  }

  const keys = data?.keys ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle>API keys</CardTitle>
          <CardDescription>Create keys for server-to-server access. Store secrets securely.</CardDescription>
        </div>
        <Button type="button" size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Creating…' : 'New key'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {newKey && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="font-medium text-amber-900 mb-1">New key (copy now)</p>
            <code className="block break-all text-xs">{newKey}</code>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setNewKey(null)}>
              Dismiss
            </Button>
          </div>
        )}
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Could not load keys.</p>}
        {!isLoading && !error && keys.length === 0 && (
          <p className="text-sm text-muted-foreground">No API keys yet.</p>
        )}
        {!isLoading && !error && keys.length > 0 && (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.keyId}>
                    <TableCell className="font-mono text-sm">{k.keyPrefix}…</TableCell>
                    <TableCell>{k.isActive ? 'Yes' : 'No'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {k.createdAt ? new Date(k.createdAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {k.isActive && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={revokeMutation.isPending}
                          onClick={() => {
                            if (window.confirm('Revoke this API key?')) revokeMutation.mutate(k.keyId);
                          }}
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function WebhooksSettingsPanel({ canManage }: { canManage: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['test']);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['partner-webhooks'],
    queryFn: () => partnerWebhooksApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => partnerWebhooksApi.create({ url: url.trim(), events }),
    onSuccess: (res) => {
      setNewSecret(res.secret);
      setUrl('');
      toast({ title: 'Webhook created', description: 'Copy the signing secret now.' });
      queryClient.invalidateQueries({ queryKey: ['partner-webhooks'] });
    },
    onError: (e: any) => {
      toast({
        title: 'Create failed',
        description: e?.message ?? 'Could not create webhook',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => partnerWebhooksApi.delete(id),
    onSuccess: () => {
      toast({ title: 'Webhook removed' });
      queryClient.invalidateQueries({ queryKey: ['partner-webhooks'] });
    },
    onError: (e: any) => {
      toast({
        title: 'Delete failed',
        description: e?.message ?? 'Could not delete',
        variant: 'destructive',
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => partnerWebhooksApi.test(id),
    onSuccess: () => toast({ title: 'Test dispatched' }),
    onError: (e: any) => {
      toast({
        title: 'Test failed',
        description: e?.message ?? 'Dispatch failed',
        variant: 'destructive',
      });
    },
  });

  const toggleEvent = (id: string, checked: boolean) => {
    setEvents((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((e) => e !== id);
    });
  };

  const hooks = data?.webhooks ?? [];

  return (
    <div className="space-y-6">
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Add webhook</CardTitle>
            <CardDescription>HTTPS endpoint that receives signed payloads for selected events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-xl">
            <FormInput
              label="URL"
              required
              type="url"
              placeholder="https://example.com/webhooks/partner"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <div className="space-y-2">
              <span className="text-sm font-medium">Events</span>
              <div className="flex flex-col gap-2">
                {WEBHOOK_EVENT_OPTIONS.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={events.includes(opt.id)}
                      onCheckedChange={(c) => toggleEvent(opt.id, c === true)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            {newSecret && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="font-medium text-amber-900 mb-1">Signing secret</p>
                <code className="block break-all text-xs">{newSecret}</code>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setNewSecret(null)}>
                  Dismiss
                </Button>
              </div>
            )}
            <Button
              type="button"
              disabled={createMutation.isPending || !url.trim() || events.length === 0}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Creating…' : 'Create webhook'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>
            {canManage
              ? 'Manage outbound notifications.'
              : 'View configured webhooks. Admins can add or remove endpoints.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && <p className="text-sm text-destructive">Could not load webhooks.</p>}
          {!isLoading && !error && hooks.length === 0 && (
            <p className="text-sm text-muted-foreground">No webhooks configured.</p>
          )}
          {!isLoading && !error && hooks.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hooks.map((h) => (
                    <TableRow key={h.webhookId}>
                      <TableCell className="max-w-xs truncate text-sm">{h.url}</TableCell>
                      <TableCell className="text-xs">
                        {(h.events ?? []).join(', ') || '—'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {canManage && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={testMutation.isPending}
                              onClick={() => testMutation.mutate(h.webhookId)}
                            >
                              Test
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={deleteMutation.isPending}
                              onClick={() => {
                                if (window.confirm('Delete this webhook?')) deleteMutation.mutate(h.webhookId);
                              }}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
