import { createFileRoute } from '@tanstack/react-router';
import { EnablementAdminPage } from '@/features/enablement/pages/EnablementAdminPage';

export const Route = createFileRoute('/enablement/')({
  component: EnablementAdminPage,
});
