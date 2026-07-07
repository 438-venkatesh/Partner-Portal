import { createFileRoute } from '@tanstack/react-router';
import { PartnerHealthPage } from '@/features/relationship/pages/PartnerHealthPage';

export const Route = createFileRoute('/partners/health')({
  component: PartnerHealthPage,
});
