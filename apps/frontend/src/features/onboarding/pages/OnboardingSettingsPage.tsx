import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  onboardingLifecycleApi,
  type AutoApprovalRule,
  type StageConfigRow,
} from '@/lib/api/onboardingLifecycle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/lib/hooks/use-toast';
import { ArrowUp, ArrowDown, Plus, Trash2 } from 'lucide-react';

const PARTNER_TYPES = [
  'agency',
  'reseller',
  'integrator',
  'consultant',
  'affiliate',
  'supplier',
  'logistics_partner',
  'supplier_logistics',
];

function StageConfigPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [partnerType, setPartnerType] = useState('agency');

  const { data: stages, isLoading } = useQuery({
    queryKey: ['onboarding', 'stage-config', partnerType],
    queryFn: () => onboardingLifecycleApi.getStageConfig(partnerType),
  });

  const updateMutation = useMutation({
    mutationFn: (input: { stageCode: string; patch: Partial<StageConfigRow> }) =>
      onboardingLifecycleApi.updateStageConfig(partnerType, input.stageCode, input.patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'stage-config', partnerType] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update stage',
        variant: 'destructive',
      });
    },
  });

  const move = (stage: StageConfigRow, direction: -1 | 1) => {
    if (!stages) return;
    const enabled = stages.filter((s) => s.isEnabled).sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = enabled.findIndex((s) => s.stageCode === stage.stageCode);
    const swapWith = enabled[idx + direction];
    if (!swapWith) return;
    updateMutation.mutate({ stageCode: stage.stageCode, patch: { sortOrder: swapWith.sortOrder } });
    updateMutation.mutate({ stageCode: swapWith.stageCode, patch: { sortOrder: stage.sortOrder } });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding stages</CardTitle>
        <p className="text-sm text-muted-foreground">
          Rename, reorder, or turn off a stage for a partner type. Turning a stage off skips it
          entirely for new and in-flight partners of that type.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={partnerType} onValueChange={setPartnerType}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PARTNER_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoading || !stages ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : (
          <div className="divide-y rounded-md border">
            {[...stages]
              .sort((a, b) => (a.isEnabled ? a.sortOrder : 999) - (b.isEnabled ? b.sortOrder : 999))
              .map((stage) => (
                <div
                  key={stage.stageCode}
                  className={`flex items-center gap-3 p-3 ${!stage.isEnabled ? 'opacity-50' : ''}`}
                >
                  <div className="flex flex-col">
                    <button
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      disabled={!stage.isEnabled}
                      onClick={() => move(stage, -1)}
                      aria-label={`Move ${stage.label} earlier`}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      disabled={!stage.isEnabled}
                      onClick={() => move(stage, 1)}
                      aria-label={`Move ${stage.label} later`}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <Input
                      defaultValue={stage.label}
                      className="mb-1 h-8"
                      onBlur={(e) => {
                        if (e.target.value !== stage.label) {
                          updateMutation.mutate({
                            stageCode: stage.stageCode,
                            patch: { label: e.target.value },
                          });
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">{stage.description}</p>
                  </div>
                  <Switch
                    checked={stage.isEnabled}
                    onCheckedChange={(checked) =>
                      updateMutation.mutate({ stageCode: stage.stageCode, patch: { isEnabled: checked } })
                    }
                  />
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AutoApprovalRulesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [minTier, setMinTier] = useState('');
  const [ruleType, setRuleType] = useState('');

  const { data: rules, isLoading } = useQuery({
    queryKey: ['onboarding', 'auto-approval-rules'],
    queryFn: onboardingLifecycleApi.getAutoApprovalRules,
  });

  const createMutation = useMutation({
    mutationFn: onboardingLifecycleApi.createAutoApprovalRule,
    onSuccess: () => {
      toast({ title: 'Rule created' });
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'auto-approval-rules'] });
      setName('');
      setMinTier('');
      setRuleType('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create rule',
        variant: 'destructive',
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (rule: AutoApprovalRule) =>
      onboardingLifecycleApi.updateAutoApprovalRule(rule.ruleId, { isActive: !rule.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding', 'auto-approval-rules'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: onboardingLifecycleApi.deleteAutoApprovalRule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding', 'auto-approval-rules'] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auto-approval rules</CardTitle>
        <p className="text-sm text-muted-foreground">
          A pending partner activates automatically, with no manual click, the moment onboarding
          is complete and a matching active rule below applies.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Input placeholder="Rule name" value={name} onChange={(e) => setName(e.target.value)} />
          <Select value={ruleType || '__any'} onValueChange={(v) => setRuleType(v === '__any' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Any partner type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__any">Any partner type</SelectItem>
              {PARTNER_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Minimum tier (optional)"
            value={minTier}
            onChange={(e) => setMinTier(e.target.value)}
          />
          <Button
            disabled={!name.trim() || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                name: name.trim(),
                partnerType: ruleType || undefined,
                minTier: minTier || undefined,
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add rule
          </Button>
        </div>

        {isLoading || !rules ? (
          <Skeleton className="h-24" />
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No rules yet — every partner is approved manually until you add one.
          </p>
        ) : (
          <div className="divide-y rounded-md border">
            {rules.map((rule) => (
              <div key={rule.ruleId} className="flex items-center gap-3 p-3">
                <div className="flex-1">
                  <p className="font-medium">{rule.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {rule.partnerType ? rule.partnerType.replace(/_/g, ' ') : 'Any partner type'}
                    {rule.minTier ? ` · tier ≥ ${rule.minTier}` : ''}
                  </p>
                </div>
                <Switch checked={rule.isActive} onCheckedChange={() => toggleMutation.mutate(rule)} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(rule.ruleId)}
                  aria-label={`Delete rule ${rule.name}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OnboardingSettingsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Onboarding settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure how the onboarding workflow behaves — no code changes required.
        </p>
      </div>

      <Tabs defaultValue="stages">
        <TabsList>
          <TabsTrigger value="stages">Stages</TabsTrigger>
          <TabsTrigger value="auto-approval">Auto-approval</TabsTrigger>
        </TabsList>
        <TabsContent value="stages" className="mt-4">
          <StageConfigPanel />
        </TabsContent>
        <TabsContent value="auto-approval" className="mt-4">
          <AutoApprovalRulesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
