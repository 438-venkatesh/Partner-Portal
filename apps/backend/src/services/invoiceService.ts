import { db } from '../db';
import { supplierInvoices, invoicePayments } from '../db/schema/invoices';
import { eq, and, gte, lte } from 'drizzle-orm';

export const invoiceService = {
  async getSupplierInvoices(supplierId: string, query: {
    status?: string;
    tenantId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }) {
    const conditions: any[] = [eq(supplierInvoices.supplierId, supplierId)];

    if (query.status) {
      conditions.push(eq(supplierInvoices.status, query.status as any));
    }

    if (query.tenantId) {
      conditions.push(eq(supplierInvoices.tenantId, query.tenantId));
    }

    if (query.dateFrom) {
      conditions.push(gte(supplierInvoices.invoiceDate, query.dateFrom));
    }

    if (query.dateTo) {
      conditions.push(lte(supplierInvoices.invoiceDate, query.dateTo));
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const invoices = await db
      .select()
      .from(supplierInvoices)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(supplierInvoices.invoiceDate);

    const total = await db
      .select({ count: supplierInvoices.invoiceId })
      .from(supplierInvoices)
      .where(and(...conditions));

    return {
      invoices,
      pagination: {
        page,
        limit,
        total: total.length,
        totalPages: Math.ceil(total.length / limit),
      },
    };
  },

  async getInvoiceById(invoiceId: string) {
    const [invoice] = await db
      .select()
      .from(supplierInvoices)
      .where(eq(supplierInvoices.invoiceId, invoiceId))
      .limit(1);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Get payments for this invoice
    const payments = await db
      .select()
      .from(invoicePayments)
      .where(eq(invoicePayments.invoiceId, invoiceId));

    return {
      ...invoice,
      payments,
    };
  },

  async createInvoice(supplierId: string, data: {
    tenantId: string;
    poId?: string;
    invoiceDate?: string;
    dueDate: string;
    items: any[];
    subtotal: number;
    taxAmount?: number;
    discountAmount?: number;
    totalAmount: number;
    currency?: string;
    paymentTerms?: string;
    billingAddress?: Record<string, unknown>;
    notes?: string;
  }, user: any) {
    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const [invoice] = await db
      .insert(supplierInvoices)
      .values({
        supplierId,
        tenantId: data.tenantId,
        poId: data.poId,
        invoiceNumber,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
        dueDate: new Date(data.dueDate),
        items: data.items,
        subtotal: data.subtotal.toString(),
        taxAmount: (data.taxAmount || 0).toString(),
        discountAmount: (data.discountAmount || 0).toString(),
        totalAmount: data.totalAmount.toString(),
        currency: data.currency || 'USD',
        paymentTerms: data.paymentTerms,
        billingAddress: data.billingAddress,
        notes: data.notes,
        status: 'draft',
        paymentStatus: 'pending',
        paidAmount: '0',
        createdBy: user.userId,
      })
      .returning();

    return invoice;
  },

  async updateInvoice(invoiceId: string, data: {
    items?: any[];
    subtotal?: number;
    taxAmount?: number;
    discountAmount?: number;
    totalAmount?: number;
    dueDate?: string;
    status?: string;
    notes?: string;
  }, user: any) {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.items) updateData.items = data.items;
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal.toString();
    if (data.taxAmount !== undefined) updateData.taxAmount = data.taxAmount.toString();
    if (data.discountAmount !== undefined) updateData.discountAmount = data.discountAmount.toString();
    if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount.toString();
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
    if (data.status) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const [invoice] = await db
      .update(supplierInvoices)
      .set(updateData)
      .where(eq(supplierInvoices.invoiceId, invoiceId))
      .returning();

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return invoice;
  },

  async sendInvoice(invoiceId: string, user: any) {
    const [invoice] = await db
      .update(supplierInvoices)
      .set({
        status: 'sent',
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(supplierInvoices.invoiceId, invoiceId))
      .returning();

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return invoice;
  },

  /**
   * Wrapped in a transaction with a row lock on the invoice: two concurrent payments (a
   * double-click, a duplicate webhook) must not both read the same stale paidAmount and clobber
   * each other's update. A repeated transactionId for the same invoice is rejected outright.
   */
  async recordPayment(invoiceId: string, data: {
    paymentAmount: number;
    paymentDate: string;
    paymentMethod: string;
    paymentReference?: string;
    transactionId?: string;
    notes?: string;
  }, user: any) {
    return db.transaction(async (tx) => {
      if (data.transactionId) {
        const [duplicate] = await tx
          .select({ paymentId: invoicePayments.paymentId })
          .from(invoicePayments)
          .where(
            and(
              eq(invoicePayments.invoiceId, invoiceId),
              eq(invoicePayments.transactionId, data.transactionId)
            )
          )
          .limit(1);
        if (duplicate) {
          throw new Error('A payment with this transaction ID has already been recorded for this invoice');
        }
      }

      const [invoice] = await tx
        .select()
        .from(supplierInvoices)
        .where(eq(supplierInvoices.invoiceId, invoiceId))
        .for('update')
        .limit(1);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const [payment] = await tx
        .insert(invoicePayments)
        .values({
          invoiceId,
          paymentAmount: data.paymentAmount.toString(),
          paymentDate: new Date(data.paymentDate),
          paymentMethod: data.paymentMethod,
          paymentReference: data.paymentReference,
          transactionId: data.transactionId,
          notes: data.notes,
          status: 'paid',
          processedBy: user.userId,
          processedAt: new Date(),
        })
        .returning();

      const newPaid = parseFloat(invoice.paidAmount || '0') + data.paymentAmount;
      const totalAmount = parseFloat(invoice.totalAmount || '0');

      let paymentStatus: 'pending' | 'partial' | 'paid' = 'pending';
      if (newPaid >= totalAmount) {
        paymentStatus = 'paid';
      } else if (newPaid > 0) {
        paymentStatus = 'partial';
      }

      await tx
        .update(supplierInvoices)
        .set({
          paidAmount: newPaid.toString(),
          paymentStatus,
          paidAt: paymentStatus === 'paid' ? new Date() : invoice.paidAt,
          status: paymentStatus === 'paid' ? 'paid' : invoice.status,
          updatedAt: new Date(),
        })
        .where(eq(supplierInvoices.invoiceId, invoiceId));

      return payment;
    });
  },

  async getInvoicePayments(invoiceId: string) {
    const payments = await db
      .select()
      .from(invoicePayments)
      .where(eq(invoicePayments.invoiceId, invoiceId))
      .orderBy(invoicePayments.paymentDate);

    return { payments };
  },
};









