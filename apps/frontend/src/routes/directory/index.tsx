import { createFileRoute } from '@tanstack/react-router';
import { PartnerDirectoryPage } from '@/features/directory/pages/PartnerDirectoryPage';

export const Route = createFileRoute('/directory/')({
  component: PartnerDirectoryPage,
});
