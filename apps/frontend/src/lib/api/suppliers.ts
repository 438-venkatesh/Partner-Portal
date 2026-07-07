import { apiClient } from './client';

export const supplierApi = {
  getByPartnerId: async (partnerId: string) => {
    const { data } = await apiClient.get(`/suppliers/by-partner/${partnerId}`);
    return data;
  },

  getPurchaseOrders: async (supplierId: string, query?: any) => {
    const { data } = await apiClient.get(`/suppliers/${supplierId}/purchase-orders`, { params: query });
    return data;
  },

  getPurchaseOrderById: async (poId: string) => {
    const { data } = await apiClient.get(`/suppliers/purchase-orders/${poId}`);
    return data;
  },

  acknowledgePO: async (poId: string, acknowledged: boolean, modifications?: any, rejectionReason?: string) => {
    const { data } = await apiClient.post(`/suppliers/purchase-orders/${poId}/acknowledge`, {
      acknowledged,
      modifications,
      rejectionReason,
    });
    return data;
  },

  updatePOStatus: async (poId: string, status: string, trackingNumber?: string) => {
    const { data } = await apiClient.put(`/suppliers/purchase-orders/${poId}/status`, {
      status,
      trackingNumber,
    });
    return data;
  },
};

