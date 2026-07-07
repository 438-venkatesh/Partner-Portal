import { createFileRoute } from '@tanstack/react-router';
import { PartnerPrivacyPage } from '@/features/partner-compliance/pages/PartnerPrivacyPage';

export const Route = createFileRoute('/partner/privacy')({
  component: PartnerPrivacyPage,
});
