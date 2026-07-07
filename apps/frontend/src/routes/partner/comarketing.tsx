import { createFileRoute } from '@tanstack/react-router';
import { PartnerComarketingPage } from '@/features/partner-comarketing/pages/PartnerComarketingPage';

export const Route = createFileRoute('/partner/comarketing')({
  component: PartnerComarketingPage,
});
