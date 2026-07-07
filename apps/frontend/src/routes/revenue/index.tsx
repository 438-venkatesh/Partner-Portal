import { createFileRoute } from '@tanstack/react-router';
import { RevenueAdminPage } from '@/features/revenue/pages/RevenueAdminPage';

export const Route = createFileRoute('/revenue/')({
  component: RevenueAdminPage,
});
