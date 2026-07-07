import { createFileRoute } from '@tanstack/react-router';
import { TierSettingsPage } from '@/features/relationship/pages/TierSettingsPage';

export const Route = createFileRoute('/partner-tiers/')({
  component: TierSettingsPage,
});
