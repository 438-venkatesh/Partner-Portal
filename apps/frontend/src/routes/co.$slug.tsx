import { createFileRoute } from '@tanstack/react-router';
import { CoMarketingMicrositePage } from '@/features/comarketing/pages/CoMarketingMicrositePage';

export const Route = createFileRoute('/co/$slug')({
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  return <CoMarketingMicrositePage slug={slug} />;
}
