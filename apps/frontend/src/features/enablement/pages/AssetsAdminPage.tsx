import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enablementApi } from '@/lib/api/enablement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/lib/hooks/use-toast';
import { Download, Plus, Trash2 } from 'lucide-react';
import type { MarketingAsset } from '@/lib/api/enablement';

export function AssetsAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [meta, setMeta] = useState({ title: '', category: '', tags: '' });

  const { data: assets, isLoading } = useQuery({ queryKey: ['marketing-assets'], queryFn: enablementApi.listAssets });

  const uploadMutation = useMutation({
    mutationFn: () => enablementApi.uploadAsset(pendingFile!, meta),
    onSuccess: () => {
      toast({ title: 'Asset uploaded' });
      queryClient.invalidateQueries({ queryKey: ['marketing-assets'] });
      setUploadOpen(false);
      setPendingFile(null);
      setMeta({ title: '', category: '', tags: '' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.response?.data?.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (assetId: string) => enablementApi.deleteAsset(assetId),
    onSuccess: () => {
      toast({ title: 'Asset deleted' });
      queryClient.invalidateQueries({ queryKey: ['marketing-assets'] });
    },
  });

  const toggleCoBrandingMutation = useMutation({
    mutationFn: (asset: MarketingAsset) => enablementApi.updateAsset(asset.assetId, { allowCoBranding: !asset.allowCoBranding }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marketing-assets'] }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Marketing asset library</CardTitle>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setPendingFile(file);
                setMeta((m) => ({ ...m, title: m.title || file.name }));
                setUploadOpen(true);
              }
              e.target.value = '';
            }}
          />
          <Button size="sm" onClick={() => fileInputRef.current?.click()}>
            <Plus className="mr-2 h-4 w-4" />
            Upload asset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : (
          (assets ?? []).map((asset) => (
            <div key={asset.assetId} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{asset.title}</p>
                <p className="text-muted-foreground">
                  {asset.category} · {asset.downloadCount} downloads
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {asset.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    checked={asset.allowCoBranding}
                    onCheckedChange={() => toggleCoBrandingMutation.mutate(asset)}
                  />
                  Co-brandable
                </label>
                <a href={asset.fileUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </a>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(asset.assetId)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={uploadOpen} onOpenChange={(open) => !open && setUploadOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{pendingFile?.name}</p>
            <FormInput label="Title" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
            <FormInput label="Category" value={meta.category} onChange={(e) => setMeta({ ...meta, category: e.target.value })} />
            <FormInput label="Tags (comma-separated)" value={meta.tags} onChange={(e) => setMeta({ ...meta, tags: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!meta.title.trim() || uploadMutation.isPending} onClick={() => uploadMutation.mutate()}>
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
