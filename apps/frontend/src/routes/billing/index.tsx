import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billingAdminApi } from '@/lib/api/billing';
import { partnerApi } from '@/lib/api/partners';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

export const Route = createFileRoute('/billing/')({
  component: BillingAdminPage,
});

function BillingAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [partnerId, setPartnerId] = useState<string>('');
  const [planId, setPlanId] = useState<string>('');

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

  const assignMutation = useMutation({
    mutationFn: () => billingAdminApi.assignSubscription(partnerId, planId),
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
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-muted-foreground text-sm">
          View catalog plans and assign a subscription to a partner (Operations).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plans</CardTitle>
          <CardDescription>Plans available for assignment.</CardDescription>
        </CardHeader>
        <CardContent>
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
