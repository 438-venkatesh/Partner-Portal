import { createFileRoute } from '@tanstack/react-router';
import { PartnerDetailPage } from '@/features/partners/pages/PartnerDetailPage';

export const Route = createFileRoute('/partners/$partnerId/')({
  component: PartnerDetailPage,
});
