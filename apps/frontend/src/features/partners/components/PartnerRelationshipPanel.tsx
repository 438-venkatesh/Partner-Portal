import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tiersApi } from '@/lib/api/tiers';
import { relationshipApi } from '@/lib/api/relationship';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormInput, FormTextarea } from '@/components/ui/form-field';
import { useToast } from '@/lib/hooks/use-toast';
import { Plus, X, Award, Trash2 } from 'lucide-react';

const HEALTH_BAND_VARIANT: Record<string, 'success' | 'warning' | 'destructive'> = {
  healthy: 'success',
  at_risk: 'warning',
  critical: 'destructive',
};

function HealthScoreCard({ partnerId }: { partnerId: string }) {
  const { data } = useQuery({
    queryKey: ['partners', partnerId, 'health-score'],
    queryFn: () => relationshipApi.getHealthScore(partnerId),
  });
  if (!data) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Health score</CardTitle>
        <Badge variant={HEALTH_BAND_VARIANT[data.band]}>{data.score}/100 · {data.band.replace('_', ' ')}</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.factors.map((f) => (
          <div key={f.label} className="flex items-center justify-between text-sm">
            <span>{f.label}</span>
            <span className="text-muted-foreground">
              {f.earned}/{f.weight} · {f.detail}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TierCard({ partnerId, currentTier }: { partnerId: string; currentTier: string | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [overrideTier, setOverrideTier] = useState('');

  const { data: progress } = useQuery({
    queryKey: ['partners', partnerId, 'tier-progress'],
    queryFn: () => tiersApi.getProgress(partnerId),
  });
  const { data: allTiers } = useQuery({ queryKey: ['partner-tiers'], queryFn: tiersApi.list });

  const setTierMutation = useMutation({
    mutationFn: (tierCode: string) => tiersApi.setManually(partnerId, tierCode),
    onSuccess: () => {
      toast({ title: 'Tier updated' });
      queryClient.invalidateQueries({ queryKey: ['partners', partnerId] });
      queryClient.invalidateQueries({ queryKey: ['partners', partnerId, 'tier-progress'] });
    },
  });

  if (!progress) return null;
  const { currentTier: current, nextTier, signals } = progress;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tier &amp; benefits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={(current?.badgeColor as any) || 'secondary'} className="capitalize">
            {current?.label || currentTier || 'No tier'}
          </Badge>
          {progress.canAutoPromote && <Badge variant="success">Eligible for promotion</Badge>}
        </div>
        {current?.benefits && current.benefits.length > 0 && (
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            {current.benefits.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}

        {nextTier && (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">Progress toward {nextTier.label}</p>
            {nextTier.minTenureDays != null && (
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Tenure</span>
                  <span>{signals.tenureDays}/{nextTier.minTenureDays} days</span>
                </div>
                <Progress value={Math.min(100, (signals.tenureDays / nextTier.minTenureDays) * 100)} />
              </div>
            )}
            {nextTier.minVerifiedDocuments != null && (
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Verified documents</span>
                  <span>{signals.verifiedDocuments}/{nextTier.minVerifiedDocuments}</span>
                </div>
                <Progress
                  value={Math.min(100, (signals.verifiedDocuments / nextTier.minVerifiedDocuments) * 100)}
                />
              </div>
            )}
            {nextTier.minRewardPoints != null && (
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Reward points</span>
                  <span>{signals.rewardBalance}/{nextTier.minRewardPoints}</span>
                </div>
                <Progress value={Math.min(100, (signals.rewardBalance / nextTier.minRewardPoints) * 100)} />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Select value={overrideTier} onValueChange={setOverrideTier}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Set tier manually…" />
            </SelectTrigger>
            <SelectContent>
              {(allTiers ?? []).map((t) => (
                <SelectItem key={t.tierCode} value={t.tierCode}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={!overrideTier || setTierMutation.isPending}
            onClick={() => setTierMutation.mutate(overrideTier)}
          >
            Apply
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TagsCard({ partnerId, tags }: { partnerId: string; tags: string[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTag, setNewTag] = useState('');

  const mutation = useMutation({
    mutationFn: (nextTags: string[]) => relationshipApi.updateTags(partnerId, nextTags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners', partnerId] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message, variant: 'destructive' });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tags</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                onClick={() => mutation.mutate(tags.filter((t) => t !== tag))}
                aria-label={`Remove tag ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {tags.length === 0 && <p className="text-sm text-muted-foreground">No tags yet.</p>}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add a tag…"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTag.trim()) {
                mutation.mutate([...tags, newTag.trim()]);
                setNewTag('');
              }
            }}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={!newTag.trim()}
            onClick={() => {
              mutation.mutate([...tags, newTag.trim()]);
              setNewTag('');
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AccountManagerCard({ partnerId, accountManagerId }: { partnerId: string; accountManagerId: string | null }) {
  const queryClient = useQueryClient();
  const { data: staff } = useQuery({ queryKey: ['staff-users'], queryFn: relationshipApi.listStaff });

  const mutation = useMutation({
    mutationFn: (id: string | null) => relationshipApi.assignAccountManager(partnerId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partners', partnerId] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account manager</CardTitle>
      </CardHeader>
      <CardContent>
        <Select
          value={accountManagerId ?? '__none'}
          onValueChange={(v) => mutation.mutate(v === '__none' ? null : v)}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Unassigned</SelectItem>
            {(staff ?? []).map((s) => (
              <SelectItem key={s.adminId} value={s.adminId}>
                {s.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}

function BusinessPlansCard({ partnerId }: { partnerId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [targetMetric, setTargetMetric] = useState('');
  const [targetValue, setTargetValue] = useState('');

  const { data: plans } = useQuery({
    queryKey: ['partners', partnerId, 'business-plans'],
    queryFn: () => relationshipApi.getBusinessPlans(partnerId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      relationshipApi.createBusinessPlan(partnerId, {
        title,
        targetMetric: targetMetric || undefined,
        targetValue: targetValue ? Number(targetValue) : undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Goal created' });
      queryClient.invalidateQueries({ queryKey: ['partners', partnerId, 'business-plans'] });
      setOpen(false);
      setTitle('');
      setTargetMetric('');
      setTargetValue('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: { planId: string; currentValue: number }) =>
      relationshipApi.updateBusinessPlan(partnerId, input.planId, { currentValue: input.currentValue }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partners', partnerId, 'business-plans'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (planId: string) => relationshipApi.deleteBusinessPlan(partnerId, planId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partners', partnerId, 'business-plans'] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Business plan goals</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New goal
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {(plans ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No shared goals yet.</p>
        )}
        {(plans ?? []).map((plan) => {
          const target = Number(plan.targetValue) || 0;
          const current = Number(plan.currentValue) || 0;
          const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
          return (
            <div key={plan.planId} className="space-y-1 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{plan.title}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{plan.status}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(plan.planId)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              {plan.targetMetric && target > 0 && (
                <>
                  <Progress value={pct} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {plan.targetMetric}: {current} / {target}
                    </span>
                    <Input
                      type="number"
                      className="h-7 w-24"
                      defaultValue={current}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v !== current) updateMutation.mutate({ planId: plan.planId, currentValue: v });
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New business plan goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <FormInput
              label="Target metric (optional)"
              placeholder="e.g. Quarterly revenue"
              value={targetMetric}
              onChange={(e) => setTargetMetric(e.target.value)}
            />
            <FormInput
              label="Target value (optional)"
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!title.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function RewardsCard({ partnerId }: { partnerId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');

  const { data } = useQuery({
    queryKey: ['partners', partnerId, 'rewards'],
    queryFn: () => relationshipApi.getRewards(partnerId),
  });

  const awardMutation = useMutation({
    mutationFn: () => relationshipApi.awardPoints(partnerId, { points: Number(points), reason }),
    onSuccess: () => {
      toast({ title: 'Points recorded' });
      queryClient.invalidateQueries({ queryKey: ['partners', partnerId, 'rewards'] });
      setOpen(false);
      setPoints('');
      setReason('');
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Reward points</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Award className="mr-2 h-4 w-4" />
          Award / deduct
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-2xl font-semibold">{data?.balance ?? 0} pts</p>
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {(data?.transactions ?? []).map((tx) => (
            <div key={tx.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{tx.reason}</span>
              <span className={tx.points > 0 ? 'text-green-600' : 'text-destructive'}>
                {tx.points > 0 ? '+' : ''}{tx.points}
              </span>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Award or deduct points</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormInput
              label="Points (negative to deduct)"
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
            <FormTextarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!points || !reason.trim() || awardMutation.isPending}
              onClick={() => awardMutation.mutate()}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function AccountMapCard({ partnerId }: { partnerId: string }) {
  const { data } = useQuery({
    queryKey: ['partners', partnerId, 'account-map'],
    queryFn: () => relationshipApi.getAccountMap(partnerId),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account map</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {(data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Not linked to any tenant accounts yet.</p>
        )}
        {(data ?? []).map((t) => (
          <div key={t.tenantId} className="flex items-center justify-between rounded-md border p-2 text-sm">
            <span>{t.tenantName || t.tenantId}</span>
            {t.sharedWith.length > 0 ? (
              <Badge variant="warning">Shared with {t.sharedWith.length} other partner(s)</Badge>
            ) : (
              <Badge variant="outline">Exclusive</Badge>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function PartnerRelationshipPanel({
  partnerId,
  tier,
  tags,
  accountManagerId,
}: {
  partnerId: string;
  tier: string | null;
  tags: string[];
  accountManagerId: string | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <HealthScoreCard partnerId={partnerId} />
      <TierCard partnerId={partnerId} currentTier={tier} />
      <TagsCard partnerId={partnerId} tags={tags} />
      <AccountManagerCard partnerId={partnerId} accountManagerId={accountManagerId} />
      <BusinessPlansCard partnerId={partnerId} />
      <RewardsCard partnerId={partnerId} />
      <AccountMapCard partnerId={partnerId} />
    </div>
  );
}
