import { createFileRoute } from '@tanstack/react-router';
import { ComarketingAdminPage } from '@/features/comarketing/pages/ComarketingAdminPage';

export const Route = createFileRoute('/comarketing/')({
  component: ComarketingAdminPage,
});
