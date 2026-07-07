import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commissionsApi } from '@/lib/api/commissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormInput, FormSelect } from '@/components/ui/form-field';
import { SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/lib/hooks/use-toast';
import { Plus } from 'lucide-react';

function PlansPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [partnerType, setPartnerType] = useState('');

  const { data: plans, isLoading } = useQuery({ queryKey: ['commission-plans'], queryFn: commissionsApi.listPlans });

  const createMutation = useMutation({
    mutationFn: () =>
      commissionsApi.createPlan({ name, rateType: 'percentage', rate: Number(rate), partnerType: partnerType || undefined }),
    onSuccess: () => {
      toast({ title: 'Plan created' });
      queryClient.invalidateQueries({ queryKey: ['commission-plans'] });
      setCreating(false);
      setName('');
      setRate('');
      setPartnerType('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: commissionsApi.deletePlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['commission-plans'] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Commission plans</CardTitle>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New plan
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {creating && (
          <div className="grid grid-cols-4 gap-3 rounded-md border p-3">
            <FormInput label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <FormInput label="Rate (%)" type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
            <FormInput
              label="Partner type (optional)"
              value={partnerType}
              onChange={(e) => setPartnerType(e.target.value)}
            />
            <div className="flex items-end">
              <Button disabled={!name.trim() || !rate || createMutation.isPending} onClick={() => createMutation.mutate()}>
                Create
              </Button>
            </div>
          </div>
        )}
        {isLoading ? (
          <Skeleton className="h-24" />
        ) : (
          (plans ?? []).map((plan) => (
            <div key={plan.planId} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{plan.name}</p>
                <p className="text-muted-foreground">
                  {plan.rateType === 'percentage' ? `${plan.rate}%` : plan.rateType} ·{' '}
                  {plan.partnerType ?? 'Any type'} {plan.minTier ? `· tier ≥ ${plan.minTier}` : ''}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(plan.planId)}>
                Delete
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function PayoutsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reference, setReference] = useState('');

  const { data: records, isLoading } = useQuery({ queryKey: ['commission-records'], queryFn: () => commissionsApi.listRecords() });

  const approveMutation = useMutation({
    mutationFn: commissionsApi.approveRecord,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['commission-records'] }),
  });

  const markPaidMutation = useMutation({
    mutationFn: () => commissionsApi.markPaid([...selected], reference),
    onSuccess: () => {
      toast({ title: `${selected.size} record(s) marked paid` });
      queryClient.invalidateQueries({ queryKey: ['commission-records'] });
      setSelected(new Set());
      setReference('');
    },
  });

  const approvedUnpaid = (records ?? []).filter((r) => r.status === 'approved');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payouts</CardTitle>
        <p className="text-sm text-muted-foreground">
          Approve pending commissions, then batch them into a payout with an external reference — this backend
          tracks disbursement status; it doesn't move money itself.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : (records ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No commission records yet.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2"></th>
                  <th className="p-2">Partner</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Status</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {(records ?? []).map((r) => (
                  <tr key={r.recordId} className="border-b last:border-0">
                    <td className="p-2">
                      {r.status === 'approved' && (
                        <Checkbox
                          checked={selected.has(r.recordId)}
                          onCheckedChange={(checked) => {
                            const next = new Set(selected);
                            if (checked) next.add(r.recordId);
                            else next.delete(r.recordId);
                            setSelected(next);
                          }}
                        />
                      )}
                    </td>
                    <td className="p-2">{r.partnerName}</td>
                    <td className="p-2 capitalize">{r.type.replace('_', ' ')}</td>
                    <td className="p-2">
                      {r.currency} {r.amount}
                    </td>
                    <td className="p-2">
                      <Badge variant={r.status === 'paid' ? 'success' : r.status === 'approved' ? 'secondary' : 'warning'}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="p-2">
                      {r.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(r.recordId)}>
                          Approve
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {approvedUnpaid.length > 0 && (
              <div className="flex items-center gap-3 rounded-md border p-3">
                <FormInput
                  label="Payout reference"
                  placeholder="e.g. wire-2026-04-001"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
                <Button
                  disabled={selected.size === 0 || !reference.trim() || markPaidMutation.isPending}
                  onClick={() => markPaidMutation.mutate()}
                >
                  Mark {selected.size || ''} paid
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ChallengesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [metric, setMetric] = useState<'deals_won' | 'revenue'>('deals_won');
  const [target, setTarget] = useState('');
  const [rewardValue, setRewardValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: challenges, isLoading } = useQuery({ queryKey: ['incentive-challenges'], queryFn: commissionsApi.listChallenges });

  const createMutation = useMutation({
    mutationFn: () =>
      commissionsApi.createChallenge({
        name,
        metric,
        target: Number(target),
        rewardType: 'points',
        rewardValue: Number(rewardValue),
        startDate,
        endDate,
      }),
    onSuccess: () => {
      toast({ title: 'Challenge created' });
      queryClient.invalidateQueries({ queryKey: ['incentive-challenges'] });
      setCreating(false);
      setName('');
      setTarget('');
      setRewardValue('');
      setStartDate('');
      setEndDate('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: commissionsApi.deleteChallenge,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incentive-challenges'] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Incentive challenges</CardTitle>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New challenge
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {creating && (
          <div className="grid grid-cols-3 gap-3 rounded-md border p-3">
            <FormInput label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <FormSelect label="Metric" value={metric} onValueChange={(v) => setMetric(v as 'deals_won' | 'revenue')}>
              <SelectItem value="deals_won">Deals won</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
            </FormSelect>
            <FormInput label="Target" type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
            <FormInput label="Reward points" type="number" value={rewardValue} onChange={(e) => setRewardValue(e.target.value)} />
            <FormInput label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <FormInput label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <div className="flex items-end">
              <Button
                disabled={!name.trim() || !target || !rewardValue || !startDate || !endDate || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Create
              </Button>
            </div>
          </div>
        )}
        {isLoading ? (
          <Skeleton className="h-24" />
        ) : (
          (challenges ?? []).map((c) => (
            <div key={c.challengeId} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-muted-foreground">
                  {c.metric.replace('_', ' ')} ≥ {c.target} → {c.rewardValue} {c.rewardType.replace('_', ' ')} ·{' '}
                  {c.startDate} → {c.endDate}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(c.challengeId)}>
                Delete
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function CommissionsAdminPage() {
  return (
    <div className="space-y-6">
      <PlansPanel />
      <PayoutsPanel />
      <ChallengesPanel />
    </div>
  );
}
