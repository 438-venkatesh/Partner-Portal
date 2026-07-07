import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billingAdminApi } from '@/lib/api/billing';
import { partnerApi } from '@/lib/api/partners';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormInput } from '@/components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/lib/hooks/use-toast';
import { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus } from 'lucide-react';

export const Route = createFileRoute('/billing/')({
  component: BillingAdminPage,
});

function PlansPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [partnerId, setPartnerId] = useState<string>('');
  const [planId, setPlanId] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ planName: '', priceCents: '', currency: 'USD' });

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: () => billingAdminApi.listPlans(),
  });

  const { data: partnersData, isLoading: partnersLoading } = useQuery({
    queryKey: ['partners', 'billing-picker'],
    queryFn: () => partnerApi.getAll({ limit: 100, page: 1 }),
  });

  const plans = plansData?.plans ?? [];
  const partners = useMemo(() => partnersData?.partners ?? [], [partnersData]);

  const createPlanMutation = useMutation({
    mutationFn: () =>
      billingAdminApi.createPlan({
        planName: form.planName,
        priceCents: Math.round(Number(form.priceCents) * 100),
        currency: form.currency,
      }),
    onSuccess: () => {
      toast({ title: 'Plan created' });
      queryClient.invalidateQueries({ queryKey: ['billing', 'plans'] });
      setCreating(false);
      setForm({ planName: '', priceCents: '', currency: 'USD' });
    },
  });

  const assignMutation = useMutation({
    mutationFn: () => billingAdminApi.assignSubscription(partnerId, planId, billingCycle),
    onSuccess: () => {
      toast({ title: 'Subscription assigned', description: 'Plan is now linked to the partner.' });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      setPlanId('');
    },
    onError: (e: any) => {
      toast({
        title: 'Assignment failed',
        description: e?.message ?? 'Could not assign plan',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Plans</CardTitle>
            <CardDescription>Plans available for assignment.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New plan
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {creating && (
            <div className="grid grid-cols-3 gap-3 rounded-md border p-3">
              <FormInput label="Plan name" value={form.planName} onChange={(e) => setForm({ ...form, planName: e.target.value })} />
              <FormInput
                label="Price"
                type="number"
                step="0.01"
                value={form.priceCents}
                onChange={(e) => setForm({ ...form, priceCents: e.target.value })}
              />
              <FormInput label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
              <div className="col-span-3 flex gap-2">
                <Button
                  disabled={!form.planName.trim() || !form.priceCents || createPlanMutation.isPending}
                  onClick={() => createPlanMutation.mutate()}
                >
                  Create
                </Button>
                <Button variant="outline" onClick={() => setCreating(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {plansLoading && <p className="text-sm text-muted-foreground">Loading plans…</p>}
          {!plansLoading && plans.length === 0 && (
            <p className="text-sm text-muted-foreground">No billing plans in the database.</p>
          )}
          {!plansLoading && plans.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Plan ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((p) => (
                    <TableRow key={p.planId}>
                      <TableCell className="font-medium">{p.planName}</TableCell>
                      <TableCell>
                        {(p.priceCents / 100).toFixed(2)} {p.currency}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.planId}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign subscription</CardTitle>
          <CardDescription>
            Creates an active subscription row for the selected partner and plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <span className="text-sm font-medium">Partner</span>
            <Select
              value={partnerId || undefined}
              onValueChange={setPartnerId}
              disabled={partnersLoading || partners.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={partnersLoading ? 'Loading…' : 'Select partner'} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {partners.map((p) => (
                  <SelectItem key={p.partnerId} value={p.partnerId}>
                    {p.partnerName}{' '}
                    <span className="text-muted-foreground">({p.partnerCode})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">Plan</span>
            <Select value={planId || undefined} onValueChange={setPlanId} disabled={plans.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.planId} value={p.planId}>
                    {p.planName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">Billing cycle</span>
            <Select value={billingCycle} onValueChange={setBillingCycle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            disabled={!partnerId || !planId || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
          >
            {assignMutation.isPending ? 'Assigning…' : 'Assign plan'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function InvoicesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: () => billingAdminApi.listInvoices(),
  });

  const runCycleMutation = useMutation({
    mutationFn: () => billingAdminApi.runBillingCycle(),
    onSuccess: (result) => {
      toast({ title: `Billing cycle run: ${result.generated} invoice(s) generated` });
      queryClient.invalidateQueries({ queryKey: ['billing', 'invoices'] });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (invoiceId: string) => billingAdminApi.markInvoicePaid(invoiceId),
    onSuccess: () => {
      toast({ title: 'Invoice marked paid' });
      queryClient.invalidateQueries({ queryKey: ['billing', 'invoices'] });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            No payment gateway is wired up — mark an invoice paid once payment is confirmed
            externally, same as the commission payout flow.
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => runCycleMutation.mutate()} disabled={runCycleMutation.isPending}>
          Run billing cycle now
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (invoices ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices generated yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invoices ?? []).map(({ invoice, partnerName }) => (
                <TableRow key={invoice.invoiceId}>
                  <TableCell>{partnerName}</TableCell>
                  <TableCell>{invoice.planName}</TableCell>
                  <TableCell>
                    {(invoice.amountCents / 100).toFixed(2)} {invoice.currency}
                  </TableCell>
                  <TableCell className="text-xs">{invoice.dueDate}</TableCell>
                  <TableCell>
                    <Badge variant={invoice.status === 'paid' ? 'success' : 'outline'} className="capitalize">
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {invoice.status === 'unpaid' && (
                      <Button size="sm" onClick={() => markPaidMutation.mutate(invoice.invoiceId)}>
                        Mark paid
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function BillingAdminPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-muted-foreground text-sm">
          Plan catalog, subscription assignment, and partner invoices (Operations).
        </p>
      </div>

      <PlansPanel />
      <InvoicesPanel />
    </div>
  );
}
