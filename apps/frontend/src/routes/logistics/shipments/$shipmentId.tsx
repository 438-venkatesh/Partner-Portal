import { createFileRoute } from '@tanstack/react-router';
import { ShipmentDetailPage } from '@/features/logistics/pages/ShipmentDetailPage';

export const Route = createFileRoute('/logistics/shipments/$shipmentId')({
  component: ShipmentDetailPage,
});










