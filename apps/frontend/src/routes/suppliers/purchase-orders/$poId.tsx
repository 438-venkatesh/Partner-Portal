import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router';
import { PurchaseOrderDetailPage } from '@/features/suppliers/pages/PurchaseOrderDetailPage';

export const Route = createFileRoute('/suppliers/purchase-orders/$poId')({
  component: PurchaseOrderDetailPage,
});










