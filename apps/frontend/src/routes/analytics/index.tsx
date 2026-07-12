import { createFileRoute } from '@tanstack/react-router';
import { AnalyticsPage } from '@/features/analytics/pages/AnalyticsPage';

export const Route = createFileRoute('/analytics/')({
  component: AnalyticsPage,
});
