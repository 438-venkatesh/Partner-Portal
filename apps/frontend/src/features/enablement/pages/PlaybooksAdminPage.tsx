import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enablementApi } from '@/lib/api/enablement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormInput, FormTextarea, FormSelect } from '@/components/ui/form-field';
import { SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/lib/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';

const DEAL_STAGES = ['pending_review', 'approved', 'won', 'lost'];

export function PlaybooksAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', dealStage: '', content: '' });

  const { data: playbooks, isLoading } = useQuery({ queryKey: ['playbooks'], queryFn: enablementApi.listPlaybooks });

  const createMutation = useMutation({
    mutationFn: () =>
      enablementApi.createPlaybook({
        title: form.title,
        dealStage: (form.dealStage || undefined) as any,
        content: form.content,
      }),
    onSuccess: () => {
      toast({ title: 'Playbook created' });
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
      setCreating(false);
      setForm({ title: '', dealStage: '', content: '' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.response?.data?.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (playbookId: string) => enablementApi.deletePlaybook(playbookId),
    onSuccess: () => {
      toast({ title: 'Playbook deleted' });
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Sales playbooks</CardTitle>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New playbook
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {creating && (
          <div className="space-y-3 rounded-md border p-3">
            <FormInput label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <FormSelect
              label="Deal stage"
              placeholder="Applies at every stage"
              value={form.dealStage}
              onValueChange={(v) => setForm({ ...form, dealStage: v })}
            >
              {DEAL_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {stage.replace('_', ' ')}
                </SelectItem>
              ))}
            </FormSelect>
            <FormTextarea label="Content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} />
            <div className="flex gap-2">
              <Button disabled={!form.title.trim() || !form.content.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
                Create
              </Button>
              <Button variant="outline" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : (
          (playbooks ?? []).map((playbook) => (
            <div key={playbook.playbookId} className="flex items-start justify-between rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{playbook.title}</p>
                {playbook.dealStage && (
                  <Badge variant="outline" className="mt-1 capitalize">
                    {playbook.dealStage.replace('_', ' ')}
                  </Badge>
                )}
                <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{playbook.content}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(playbook.playbookId)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
