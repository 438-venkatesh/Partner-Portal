import { createFileRoute, redirect } from '@tanstack/react-router';
import { ServiceOnboardingStagePage } from '@/features/partner-service-onboarding/ServiceOnboardingStagePage';
import type { OnboardingStage } from '@/lib/api/onboarding';
import { ONBOARDING_TRACK_CONFIG } from '@/lib/partnerOnboardingStages';

const VALID_STAGES = new Set(ONBOARDING_TRACK_CONFIG.service.stageOrder);

export const Route = createFileRoute('/partner/onboarding/service/$stage')({
  beforeLoad: ({ params }) => {
    if (!VALID_STAGES.has(params.stage as OnboardingStage)) {
      throw redirect({ to: '/partner/onboarding' });
    }
  },
  component: ServiceStageRoute,
});

function ServiceStageRoute() {
  const { stage } = Route.useParams();
  return <ServiceOnboardingStagePage stage={stage as OnboardingStage} />;
}
