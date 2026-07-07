import { apiClient } from './client';

export const logisticsApi = {
  getByPartnerId: async (partnerId: string) => {
    const { data } = await apiClient.get(`/logistics/by-partner/${partnerId}`);
    return data;
  },

  getShipments: async (logisticsId: string, query?: any) => {
    const { data } = await apiClient.get(`/logistics/${logisticsId}/shipments`, { params: query });
    return data;
  },

  getShipmentById: async (shipmentId: string) => {
    const { data } = await apiClient.get(`/logistics/shipments/${shipmentId}`);
    return data;
  },

  acceptShipment: async (shipmentId: string, accepted: boolean, assignedDriver?: string, vehicleNumber?: string) => {
    const { data } = await apiClient.post(`/logistics/shipments/${shipmentId}/accept`, {
      accepted,
      assignedDriver,
      vehicleNumber,
    });
    return data;
  },

  updateShipmentStatus: async (shipmentId: string, status: string, location?: any, description?: string) => {
    const { data } = await apiClient.put(`/logistics/shipments/${shipmentId}/status`, {
      status,
      location,
      description,
    });
    return data;
  },

  addTrackingEvent: async (shipmentId: string, eventType: string, location?: any, description?: string) => {
    const { data } = await apiClient.post(`/logistics/shipments/${shipmentId}/tracking`, {
      eventType,
      location,
      description,
    });
    return data;
  },

  uploadDeliveryProof: async (shipmentId: string, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await apiClient.post(`/logistics/shipments/${shipmentId}/delivery-proof`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
};

