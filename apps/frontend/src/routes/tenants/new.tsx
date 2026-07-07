import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { tenantsApi, type CreateTenantInput } from '@/lib/api/tenants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-field';
import { useToast } from '@/lib/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/tenants/new')({
  component: TenantNewPage,
});

function TenantNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState<CreateTenantInput>({
    tenantCode: '',
    tenantName: '',
    industry: '',
    contactEmail: '',
  });

  const createMutation = useMutation({
    mutationFn: () =>
      tenantsApi.create({
        tenantCode: form.tenantCode.trim(),
        tenantName: form.tenantName.trim(),
        industry: form.industry?.trim() || undefined,
        contactEmail: form.contactEmail?.trim() || undefined,
      }),
    onSuccess: (data) => {
      toast({ title: 'Tenant created', description: data.tenant.tenantName });
      navigate({ to: '/tenants/$tenantId', params: { tenantId: data.tenant.tenantId } });
    },
    onError: (e: any) => {
      toast({
        title: 'Create failed',
        description: e?.message ?? 'Could not create tenant',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <Link to="/tenants">
          <Button variant="ghost" size="icon" type="button" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New tenant</h1>
          <p className="text-muted-foreground text-sm">Create a tenant organization.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant details</CardTitle>
          <CardDescription>Tenant code must be unique.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormInput
            label="Tenant code"
            required
            value={form.tenantCode}
            onChange={(e) => setForm((f) => ({ ...f, tenantCode: e.target.value }))}
            placeholder="TEN-CODE-001"
          />
          <FormInput
            label="Tenant name"
            required
            value={form.tenantName}
            onChange={(e) => setForm((f) => ({ ...f, tenantName: e.target.value }))}
            placeholder="Acme Corp"
          />
          <FormInput
            label="Industry (optional)"
            value={form.industry ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
          />
          <FormInput
            label="Contact email (optional)"
            type="email"
            value={form.contactEmail ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
          />
          <Button
            type="button"
            disabled={
              createMutation.isPending || !form.tenantCode.trim() || !form.tenantName.trim()
            }
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? 'Creating…' : 'Create tenant'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
