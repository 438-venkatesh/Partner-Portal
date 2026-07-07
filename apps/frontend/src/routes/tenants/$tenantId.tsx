import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { tenantsApi, type UpdateTenantInput } from '@/lib/api/tenants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/lib/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

export const Route = createFileRoute('/tenants/$tenantId')({
  component: TenantDetailPage,
});

function TenantDetailPage() {
  const { tenantId } = Route.useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenants', tenantId],
    queryFn: () => tenantsApi.get(tenantId),
  });

  const tenant = data?.tenant;
  const [edit, setEdit] = useState<UpdateTenantInput>({});

  useEffect(() => {
    if (!tenant) return;
    setEdit({
      tenantName: tenant.tenantName,
      industry: tenant.industry ?? '',
      contactEmail: tenant.contactEmail ?? '',
      status: tenant.status as UpdateTenantInput['status'],
    });
  }, [tenant]);

  const updateMutation = useMutation({
    mutationFn: () => tenantsApi.update(tenantId, edit),
    onSuccess: () => {
      toast({ title: 'Saved', description: 'Tenant updated.' });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId] });
    },
    onError: (e: any) => {
      toast({
        title: 'Update failed',
        description: e?.message ?? 'Could not save',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground p-6">Loading…</p>;
  }

  if (error || !tenant) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="outline" type="button" onClick={() => navigate({ to: '/tenants' })}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <p className="text-destructive text-sm">Tenant not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <Link to="/tenants">
          <Button variant="ghost" size="icon" type="button" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tenant.tenantName}</h1>
          <p className="text-muted-foreground text-sm font-mono">{tenant.tenantCode}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit tenant</CardTitle>
          <CardDescription>Tenant code is fixed after creation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="outline">{tenant.status}</Badge>
          </div>
          <FormInput
            label="Tenant name"
            required
            value={edit.tenantName ?? ''}
            onChange={(e) => setEdit((x) => ({ ...x, tenantName: e.target.value }))}
          />
          <FormInput
            label="Industry"
            value={edit.industry ?? ''}
            onChange={(e) => setEdit((x) => ({ ...x, industry: e.target.value }))}
          />
          <FormInput
            label="Contact email"
            type="email"
            value={edit.contactEmail ?? ''}
            onChange={(e) => setEdit((x) => ({ ...x, contactEmail: e.target.value }))}
          />
          <div className="space-y-2">
            <span className="text-sm font-medium">Status</span>
            <Select
              value={edit.status ?? tenant.status}
              onValueChange={(v) =>
                setEdit((x) => ({ ...x, status: v as UpdateTenantInput['status'] }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="inactive">inactive</SelectItem>
                <SelectItem value="suspended">suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            disabled={updateMutation.isPending || !(edit.tenantName ?? '').trim()}
            onClick={() => updateMutation.mutate()}
          >
            {updateMutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
