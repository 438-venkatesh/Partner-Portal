import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { partnerApi } from '@/lib/api/partners';
import { PartnerEditForm } from '@/features/partners/components/PartnerEditForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { CardSkeleton } from '@/components/ui/loading';

export const Route = createFileRoute('/partners/$partnerId/edit')({
  component: PartnerEditPage,
});

function PartnerEditPage() {
  const { partnerId } = useParams({ from: '/partners/$partnerId/edit' });
  const navigate = useNavigate();

  const { data: partner, isLoading } = useQuery({
    queryKey: ['partners', partnerId],
    queryFn: () => partnerApi.getById(partnerId),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" disabled>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="text-center py-8 text-destructive">
        Partner not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/partners/$partnerId', params: { partnerId } })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Partner</h1>
          <p className="text-muted-foreground">{partner.partnerCode}</p>
        </div>
      </div>

      <PartnerEditForm
        partner={partner}
        onSuccess={() => {
          navigate({ to: '/partners/$partnerId', params: { partnerId } });
        }}
        onCancel={() => {
          navigate({ to: '/partners/$partnerId', params: { partnerId } });
        }}
      />
    </div>
  );
}










