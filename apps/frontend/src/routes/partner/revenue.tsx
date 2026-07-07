import { createFileRoute } from '@tanstack/react-router';
import { PartnerRevenuePage } from '@/features/partner-revenue/pages/PartnerRevenuePage';

export const Route = createFileRoute('/partner/revenue')({
  component: PartnerRevenuePage,
});
