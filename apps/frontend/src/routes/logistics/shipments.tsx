import { createFileRoute } from '@tanstack/react-router';
import { ShipmentListPage } from '@/features/logistics/pages/ShipmentListPage';

export const Route = createFileRoute('/logistics/shipments')({
  component: ShipmentListPage,
});

