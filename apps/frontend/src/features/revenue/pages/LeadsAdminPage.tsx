import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '@/lib/api/leads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { FormInput } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/lib/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';

export function LeadsAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creatingLead, setCreatingLead] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [creatingRule, setCreatingRule] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [rulePartnerType, setRulePartnerType] = useState('');
  const [ruleMinTier, setRuleMinTier] = useState('');

  const { data: leads, isLoading: leadsLoading } = useQuery({ queryKey: ['leads'], queryFn: leadsApi.listAll });
  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ['lead-routing-rules'],
    queryFn: leadsApi.listRoutingRules,
  });

  const createLeadMutation = useMutation({
    mutationFn: () => leadsApi.create({ customerName, contactEmail: contactEmail || undefined }),
    onSuccess: () => {
      toast({ title: 'Lead created and routed' });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setCreatingLead(false);
      setCustomerName('');
      setContactEmail('');
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: () =>
      leadsApi.createRoutingRule({
        name: ruleName,
        partnerType: rulePartnerType || undefined,
        minTier: ruleMinTier || undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Routing rule created' });
      queryClient.invalidateQueries({ queryKey: ['lead-routing-rules'] });
      setCreatingRule(false);
      setRuleName('');
      setRulePartnerType('');
      setRuleMinTier('');
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: (rule: { ruleId: string; isActive: boolean }) =>
      leadsApi.updateRoutingRule(rule.ruleId, { isActive: !rule.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lead-routing-rules'] }),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: leadsApi.deleteRoutingRule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lead-routing-rules'] }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Leads</CardTitle>
          <Button size="sm" onClick={() => setCreatingLead(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New lead
          </Button>
        </CardHeader>
        <CardContent>
          {creatingLead && (
            <div className="mb-4 grid grid-cols-3 gap-3 rounded-md border p-3">
              <FormInput label="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              <FormInput label="Contact email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              <div className="flex items-end">
                <Button disabled={!customerName.trim() || createLeadMutation.isPending} onClick={() => createLeadMutation.mutate()}>
                  Create &amp; route
                </Button>
              </div>
            </div>
          )}
          {leadsLoading ? (
            <Skeleton className="h-32" />
          ) : (leads ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2">Customer</th>
                  <th className="p-2">Assigned to</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(leads ?? []).map((lead) => (
                  <tr key={lead.leadId} className="border-b last:border-0">
                    <td className="p-2">{lead.customerName}</td>
                    <td className="p-2">{lead.partnerName ?? '—'}</td>
                    <td className="p-2">
                      <Badge variant="outline" className="capitalize">
                        {lead.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Routing rules</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setCreatingRule(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New rule
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {creatingRule && (
            <div className="grid grid-cols-4 gap-3 rounded-md border p-3">
              <FormInput label="Name" value={ruleName} onChange={(e) => setRuleName(e.target.value)} />
              <FormInput
                label="Partner type (optional)"
                value={rulePartnerType}
                onChange={(e) => setRulePartnerType(e.target.value)}
              />
              <FormInput label="Min tier (optional)" value={ruleMinTier} onChange={(e) => setRuleMinTier(e.target.value)} />
              <div className="flex items-end">
                <Button disabled={!ruleName.trim() || createRuleMutation.isPending} onClick={() => createRuleMutation.mutate()}>
                  Create
                </Button>
              </div>
            </div>
          )}
          {rulesLoading ? (
            <Skeleton className="h-24" />
          ) : (
            (rules ?? []).map((rule) => (
              <div key={rule.ruleId} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <p className="font-medium">{rule.name}</p>
                  <p className="text-muted-foreground">
                    {rule.partnerType ?? 'Any type'} {rule.minTier ? `· tier ≥ ${rule.minTier}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={rule.isActive} onCheckedChange={() => toggleRuleMutation.mutate(rule)} />
                  <Button variant="ghost" size="icon" onClick={() => deleteRuleMutation.mutate(rule.ruleId)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
