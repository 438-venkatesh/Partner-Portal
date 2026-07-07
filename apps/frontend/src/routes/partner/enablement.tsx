import { createFileRoute } from '@tanstack/react-router';
import { PartnerEnablementPage } from '@/features/partner-enablement/pages/PartnerEnablementPage';

export const Route = createFileRoute('/partner/enablement')({
  component: PartnerEnablementPage,
});
