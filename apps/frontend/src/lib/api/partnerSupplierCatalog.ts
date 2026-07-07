import { partnerApiClient } from './partnerClient';
import type { CreateProductData, Product, UpdateProductData } from './products';

export const partnerSupplierCatalogApi = {
  getProducts: async (query?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const { data } = await partnerApiClient.get<{
      products: Product[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/partner-supplier-catalog/products', { params: query });
    return data;
  },

  getProductCount: async () => {
    const { data } = await partnerApiClient.get<{ total: number }>(
      '/partner-supplier-catalog/products/count'
    );
    return data.total;
  },

  createProduct: async (payload: CreateProductData) => {
    const { data } = await partnerApiClient.post<Product>('/partner-supplier-catalog/products', payload);
    return data;
  },

  updateProduct: async (productId: string, payload: UpdateProductData) => {
    const { data } = await partnerApiClient.put<Product>(
      `/partner-supplier-catalog/products/${productId}`,
      payload
    );
    return data;
  },

  deleteProduct: async (productId: string) => {
    await partnerApiClient.delete(`/partner-supplier-catalog/products/${productId}`);
  },
};
