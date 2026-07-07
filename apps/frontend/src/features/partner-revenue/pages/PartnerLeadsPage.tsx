import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '@/lib/api/leads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/lib/hooks/use-toast';

export function PartnerLeadsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: leads, isLoading } = useQuery({ queryKey: ['my-leads'], queryFn: leadsApi.listMine });

  const respondMutation = useMutation({
    mutationFn: (input: { leadId: string; accepted: boolean }) => leadsApi.respond(input.leadId, input.accepted),
    onSuccess: (_, input) => {
      toast({ title: input.accepted ? 'Lead accepted' : 'Lead passed to another partner' });
      queryClient.invalidateQueries({ queryKey: ['my-leads'] });
    },
  });

  if (isLoading) return <Skeleton className="h-48" />;
  if (!leads || leads.length === 0) {
    return <p className="text-sm text-muted-foreground">No leads assigned to you yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {leads.map((lead) => (
        <Card key={lead.leadId}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{lead.customerName}</CardTitle>
            <Badge variant="outline" className="capitalize">
              {lead.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lead.contactEmail && <p className="text-muted-foreground">{lead.contactEmail}</p>}
            {lead.status === 'assigned' && (
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => respondMutation.mutate({ leadId: lead.leadId, accepted: true })}>
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => respondMutation.mutate({ leadId: lead.leadId, accepted: false })}
                >
                  Pass
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
