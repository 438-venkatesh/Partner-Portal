import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enablementApi } from '@/lib/api/enablement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download } from 'lucide-react';

export function PartnerAssetsPage() {
  const queryClient = useQueryClient();
  const { data: assets, isLoading } = useQuery({ queryKey: ['partner-assets'], queryFn: enablementApi.listAssetsForPartner });

  const downloadMutation = useMutation({
    mutationFn: (assetId: string) => enablementApi.recordAssetDownload(assetId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partner-assets'] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marketing asset library</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : (assets ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No assets available yet.</p>
        ) : (
          (assets ?? []).map((asset) => (
            <div key={asset.assetId} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{asset.title}</p>
                <p className="text-muted-foreground">{asset.description}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {asset.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <a href={asset.fileUrl} target="_blank" rel="noreferrer" onClick={() => downloadMutation.mutate(asset.assetId)}>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </a>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
