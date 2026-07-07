import { createFileRoute } from '@tanstack/react-router';
import { PartnerListPage } from '@/features/partners/pages/PartnerListPage';

export const Route = createFileRoute('/partners/')({
  component: PartnerListPage,
});

