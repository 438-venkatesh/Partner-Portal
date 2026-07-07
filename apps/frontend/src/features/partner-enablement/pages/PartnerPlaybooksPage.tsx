import { useQuery } from '@tanstack/react-query';
import { enablementApi } from '@/lib/api/enablement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function PartnerPlaybooksPage() {
  const { data: playbooks, isLoading } = useQuery({
    queryKey: ['partner-playbooks'],
    queryFn: () => enablementApi.listPlaybooksForPartner(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales playbooks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : (playbooks ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No playbooks available yet.</p>
        ) : (
          (playbooks ?? []).map((playbook) => (
            <div key={playbook.playbookId} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium">{playbook.title}</p>
                {playbook.dealStage && (
                  <Badge variant="outline" className="capitalize">
                    {playbook.dealStage.replace('_', ' ')}
                  </Badge>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{playbook.content}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
