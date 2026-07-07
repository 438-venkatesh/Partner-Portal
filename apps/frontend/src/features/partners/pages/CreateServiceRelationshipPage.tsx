import { useMemo, type ReactNode } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { serviceApi, type Service } from '@/lib/api/services';
import { tenantsApi } from '@/lib/api/tenants';
import { useToast } from '@/lib/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormInput, FormTextarea, FormField } from '@/components/ui/form-field';
import { MultiSelectCombobox, MultiSelectOption } from '@/components/ui/multi-select-combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';

type RelFormValues = {
  tenantId: string;
  requestedServices: string[];
  applications: string[];
  startDate: string;
  notes: string;
};

function buildApplicationOptions(
  catalog: { services: Service[] } | undefined,
  selectedServiceIds: string[]
): MultiSelectOption[] {
  if (!selectedServiceIds.length || !catalog?.services) return [];
  const keys = new Set<string>();
  for (const id of selectedServiceIds) {
    const svc = catalog.services.find((s) => s.serviceId === id);
    for (const app of svc?.applications ?? []) {
      if (typeof app === 'string' && app.trim()) keys.add(app.trim());
    }
  }
  return [...keys].sort().map((k) => ({ value: k, label: k }));
}

function ApplicationsField({
  formApi,
  catalog,
  selectedServiceIds,
}: {
  // Same form instance as parent; narrowed typing avoids @tanstack/react-form generic friction.
  formApi: {
    Field: (props: {
      name: 'applications';
      children: (field: {
        state: { value: string[] };
        handleChange: (v: string[]) => void;
      }) => ReactNode;
    }) => ReactNode;
  };
  catalog: { services: Service[] } | undefined;
  selectedServiceIds: string[];
}) {
  const applicationOptions = useMemo(
    () => buildApplicationOptions(catalog, selectedServiceIds),
    [catalog, selectedServiceIds]
  );

  // Keep `applications` Field always mounted — unmounting when options go 0→N breaks TanStack Form
  // when `setFieldValue('applications', ...)` runs from the services combobox (Object.values on null).
  return (
    <formApi.Field name="applications">
      {(field) =>
        applicationOptions.length === 0 ? null : (
          <FormField
            label="Applications (optional)"
            hint="Modules suggested by the selected services — narrow scope if needed."
          >
            <MultiSelectCombobox
              options={applicationOptions}
              value={field.state.value ?? []}
              onChange={(v) => field.handleChange(v)}
              placeholder="Select applications…"
              searchPlaceholder="Search…"
              emptyMessage="No applications for selected services"
            />
          </FormField>
        )
      }
    </formApi.Field>
  );
}

export function CreateServiceRelationshipPage() {
  const { partnerId } = useParams({ from: '/partners/$partnerId/relationships/new' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: catalog, isLoading: catalogLoading, error: catalogError } = useQuery({
    queryKey: ['service-catalog'],
    queryFn: () => serviceApi.getServiceCatalog(),
  });

  const { data: tenantsPayload, isLoading: tenantsLoading, error: tenantsError } = useQuery({
    queryKey: ['tenants', 'list'],
    queryFn: () => tenantsApi.list(),
  });

  const tenantList = tenantsPayload?.tenants ?? [];

  const createMutation = useMutation({
    mutationFn: serviceApi.createRelationship,
    onSuccess: () => {
      toast({ title: 'Success', description: 'Service relationship created successfully' });
      queryClient.invalidateQueries({ queryKey: ['service-relationships', partnerId] });
      navigate({ to: '/partners/$partnerId', params: { partnerId } });
    },
    onError: (error: any) => {
      const description =
        error?.response?.data?.message ??
        error?.message ??
        'Failed to create relationship';
      toast({
        title: 'Error',
        description,
        variant: 'destructive',
      });
    },
  });

  const form = useForm<RelFormValues>({
    defaultValues: {
      tenantId: '',
      requestedServices: [] as string[],
      applications: [] as string[],
      startDate: '',
      notes: '',
    },
    onSubmitInvalid: () => {
      toast({
        title: 'Check the form',
        description: 'Select a tenant and at least one catalog service before creating the relationship.',
        variant: 'destructive',
      });
    },
    onSubmit: async ({ value }) => {
      const serviceId = value.requestedServices[0];
      if (!value.tenantId || !serviceId) {
        toast({
          title: 'Missing required fields',
          description: 'Select a tenant and at least one service.',
          variant: 'destructive',
        });
        return;
      }
      await createMutation.mutateAsync({
        partnerId,
        tenantId: value.tenantId,
        serviceId,
        requestedServices: value.requestedServices,
        applications: value.applications?.length ? value.applications : undefined,
        startDate: value.startDate?.trim() ? value.startDate : undefined,
        notes: value.notes?.trim() ? value.notes : undefined,
      });
    },
  });

  const serviceOptions: MultiSelectOption[] = useMemo(() => {
    if (!catalog?.services?.length) return [];
    return catalog.services
      .filter((s) => s.serviceId && s.serviceName)
      .map((s) => ({
        value: s.serviceId,
        label: s.serviceName,
        description: s.serviceCategory
          ? `${s.serviceCategory}${s.description ? ` — ${s.description}` : ''}`
          : s.description,
      }));
  }, [catalog]);

  return (
    <div className="w-full max-w-none space-y-6 pb-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Link to="/partners/$partnerId" params={{ partnerId }}>
          <Button variant="ghost" size="icon" type="button" aria-label="Back to partner">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create service relationship</h1>
          <p className="text-muted-foreground text-sm">
            Link this partner to a tenant and choose which catalog services apply.
          </p>
        </div>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Relationship details</CardTitle>
          <CardDescription>
            Services are rows in the platform partner_services catalog (CRM, Projects, Operations,
            billing, etc.). Tenants consume them through the partner; pick one or more services for
            this link.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-6"
          >
            <div className="grid gap-6 lg:grid-cols-2">
            <form.Field
              name="tenantId"
              validators={{
                onChange: ({ value }) => {
                  if (!value?.trim()) return 'Select a tenant';
                  return z.string().uuid().safeParse(value).success ? undefined : 'Select a valid tenant';
                },
                onSubmit: ({ value }) => {
                  if (!value?.trim()) return 'Select a tenant';
                  return z.string().uuid().safeParse(value).success ? undefined : 'Select a valid tenant';
                },
              }}
            >
              {(field) => (
                <FormField
                  label="Tenant"
                  required
                  error={
                    tenantsError
                      ? 'Failed to load tenants.'
                      : field.state.meta.errors[0]
                      ? String(field.state.meta.errors[0])
                      : undefined
                  }
                  hint={tenantsLoading ? 'Loading tenants…' : `${tenantList.length} tenant(s) available`}
                >
                  <Select
                    value={field.state.value || undefined}
                    onValueChange={(v) => field.handleChange(v)}
                    disabled={tenantsLoading || tenantList.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={tenantsLoading ? 'Loading…' : 'Select tenant'} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {tenantList.map((t) => (
                        <SelectItem key={t.tenantId} value={t.tenantId}>
                          {t.tenantName}{' '}
                          <span className="text-muted-foreground">({t.tenantCode})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            </form.Field>

            <form.Field
              name="requestedServices"
              validators={{
                onChange: ({ value }) =>
                  (Array.isArray(value) ? value : []).length > 0
                    ? undefined
                    : 'Select at least one service',
                onSubmit: ({ value }) =>
                  (Array.isArray(value) ? value : []).length > 0
                    ? undefined
                    : 'Select at least one service',
              }}
            >
              {(field) => (
                <div className="lg:col-span-1 min-w-0">
                  <FormField
                    label="Services"
                    required
                    error={
                      catalogError
                        ? 'Failed to load service catalog.'
                        : field.state.meta.errors[0]
                        ? String(field.state.meta.errors[0])
                        : undefined
                    }
                    hint={
                      catalogLoading
                        ? 'Loading catalog…'
                        : serviceOptions.length === 0
                        ? 'Seed catalog: pnpm --filter @partner-portal/backend db:seed-service-catalog'
                        : `${serviceOptions.length} catalog service(s)`
                    }
                  >
                    <MultiSelectCombobox
                      options={serviceOptions}
                      value={field.state.value ?? []}
                      onChange={(v) => {
                        field.handleChange(v);
                        const nextApps = buildApplicationOptions(catalog, v).map((o) => o.value);
                        const raw = form.getFieldValue('applications') as string[] | undefined;
                        const cur = Array.isArray(raw) ? raw : [];
                        form.setFieldValue('applications', cur.filter((a) => nextApps.includes(a)));
                      }}
                      placeholder={catalogLoading ? 'Loading…' : 'Select services…'}
                      searchPlaceholder="Search services…"
                      emptyMessage="No services match"
                      disabled={catalogLoading || serviceOptions.length === 0}
                    />
                  </FormField>
                  <ApplicationsField
                    formApi={form}
                    catalog={catalog}
                    selectedServiceIds={field.state.value}
                  />
                </div>
              )}
            </form.Field>
            </div>

            <form.Field name="startDate">
              {(field) => (
                <FormInput
                  label="Start date (optional)"
                  type="date"
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                />
              )}
            </form.Field>

            <form.Field name="notes">
              {(field) => (
                <FormTextarea
                  label="Notes (optional)"
                  value={field.state.value ?? ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  rows={4}
                  placeholder="Internal notes for this relationship"
                />
              )}
            </form.Field>

            <div className="sticky bottom-0 z-10 -mx-6 mt-2 flex flex-wrap justify-end gap-2 border-t bg-card/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
              <Link to="/partners/$partnerId" params={{ partnerId }}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create relationship'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
