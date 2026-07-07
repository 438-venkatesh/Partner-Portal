import { useEffect, useMemo, useRef } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { partnerDashboardApi, type ServiceRelationship } from '@/lib/api/partnerDashboard';
import { useToast } from '@/lib/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { FormInput, FormTextarea, FormField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
/** Partner-dashboard tenant payloads sometimes omit joined labels; JSON may use snake_case. */
function stringListFromJson(v: unknown): string[] {
  if (typeof v === 'string' && v.trim()) return [v.trim()];
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === 'string' ? x : typeof x === 'number' ? String(x) : ''))
    .filter((s): s is string => s.trim() !== '')
    .map((s) => s.trim());
}

function serviceTypeChoicesFromRelationship(rel: ServiceRelationship | null | undefined): string[] {
  if (!rel) return [];
  const raw = rel as unknown as Record<string, unknown>;
  const code = String(rel.serviceCode ?? raw.service_code ?? '').trim();
  const name = String(rel.serviceName ?? raw.service_name ?? '').trim();
  const fromArrays = [
    ...stringListFromJson(rel.requestedServices),
    ...stringListFromJson(rel.approvedServices),
  ];
  const set = new Set<string>();
  if (code) set.add(code);
  if (name) set.add(name);
  for (const s of fromArrays) set.add(s);
  return Array.from(set);
}

function relationshipServiceLabel(rel: ServiceRelationship | null | undefined): string {
  if (!rel) return 'Service';
  const parts = serviceTypeChoicesFromRelationship(rel);
  if (parts.length) return parts.slice(0, 2).join(' · ');
  return rel.serviceId ? `Service ${rel.serviceId.slice(0, 8)}…` : 'Service';
}

const createTimelineSchema = z.object({
  relationshipId: z.string().uuid('Relationship is required'),
  tenantId: z.string().uuid('Tenant is required'),
  serviceId: z.string().uuid('Service is required'),
  serviceType: z.string().min(1, 'Service type is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  recurrenceType: z.enum(['none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
  recurrenceInterval: z.string().optional(),
  notes: z.string().optional(),
});

export interface ServiceTimelineCreateFormProps {
  initialTenantId?: string;
  initialRelationshipId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ServiceTimelineCreateForm({
  initialTenantId,
  initialRelationshipId,
  onSuccess,
  onCancel,
}: ServiceTimelineCreateFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tenantsData, isLoading: tenantsLoading, isError, error } = useQuery({
    queryKey: ['partner-tenants'],
    queryFn: () => partnerDashboardApi.getTenants(),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const tenants = useMemo(() => {
    const t = tenantsData?.tenants;
    return Array.isArray(t) ? t : [];
  }, [tenantsData]);

  const defaultValues = useMemo(
    () => ({
      relationshipId: initialRelationshipId ?? '',
      tenantId: initialTenantId ?? '',
      serviceId: '',
      serviceType: '',
      title: '',
      description: '',
      dueDate: '',
      priority: 'medium' as const,
      recurrenceType: 'none' as const,
      recurrenceInterval: '1',
      assignedTo: '',
      notes: '',
    }),
    [initialRelationshipId, initialTenantId],
  );

  const createMutation = useMutation({
    mutationFn: partnerDashboardApi.createTimeline,
  });

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const result = createTimelineSchema.safeParse(value);
      if (!result.success) {
        toast({
          title: 'Check the form',
          description: result.error.issues[0]?.message || 'Validation failed',
          variant: 'destructive',
        });
        return;
      }
      const assignedRaw = value.assignedTo?.trim();
      const assignedTo =
        assignedRaw && z.string().uuid().safeParse(assignedRaw).success ? assignedRaw : undefined;
      try {
        await createMutation.mutateAsync({
          ...result.data,
          ...(assignedTo ? { assignedTo } : {}),
        });
        toast({
          title: 'Timeline created',
          description: 'The service timeline was saved successfully.',
        });
        queryClient.invalidateQueries({ queryKey: ['partner-timelines'] });
        queryClient.invalidateQueries({ queryKey: ['partner-tenants'] });
        queryClient.invalidateQueries({ queryKey: ['partner-dashboard-stats'] });
        form.reset();
        onSuccess?.();
      } catch (err: unknown) {
        const message =
          err && typeof err === 'object' && 'message' in err && typeof (err as { message?: string }).message === 'string'
            ? (err as { message: string }).message
            : 'Please try again.';
        toast({
          title: 'Could not create timeline',
          description: message,
          variant: 'destructive',
        });
      }
    },
  });

  /** Subscribe to store — `form.state` is not reactive outside `Field` / `useStore`. */
  const tenantId = form.useStore((s) => s.values?.tenantId ?? '');
  const relationshipId = form.useStore((s) => s.values?.relationshipId ?? '');
  const serviceType = form.useStore((s) => s.values?.serviceType ?? '');
  const recurrenceType = form.useStore((s) => s.values?.recurrenceType ?? 'none');

  const selectedTenant = tenants.find((t) => t.tenantId === tenantId);
  const relationships = Array.isArray(selectedTenant?.relationships) ? selectedTenant.relationships : [];

  const serviceTypeOptions = useMemo(() => {
    const opts = new Set<string>();
    for (const r of relationships) {
      for (const s of serviceTypeChoicesFromRelationship(r)) {
        opts.add(s);
      }
    }
    const current = serviceType?.trim();
    if (current) opts.add(current);
    return Array.from(opts).sort((a, b) => a.localeCompare(b));
  }, [relationships, serviceType]);

  const selectedRelationshipId = relationshipId;
  const relationshipsForService = selectedRelationshipId
    ? relationships.filter((r) => r.relationshipId === selectedRelationshipId)
    : relationships;

  const availableServices = relationshipsForService.map((rel) => {
    const choices = serviceTypeChoicesFromRelationship(rel);
    const lineServiceType = (choices[0] || 'service').trim();
    return {
      serviceId: rel.serviceId,
      relationshipId: rel.relationshipId,
      serviceType: lineServiceType,
      label: relationshipServiceLabel(rel),
    };
  });

  /** Radix Select requires unique item values; multiple relationships can share the same serviceId. */
  function serviceLineSelectValue(serviceId: string, relationshipId: string): string {
    const matchRel =
      availableServices.find((s) => s.relationshipId === relationshipId && s.serviceId === serviceId) ??
      availableServices.find((s) => s.relationshipId === relationshipId);
    if (matchRel) return matchRel.relationshipId;
    const bySvc = availableServices.filter((s) => s.serviceId === serviceId);
    if (bySvc.length === 1) return bySvc[0].relationshipId;
    return '';
  }

  const appliedSearchDefaults = useRef(false);
  useEffect(() => {
    if (!tenants.length || appliedSearchDefaults.current) return;
    try {
      if (initialTenantId && tenants.some((t) => t.tenantId === initialTenantId)) {
        form.setFieldValue('tenantId', initialTenantId);
      }
      const tenantIdResolved =
        initialTenantId && tenants.some((t) => t.tenantId === initialTenantId) ? initialTenantId : undefined;
      if (tenantIdResolved && initialRelationshipId) {
        const tenant = tenants.find((t) => t.tenantId === tenantIdResolved);
        const rel = tenant?.relationships?.find((r) => r.relationshipId === initialRelationshipId);
        if (rel) {
          form.setFieldValue('relationshipId', initialRelationshipId);
          form.setFieldValue('serviceId', rel.serviceId);
          form.setFieldValue('serviceType', serviceTypeChoicesFromRelationship(rel)[0] || 'service');
        }
      }
    } finally {
      appliedSearchDefaults.current = true;
    }
  }, [tenants, initialTenantId, initialRelationshipId]);

  if (tenantsLoading) {
    return (
      <div className="space-y-4 py-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error instanceof Error
          ? error.message
          : 'Could not load tenants from the server. Sign in again or check your connection.'}
      </div>
    );
  }

  if (!tenants.length) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center text-muted-foreground">
        <p className="font-medium text-foreground">No active tenant–service links</p>
        <p className="mt-2 max-w-2xl mx-auto text-sm text-pretty">
          This screen reads <span className="font-mono text-xs">partner_tenant_service_relationships</span> rows with
          status <span className="font-medium text-foreground">active</span> for your partner. If none exist yet, the
          tenant dropdown stays empty—even when your partner account is active or your partner org is still “pending”
          in Operations.
        </p>
        <p className="mt-3 max-w-2xl mx-auto text-sm text-pretty">
          Operations links partners to tenants and services (or for local dev run{' '}
          <span className="font-mono text-xs">pnpm --filter @partner-portal/backend db:seed-test-partner-links</span>{' '}
          after tenants + service catalog + test partner are seeded).
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-6 w-full"
    >
      <form.Field name="tenantId">
        {(field) => (
          <FormField
            label="Tenant"
            required
            error={field.state.meta.errors?.[0] ? String(field.state.meta.errors?.[0]) : undefined}
          >
            <Select
              value={field.state.value || undefined}
              onValueChange={(value) => {
                field.handleChange(value);
                // Defer clears so tenant field state settles before dependent fields re-validate (TanStack Form + Radix).
                queueMicrotask(() => {
                  form.setFieldValue('relationshipId', '');
                  form.setFieldValue('serviceId', '');
                  form.setFieldValue('serviceType', '');
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.tenantId} value={tenant.tenantId}>
                    {tenant.tenantName || tenant.tenantCode || `Tenant ${tenant.tenantId.slice(0, 8)}…`} ·{' '}
                    {tenant.serviceCount} services
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}
      </form.Field>

      <div className={tenantId ? 'space-y-6' : 'hidden'} aria-hidden={!tenantId}>
        <form.Field name="relationshipId">
          {(field) => (
            <FormField
              label="Service relationship"
              required
              error={field.state.meta.errors?.[0] ? String(field.state.meta.errors?.[0]) : undefined}
            >
              <Select
                disabled={!tenantId}
                value={field.state.value || undefined}
                onValueChange={(value) => {
                  field.handleChange(value);
                  const rel = relationships.find((r) => r.relationshipId === value);
                  if (rel) {
                    form.setFieldValue('serviceId', rel.serviceId);
                    form.setFieldValue('serviceType', serviceTypeChoicesFromRelationship(rel)[0] || 'service');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tenantId ? 'Select relationship' : 'Select tenant first'} />
                </SelectTrigger>
                <SelectContent>
                  {relationships.length === 0 ? (
                    <SelectItem value="__no-relationships__" disabled>
                      {tenantId ? 'No active relationships for this tenant' : 'Select a tenant first'}
                    </SelectItem>
                  ) : (
                    relationships.map((rel) => {
                      const label =
                        [rel.serviceName, rel.serviceCode].filter(Boolean).join(' · ') ||
                        `Relationship ${rel.relationshipId.slice(0, 8)}…`;
                      return (
                        <SelectItem key={rel.relationshipId} value={rel.relationshipId}>
                          {label}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </FormField>
          )}
        </form.Field>

        <form.Field name="serviceId">
          {(field) => (
            <FormField
              label="Service"
              required
              error={field.state.meta.errors?.[0] ? String(field.state.meta.errors?.[0]) : undefined}
            >
              <Select
                disabled={!tenantId}
                value={serviceLineSelectValue(field.state.value, relationshipId) || undefined}
                onValueChange={(rid) => {
                  const line = availableServices.find((s) => s.relationshipId === rid);
                  if (line) {
                    field.handleChange(line.serviceId);
                    form.setFieldValue('relationshipId', line.relationshipId);
                    form.setFieldValue('serviceType', line.serviceType);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tenantId ? 'Select service' : 'Select tenant first'} />
                </SelectTrigger>
                <SelectContent>
                  {availableServices.length === 0 ? (
                    <SelectItem value="__no-services__" disabled>
                      {tenantId ? 'No services for this selection' : 'Select a tenant first'}
                    </SelectItem>
                  ) : (
                    availableServices.map((service) => (
                      <SelectItem key={service.relationshipId} value={service.relationshipId}>
                        {service.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </FormField>
          )}
        </form.Field>
      </div>

      <form.Field name="serviceType">
        {(field) => (
          <FormField
            label="Service type"
            required
            error={field.state.meta.errors?.[0] ? String(field.state.meta.errors?.[0]) : undefined}
            hint={
              !tenantId
                ? 'Select a tenant first.'
                : serviceTypeOptions.length === 0
                  ? relationships.length > 0
                    ? 'No service codes/names on these rows. In Operations: Partners → open your partner → Service relationships → Create relationship (tenant + catalog service), then approve until status is Active so it appears here.'
                    : 'This tenant has no active service relationships yet.'
                  : undefined
            }
          >
            <Select
              value={field.state.value || undefined}
              onValueChange={(v) => field.handleChange(v)}
              disabled={!tenantId || serviceTypeOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select service type" />
              </SelectTrigger>
              <SelectContent>
                {serviceTypeOptions.length === 0 ? (
                  <SelectItem value="__no-service-types__" disabled>
                    {tenantId ? 'No service types available yet' : 'Select a tenant first'}
                  </SelectItem>
                ) : (
                  serviceTypeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </FormField>
        )}
      </form.Field>

      <form.Field name="title">
        {(field) => (
          <FormInput
            label="Title"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            error={field.state.meta.errors?.[0] ? String(field.state.meta.errors?.[0]) : undefined}
            placeholder="e.g. Monthly compliance review"
            required
          />
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <FormTextarea
            label="Description"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder="Optional context for your team"
            rows={4}
          />
        )}
      </form.Field>

      <form.Field name="dueDate">
        {(field) => (
          <FormInput
            label="Due date"
            type="datetime-local"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            error={field.state.meta.errors?.[0] ? String(field.state.meta.errors?.[0]) : undefined}
            required
          />
        )}
      </form.Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <form.Field name="priority">
          {(field) => (
            <FormField label="Priority">
              <Select value={field.state.value} onValueChange={(v) => field.handleChange(v as typeof field.state.value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
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
        </form.Field>

        <form.Field name="recurrenceType">
          {(field) => (
            <FormField label="Recurrence">
              <Select value={field.state.value} onValueChange={(v) => field.handleChange(v as typeof field.state.value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Recurrence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          )}
        </form.Field>
      </div>

      {recurrenceType && recurrenceType !== 'none' ? (
        <form.Field name="recurrenceInterval">
          {(field) => (
            <FormInput
              label="Recurrence interval"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="e.g. 1"
              hint="Number of periods between occurrences"
            />
          )}
        </form.Field>
      ) : null}

      <form.Field name="assignedTo">
        {(field) => (
          <FormInput
            label="Assign to (user ID, optional)"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder="UUID of partner user"
          />
        )}
      </form.Field>

      <form.Field name="notes">
        {(field) => (
          <FormTextarea
            label="Notes"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder="Internal notes"
            rows={3}
          />
        )}
      </form.Field>

      <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={createMutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Creating…' : 'Create timeline'}
        </Button>
      </div>
    </form>
  );
}
