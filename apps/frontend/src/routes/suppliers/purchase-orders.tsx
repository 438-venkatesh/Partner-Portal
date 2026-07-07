import { createFileRoute } from '@tanstack/react-router';
import { PurchaseOrderListPage } from '@/features/suppliers/pages/PurchaseOrderListPage';

export const Route = createFileRoute('/suppliers/purchase-orders')({
  component: PurchaseOrderListPage,
});

