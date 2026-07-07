import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tiersApi, type TierDefinition } from '@/lib/api/tiers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-field';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/lib/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';

export function TierSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    tierCode: '',
    label: '',
    rank: '',
    minTenureDays: '',
    minVerifiedDocuments: '',
    benefits: '',
  });

  const { data: tiers, isLoading } = useQuery({ queryKey: ['partner-tiers'], queryFn: tiersApi.list });

  const createMutation = useMutation({
    mutationFn: () =>
      tiersApi.create({
        tierCode: form.tierCode,
        label: form.label,
        rank: Number(form.rank),
        minTenureDays: form.minTenureDays ? Number(form.minTenureDays) : (null as any),
        minVerifiedDocuments: form.minVerifiedDocuments ? Number(form.minVerifiedDocuments) : (null as any),
        minRewardPoints: null as any,
        badgeColor: 'secondary' as any,
        isActive: true,
        description: null as any,
        benefits: form.benefits
          ? form.benefits.split(',').map((b) => b.trim()).filter(Boolean)
          : [],
      }),
    onSuccess: () => {
      toast({ title: 'Tier created' });
      queryClient.invalidateQueries({ queryKey: ['partner-tiers'] });
      setCreating(false);
      setForm({ tierCode: '', label: '', rank: '', minTenureDays: '', minVerifiedDocuments: '', benefits: '' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message, variant: 'destructive' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (tier: TierDefinition) => tiersApi.update(tier.tierCode, { isActive: !tier.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partner-tiers'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: tiersApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partner-tiers'] }),
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Partner tiers</h1>
          <p className="text-sm text-muted-foreground">
            Define tiers, their benefits, and the criteria that auto-promote a partner into one.
          </p>
        </div>
        <Button onClick={() => setCreating((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          New tier
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle>New tier</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <FormInput
              label="Tier code"
              placeholder="e.g. diamond"
              value={form.tierCode}
              onChange={(e) => setForm({ ...form, tierCode: e.target.value })}
            />
            <FormInput
              label="Label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
            <FormInput
              label="Rank (higher = better)"
              type="number"
              value={form.rank}
              onChange={(e) => setForm({ ...form, rank: e.target.value })}
            />
            <FormInput
              label="Min. tenure (days)"
              type="number"
              value={form.minTenureDays}
              onChange={(e) => setForm({ ...form, minTenureDays: e.target.value })}
            />
            <FormInput
              label="Min. verified documents"
              type="number"
              value={form.minVerifiedDocuments}
              onChange={(e) => setForm({ ...form, minVerifiedDocuments: e.target.value })}
            />
            <FormInput
              label="Benefits (comma-separated)"
              value={form.benefits}
              onChange={(e) => setForm({ ...form, benefits: e.target.value })}
            />
            <div className="col-span-full">
              <Button
                disabled={!form.tierCode || !form.label || !form.rank || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Create tier
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(tiers ?? [])
            .sort((a, b) => a.rank - b.rank)
            .map((tier) => (
              <Card key={tier.tierCode} className={!tier.isActive ? 'opacity-50' : ''}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">{tier.label}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Switch checked={tier.isActive} onCheckedChange={() => toggleMutation.mutate(tier)} />
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(tier.tierCode)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">Rank {tier.rank}</p>
                  {tier.minTenureDays != null && <p>Min. tenure: {tier.minTenureDays} days</p>}
                  {tier.minVerifiedDocuments != null && (
                    <p>Min. verified documents: {tier.minVerifiedDocuments}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {tier.benefits.map((b) => (
                      <Badge key={b} variant="outline">
                        {b}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
