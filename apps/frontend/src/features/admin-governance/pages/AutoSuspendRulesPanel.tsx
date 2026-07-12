import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { autoSuspendRulesApi } from '@/lib/api/adminGovernance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-field';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/lib/hooks/use-toast';
import { Play, Trash2 } from 'lucide-react';

const RULES_KEY = ['auto-suspend-rules'];

export function AutoSuspendRulesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('Auto-suspend inactive partners');
  const [inactivityDays, setInactivityDays] = useState('180');
  const [runResult, setRunResult] = useState<{
    flagged: { partnerId: string; partnerName: string; daysInactive: number }[];
    suspended: string[];
  } | null>(null);

  const { data: rules, isLoading } = useQuery({ queryKey: RULES_KEY, queryFn: autoSuspendRulesApi.list });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: RULES_KEY });

  const createMutation = useMutation({
    mutationFn: () => autoSuspendRulesApi.create({ name, inactivityDays: Number(inactivityDays), autoSuspend: false }),
    onSuccess: () => {
      toast({ title: 'Rule created (dry-run mode — enable "Auto-suspend" to act automatically)' });
      invalidate();
    },
  });

  const toggleAutoSuspendMutation = useMutation({
    mutationFn: ({ ruleId, autoSuspend }: { ruleId: string; autoSuspend: boolean }) =>
      autoSuspendRulesApi.update(ruleId, { autoSuspend }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (ruleId: string) => autoSuspendRulesApi.remove(ruleId),
    onSuccess: () => {
      toast({ title: 'Rule deleted' });
      invalidate();
    },
  });

  const runMutation = useMutation({
    mutationFn: () => autoSuspendRulesApi.run(),
    onSuccess: (data) => {
      setRunResult(data);
      toast({ title: `Flagged ${data.flagged.length}, suspended ${data.suspended.length}` });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Inactivity automation rule</CardTitle>
          <CardDescription>
            Same narrow rule-engine pattern as auto-approval, lead routing, and incentive challenges — not a
            generic workflow builder. Flags partners with no login for N days; suspends them only if
            "Auto-suspend" is turned on for that rule.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 items-end">
          <FormInput label="Rule name" value={name} onChange={(e) => setName(e.target.value)} />
          <FormInput
            label="Inactivity threshold (days)"
            type="number"
            min={1}
            value={inactivityDays}
            onChange={(e) => setInactivityDays(e.target.value)}
          />
          <Button disabled={!name || createMutation.isPending} onClick={() => createMutation.mutate()}>
            Add rule
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead className="text-right">Auto-suspend</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rules ?? []).map((r) => (
                  <TableRow key={r.ruleId}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.inactivityDays} days</TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={r.autoSuspend}
                        onCheckedChange={(checked) =>
                          toggleAutoSuspendMutation.mutate({ ruleId: r.ruleId, autoSuspend: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(r.ruleId)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(rules ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No rules yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          <div className="pt-4">
            <Button variant="outline" disabled={runMutation.isPending} onClick={() => runMutation.mutate()}>
              <Play className="mr-2 h-4 w-4" />
              Run inactivity check now
            </Button>
          </div>

          {runResult && (
            <div className="pt-4 text-sm space-y-1">
              <p className="font-medium">
                Flagged {runResult.flagged.length}, suspended {runResult.suspended.length}
              </p>
              {runResult.flagged.map((f) => (
                <p key={f.partnerId} className="text-muted-foreground">
                  {f.partnerName} — {f.daysInactive} days inactive
                  {runResult.suspended.includes(f.partnerId) ? ' (suspended)' : ''}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
