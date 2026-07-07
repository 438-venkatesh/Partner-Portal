import { createFileRoute } from '@tanstack/react-router';
import { AdminPartnerOperationsPage } from '@/features/partner-operations/pages/AdminPartnerOperationsPage';

type PartnerOperationsSearch = {
  tab?: 'queue' | 'catalog';
};

export const Route = createFileRoute('/partner-operations/')({
  validateSearch: (search: Record<string, unknown>): PartnerOperationsSearch => ({
    tab: search.tab === 'catalog' ? 'catalog' : search.tab === 'queue' ? 'queue' : undefined,
  }),
  component: AdminPartnerOperationsPage,
});
