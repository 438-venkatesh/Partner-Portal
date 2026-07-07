import { createFileRoute } from '@tanstack/react-router';
import { LogisticsDashboardPage } from '@/features/logistics/pages/LogisticsDashboardPage';

export const Route = createFileRoute('/logistics/')({
  component: LogisticsDashboardPage,
});

