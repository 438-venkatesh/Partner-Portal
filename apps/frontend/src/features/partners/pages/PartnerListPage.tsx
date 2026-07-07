import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { partnerApi } from '@/lib/api/partners';
import { PartnerList } from '../components/PartnerList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { SummaryCard } from '@/components/ui/summary-card';
import { Users, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { DashboardSkeleton } from '@/components/ui/loading';
import { useToast } from '@/lib/hooks/use-toast';
import { Link } from '@tanstack/react-router';

export function PartnerListPage() {
  const { toast } = useToast();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['partners'],
    queryFn: () => partnerApi.getAll(),
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load partners. Please try again.",
        variant: "destructive",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const partners = (data as any)?.partners || [];
  const stats = {
    total: partners.length || 0,
    active: partners.filter((p: any) => p.status === 'active').length || 0,
    pending: partners.filter((p: any) => p.status === 'pending').length || 0,
    suspended: partners.filter((p: any) => p.status === 'suspended').length || 0,
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Partners</h1>
          <p className="text-muted-foreground">Manage your partner relationships</p>
        </div>
        <Link to="/partners/new" params={{} as any}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Partner
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          title="Total Partners"
          value={stats.total}
          icon={Users}
          iconColor="text-blue-600"
        />
        <SummaryCard
          title="Active"
          value={stats.active}
          icon={CheckCircle2}
          iconColor="text-green-600"
        />
        <SummaryCard
          title="Pending"
          value={stats.pending}
          icon={Clock}
          iconColor="text-yellow-600"
        />
        <SummaryCard
          title="Suspended"
          value={stats.suspended}
          icon={XCircle}
          iconColor="text-red-600"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Partner List</CardTitle>
          <CardDescription>View and manage all partners</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load partners. Please try again.
            </div>
          ) : (
            <PartnerList partners={partners} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

