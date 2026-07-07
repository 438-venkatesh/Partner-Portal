import { createFileRoute } from '@tanstack/react-router';
import { OnboardingSettingsPage } from '@/features/onboarding/pages/OnboardingSettingsPage';

export const Route = createFileRoute('/onboarding/settings')({
  component: OnboardingSettingsPage,
});
