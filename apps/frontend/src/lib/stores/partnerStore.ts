import { create } from 'zustand';
import type { PartnerResponse } from '@partner-portal/common';

interface PartnerState {
  selectedPartner: PartnerResponse | null;
  setSelectedPartner: (partner: PartnerResponse | null) => void;
  context: 'partner' | 'tenant';
  setContext: (context: 'partner' | 'tenant') => void;
}

export const usePartnerStore = create<PartnerState>((set) => ({
  selectedPartner: null,
  setSelectedPartner: (partner) => set({ selectedPartner: partner }),
  context: 'partner',
  setContext: (context) => set({ context }),
}));

