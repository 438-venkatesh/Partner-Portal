import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerDashboardApi, type ServiceTimeline } from '@/lib/api/partnerDashboard';
import { useToast } from '@/lib/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { FormInput, FormTextarea, FormField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface ServiceTimelineEditFormProps {
  timeline: ServiceTimeline;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ServiceTimelineEditForm({ timeline, onSuccess, onCancel }: ServiceTimelineEditFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      dueDate: string;
      status: string;
      priority: string;
      notes?: string;
    }) => partnerDashboardApi.updateTimeline(timeline.timelineId, data),
    onSuccess: () => {
      toast({
        title: 'Timeline updated',
        description: 'Your changes were saved.',
      });
      queryClient.invalidateQueries({ queryKey: ['partner-timelines'] });
      queryClient.invalidateQueries({ queryKey: ['partner-dashboard-stats'] });
      onSuccess?.();
    },
    onError: (error: { message?: string }) => {
      toast({
        title: 'Update failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const editForm = useForm({
    defaultValues: {
      title: timeline.title,
      description: timeline.description || '',
      dueDate: timeline.dueDate ? new Date(timeline.dueDate).toISOString().slice(0, 16) : '',
      status: timeline.status,
      priority: timeline.priority,
      notes: timeline.notes || '',
    },
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync({
        title: value.title,
        description: value.description,
        dueDate: new Date(value.dueDate).toISOString(),
        status: value.status as ServiceTimeline['status'],
        priority: value.priority as ServiceTimeline['priority'],
        notes: value.notes,
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        editForm.handleSubmit();
      }}
      className="w-full space-y-6"
    >
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Service:</span> {timeline.serviceType}
        </p>
        <p className="mt-1">
          <span className="font-medium text-foreground">Tenant ID:</span> {timeline.tenantId}
        </p>
      </div>

      <editForm.Field name="title">
        {(field) => (
          <FormInput
            label="Title"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            required
          />
        )}
      </editForm.Field>

      <editForm.Field name="description">
        {(field) => (
          <FormTextarea
            label="Description"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            rows={4}
          />
        )}
      </editForm.Field>

      <editForm.Field name="dueDate">
        {(field) => (
          <FormInput
            label="Due date"
            type="datetime-local"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            required
          />
        )}
      </editForm.Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <editForm.Field name="status">
          {(field) => (
            <FormField label="Status">
              <Select value={field.state.value} onValueChange={(v) => field.handleChange(v as ServiceTimeline['status'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          )}
        </editForm.Field>

        <editForm.Field name="priority">
          {(field) => (
            <FormField label="Priority">
              <Select
                value={field.state.value}
                onValueChange={(v) => field.handleChange(v as typeof field.state.value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          )}
        </editForm.Field>
      </div>

      <editForm.Field name="notes">
        {(field) => (
          <FormTextarea
            label="Notes"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            rows={3}
          />
        )}
      </editForm.Field>

      <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={updateMutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
