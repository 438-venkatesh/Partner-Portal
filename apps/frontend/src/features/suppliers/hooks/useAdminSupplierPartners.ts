import { useQuery } from '@tanstack/react-query';
import { partnerApi } from '@/lib/api/partners';
import { supplierApi } from '@/lib/api/suppliers';
import type { PartnerResponse } from '@partner-portal/common';

export interface AdminSupplierOption {
  partnerId: string;
  partnerName: string;
  partnerType: string;
  supplierId: string;
}

async function loadSupplierPartners(): Promise<AdminSupplierOption[]> {
  const { partners } = await partnerApi.getAll({ limit: 200 });
  const supplierLike = partners.filter(
    (p) => p.partnerType === 'supplier' || p.partnerType === 'supplier_logistics'
  );

  const results = await Promise.all(
    supplierLike.map(async (partner) => {
      try {
        const supplier = await supplierApi.getByPartnerId(partner.partnerId);
        const supplierId = (supplier as { supplierId?: string })?.supplierId;
        if (!supplierId) return null;
        return {
          partnerId: partner.partnerId,
          partnerName: partner.partnerName,
          partnerType: String(partner.partnerType),
          supplierId,
        };
      } catch {
        return null;
      }
    })
  );

  return results.filter((r) => r != null) as AdminSupplierOption[];
}

export function useAdminSupplierPartners() {
  return useQuery({
    queryKey: ['admin-supplier-partners'],
    queryFn: loadSupplierPartners,
    staleTime: 60_000,
  });
}

export function findSupplierPartner(
  options: AdminSupplierOption[] | undefined,
  supplierId: string | null
): AdminSupplierOption | undefined {
  if (!supplierId || !options) return undefined;
  return options.find((o) => o.supplierId === supplierId);
}

export type { PartnerResponse };
