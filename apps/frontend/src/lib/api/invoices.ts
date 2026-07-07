import { apiClient } from './client';

export interface InvoiceItem {
  itemId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Invoice {
  invoiceId: string;
  supplierId: string;
  tenantId: string;
  invoiceNumber: string;
  poId?: string;
  invoiceDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'disputed';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'failed' | 'refunded';
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  currency: string;
  paymentTerms?: string;
  billingAddress?: Record<string, any>;
  notes?: string;
  sentAt?: string;
  paidAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  payments?: Payment[];
}

export interface Payment {
  paymentId: string;
  invoiceId: string;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod: string;
  paymentReference?: string;
  transactionId?: string;
  status: 'pending' | 'partial' | 'paid' | 'failed' | 'refunded';
  notes?: string;
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
}

export interface CreateInvoiceData {
  tenantId: string;
  poId?: string;
  invoiceDate?: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  currency?: string;
  paymentTerms?: string;
  billingAddress?: Record<string, any>;
  notes?: string;
}

export interface RecordPaymentData {
  paymentAmount: number;
  paymentDate: string;
  paymentMethod: string;
  paymentReference?: string;
  transactionId?: string;
  notes?: string;
}

export const invoiceApi = {
  async getSupplierInvoices(
    supplierId: string,
    query?: {
      status?: string;
      tenantId?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ invoices: Invoice[]; pagination: any }> {
    const response = await apiClient.get(`/invoices/suppliers/${supplierId}/invoices`, {
      params: query,
    });
    return response.data;
  },

  async getInvoiceById(invoiceId: string): Promise<Invoice> {
    const response = await apiClient.get(`/invoices/invoices/${invoiceId}`);
    return response.data;
  },

  async createInvoice(supplierId: string, data: CreateInvoiceData): Promise<Invoice> {
    const response = await apiClient.post(`/invoices/suppliers/${supplierId}/invoices`, data);
    return response.data;
  },

  async updateInvoice(invoiceId: string, data: Partial<CreateInvoiceData>): Promise<Invoice> {
    const response = await apiClient.put(`/invoices/invoices/${invoiceId}`, data);
    return response.data;
  },

  async sendInvoice(invoiceId: string): Promise<void> {
    await apiClient.post(`/invoices/invoices/${invoiceId}/send`);
  },

  async recordPayment(invoiceId: string, data: RecordPaymentData): Promise<Payment> {
    const response = await apiClient.post(`/invoices/invoices/${invoiceId}/payments`, data);
    return response.data;
  },

  async getInvoicePayments(invoiceId: string): Promise<{ payments: Payment[] }> {
    const response = await apiClient.get(`/invoices/invoices/${invoiceId}/payments`);
    return response.data;
  },
};









