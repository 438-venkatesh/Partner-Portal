import { createFileRoute } from '@tanstack/react-router';
import { SupplierDashboardPage } from '@/features/suppliers/pages/SupplierDashboardPage';

export const Route = createFileRoute('/suppliers/')({
  component: SupplierDashboardPage,
});

