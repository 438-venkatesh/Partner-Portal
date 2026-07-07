import { createFileRoute, redirect } from '@tanstack/react-router';
import { SupplierOnboardingStagePage } from '@/features/partner-supplier-onboarding/SupplierOnboardingStagePage';
import type { SupplierOnboardingStage } from '@/lib/api/onboarding';
import { ONBOARDING_TRACK_CONFIG } from '@/lib/partnerOnboardingStages';

const VALID_STAGES = new Set(ONBOARDING_TRACK_CONFIG.supplier.stageOrder);

export const Route = createFileRoute('/partner/onboarding/supplier/$stage')({
  beforeLoad: ({ params }) => {
    if (params.stage === 'catalog') {
      throw redirect({ to: '/partner/onboarding/supplier/catalog' });
    }
    if (!VALID_STAGES.has(params.stage as SupplierOnboardingStage)) {
      throw redirect({ to: '/partner/onboarding' });
    }
  },
  component: SupplierStageRoute,
});

function SupplierStageRoute() {
  const { stage } = Route.useParams();
  return <SupplierOnboardingStagePage stage={stage as SupplierOnboardingStage} />;
}
