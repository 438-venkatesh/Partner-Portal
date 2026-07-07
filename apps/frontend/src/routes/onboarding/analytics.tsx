import { createFileRoute } from '@tanstack/react-router';
import { OnboardingAnalyticsPage } from '@/features/onboarding/pages/OnboardingAnalyticsPage';

export const Route = createFileRoute('/onboarding/analytics')({
  component: OnboardingAnalyticsPage,
});
