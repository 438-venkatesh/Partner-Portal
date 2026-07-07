import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enablementApi, type CatalogService } from '@/lib/api/enablement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormInput, FormTextarea } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/lib/hooks/use-toast';
import { Plus, Trash2, Upload } from 'lucide-react';

export function ServiceCatalogAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ serviceCode: '', serviceName: '', serviceCategory: '', description: '' });

  const { data: services, isLoading } = useQuery({ queryKey: ['catalog-services'], queryFn: enablementApi.listAllServices });

  const createMutation = useMutation({
    mutationFn: () =>
      enablementApi.createService({
        serviceCode: form.serviceCode,
        serviceName: form.serviceName,
        serviceCategory: form.serviceCategory,
        description: form.description || undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Service created' });
      queryClient.invalidateQueries({ queryKey: ['catalog-services'] });
      setCreating(false);
      setForm({ serviceCode: '', serviceName: '', serviceCategory: '', description: '' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.response?.data?.message, variant: 'destructive' }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (service: CatalogService) => enablementApi.updateService(service.serviceId, { isActive: !service.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog-services'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => enablementApi.deleteService(deleteId!),
    onSuccess: () => {
      toast({ title: 'Service deleted' });
      queryClient.invalidateQueries({ queryKey: ['catalog-services'] });
      setDeleteId(null);
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => enablementApi.importServicesCsv(file),
    onSuccess: (report) => {
      toast({ title: `Import complete: ${report.succeeded} created, ${report.failed} failed` });
      queryClient.invalidateQueries({ queryKey: ['catalog-services'] });
    },
    onError: (error: any) => toast({ title: 'Import error', description: error.response?.data?.message, variant: 'destructive' }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Service catalog</CardTitle>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importMutation.mutate(file);
              e.target.value = '';
            }}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New service
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {creating && (
          <div className="grid grid-cols-2 gap-3 rounded-md border p-3">
            <FormInput label="Service code" value={form.serviceCode} onChange={(e) => setForm({ ...form, serviceCode: e.target.value })} />
            <FormInput label="Service name" value={form.serviceName} onChange={(e) => setForm({ ...form, serviceName: e.target.value })} />
            <FormInput label="Category" value={form.serviceCategory} onChange={(e) => setForm({ ...form, serviceCategory: e.target.value })} />
            <FormTextarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            <div className="col-span-2 flex gap-2">
              <Button
                disabled={!form.serviceCode.trim() || !form.serviceName.trim() || !form.serviceCategory.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
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
          (services ?? []).map((service) => (
            <div key={service.serviceId} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">
                  {service.serviceName} <span className="text-muted-foreground">({service.serviceCode})</span>
                </p>
                <p className="text-muted-foreground">{service.serviceCategory}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={service.isActive ? 'success' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleActiveMutation.mutate(service)}
                >
                  {service.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => setDeleteId(service.serviceId)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete service</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
