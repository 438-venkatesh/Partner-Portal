import { createFileRoute } from '@tanstack/react-router';
import { PartnerForm } from '@/features/partners/components/PartnerForm';

export const Route = createFileRoute('/partners/new')({
  component: () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Partner</h1>
        <p className="text-muted-foreground">Add a new partner to the system</p>
      </div>
      <PartnerForm />
    </div>
  ),
});

