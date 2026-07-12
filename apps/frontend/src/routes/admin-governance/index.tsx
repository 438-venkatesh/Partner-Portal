import { createFileRoute } from '@tanstack/react-router';
import { AdminGovernancePage } from '@/features/admin-governance/pages/AdminGovernancePage';

export const Route = createFileRoute('/admin-governance/')({
  component: AdminGovernancePage,
});
