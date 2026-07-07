import { apiClient } from './client';

export interface Product {
  productId: string;
  supplierId: string;
  productCode: string;
  productName: string;
  productCategory: string;
  description?: string;
  specifications?: Record<string, any>;
  unitOfMeasure: string;
  unitPrice: number;
  currency: string;
  minimumOrderQuantity: number;
  leadTimeDays?: number;
  status: 'active' | 'inactive' | 'discontinued' | 'pending_approval';
  imageUrl?: string;
  imageUrls?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductData {
  productCode: string;
  productName: string;
  productCategory: string;
  description?: string;
  specifications?: Record<string, any>;
  unitOfMeasure?: string;
  unitPrice: number;
  currency?: string;
  minimumOrderQuantity?: number;
  leadTimeDays?: number;
  imageUrl?: string;
  imageUrls?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateProductData {
  productName?: string;
  description?: string;
  specifications?: Record<string, any>;
  unitPrice?: number;
  minimumOrderQuantity?: number;
  leadTimeDays?: number;
  status?: 'active' | 'inactive' | 'discontinued' | 'pending_approval';
  imageUrl?: string;
  imageUrls?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export const productApi = {
  async getSupplierProducts(
    supplierId: string,
    query?: {
      status?: string;
      category?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ products: Product[]; pagination: any }> {
    const response = await apiClient.get(`/products/suppliers/${supplierId}/products`, {
      params: query,
    });
    return response.data;
  },

  async getProductById(productId: string): Promise<Product> {
    const response = await apiClient.get(`/products/products/${productId}`);
    return response.data;
  },

  async createProduct(supplierId: string, data: CreateProductData): Promise<Product> {
    const response = await apiClient.post(`/products/suppliers/${supplierId}/products`, data);
    return response.data;
  },

  async updateProduct(productId: string, data: UpdateProductData): Promise<Product> {
    const response = await apiClient.put(`/products/products/${productId}`, data);
    return response.data;
  },

  async deleteProduct(productId: string): Promise<void> {
    await apiClient.delete(`/products/products/${productId}`);
  },

  async shareCatalog(supplierId: string, tenantId: string, productIds?: string[]): Promise<void> {
    await apiClient.post(`/products/suppliers/${supplierId}/share-catalog`, {
      tenantId,
      productIds,
    });
  },

  async getTenantCatalog(
    tenantId: string,
    query?: { supplierId?: string; category?: string; search?: string }
  ): Promise<{ products: Product[] }> {
    const response = await apiClient.get(`/products/tenants/${tenantId}/catalog`, {
      params: query,
    });
    return response.data;
  },
};









