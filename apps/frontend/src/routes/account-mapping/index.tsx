import { createFileRoute } from '@tanstack/react-router';
import { AccountMappingPage } from '@/features/relationship/pages/AccountMappingPage';

export const Route = createFileRoute('/account-mapping/')({
  component: AccountMappingPage,
});
