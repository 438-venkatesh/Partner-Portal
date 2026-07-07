import { createFileRoute } from '@tanstack/react-router';
import { PartnerSupplierCatalogPage } from '@/features/partner-supplier-onboarding/PartnerSupplierCatalogPage';

export const Route = createFileRoute('/partner/onboarding/supplier/catalog')({
  component: PartnerSupplierCatalogPage,
});
