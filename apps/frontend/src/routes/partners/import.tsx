import { createFileRoute } from '@tanstack/react-router';
import { PartnerImportPage } from '@/features/partners/pages/PartnerImportPage';

export const Route = createFileRoute('/partners/import')({
  component: PartnerImportPage,
});
