import { db } from '../db';
import { supplierProducts, productCatalogSharing } from '../db/schema/products';
import { eq, and, or, ilike } from 'drizzle-orm';

export const productService = {
  async getSupplierProducts(supplierId: string, query: {
    status?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const conditions: any[] = [eq(supplierProducts.supplierId, supplierId)];

    if (query.status) {
      conditions.push(eq(supplierProducts.status, query.status as any));
    }

    if (query.category) {
      conditions.push(eq(supplierProducts.productCategory, query.category as any));
    }

    if (query.search) {
      conditions.push(
        or(
          ilike(supplierProducts.productName, `%${query.search}%`),
          ilike(supplierProducts.productCode, `%${query.search}%`)
        )!
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const products = await db
      .select()
      .from(supplierProducts)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    const total = await db
      .select({ count: supplierProducts.productId })
      .from(supplierProducts)
      .where(and(...conditions));

    return {
      products,
      pagination: {
        page,
        limit,
        total: total.length,
        totalPages: Math.ceil(total.length / limit),
      },
    };
  },

  async getProductById(productId: string) {
    const [product] = await db
      .select()
      .from(supplierProducts)
      .where(eq(supplierProducts.productId, productId))
      .limit(1);

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  },

  async createProduct(supplierId: string, data: {
    productCode: string;
    productName: string;
    productCategory: string;
    description?: string;
    specifications?: Record<string, unknown>;
    unitOfMeasure?: string;
    unitPrice: number;
    currency?: string;
    minimumOrderQuantity?: number;
    leadTimeDays?: number;
    imageUrl?: string;
    imageUrls?: string[];
    tags?: string[];
    metadata?: Record<string, unknown>;
  }, user: any) {
    const [product] = await db
      .insert(supplierProducts)
      .values({
        supplierId,
        productCode: data.productCode,
        productName: data.productName,
        productCategory: data.productCategory as any,
        description: data.description,
        specifications: data.specifications || {},
        unitOfMeasure: data.unitOfMeasure || 'piece',
        unitPrice: data.unitPrice.toString(),
        currency: data.currency || 'USD',
        minimumOrderQuantity: data.minimumOrderQuantity?.toString() || '1',
        leadTimeDays: data.leadTimeDays,
        imageUrl: data.imageUrl,
        imageUrls: data.imageUrls || [],
        tags: data.tags || [],
        metadata: data.metadata || {},
        status: 'pending_approval',
        isActive: true,
      })
      .returning();

    return product;
  },

  async updateProduct(productId: string, data: {
    productName?: string;
    description?: string;
    specifications?: Record<string, unknown>;
    unitPrice?: number;
    minimumOrderQuantity?: number;
    leadTimeDays?: number;
    status?: string;
    imageUrl?: string;
    imageUrls?: string[];
    tags?: string[];
    metadata?: Record<string, unknown>;
  }, user: any) {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.productName) updateData.productName = data.productName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.specifications) updateData.specifications = data.specifications;
    if (data.unitPrice !== undefined) updateData.unitPrice = data.unitPrice.toString();
    if (data.minimumOrderQuantity !== undefined) updateData.minimumOrderQuantity = data.minimumOrderQuantity.toString();
    if (data.leadTimeDays !== undefined) updateData.leadTimeDays = data.leadTimeDays;
    if (data.status) updateData.status = data.status;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.imageUrls !== undefined) updateData.imageUrls = data.imageUrls;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    const [product] = await db
      .update(supplierProducts)
      .set(updateData)
      .where(eq(supplierProducts.productId, productId))
      .returning();

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  },

  async deleteProduct(productId: string, user: any) {
    // Soft delete by setting isActive to false
    await db
      .update(supplierProducts)
      .set({ isActive: false, status: 'discontinued' })
      .where(eq(supplierProducts.productId, productId));
  },

  async shareCatalog(supplierId: string, tenantId: string, productIds: string[] | undefined, user: any) {
    if (productIds && productIds.length > 0) {
      // Share specific products
      await db.insert(productCatalogSharing).values(
        productIds.map((productId) => ({
          supplierId,
          tenantId,
          productId,
          sharedBy: user.userId,
        }))
      );
    } else {
      // Share all products (productId is null)
      await db.insert(productCatalogSharing).values({
        supplierId,
        tenantId,
        productId: null as any,
        sharedBy: user.userId,
      });
    }
  },

  async getTenantCatalog(tenantId: string, query: {
    supplierId?: string;
    category?: string;
    search?: string;
  }) {
    const conditions: any[] = [eq(productCatalogSharing.tenantId, tenantId)];
    conditions.push(eq(productCatalogSharing.isActive, true));

    if (query.supplierId) {
      conditions.push(eq(productCatalogSharing.supplierId, query.supplierId));
    }

    const sharedCatalogs = await db
      .select({
        sharing: productCatalogSharing,
        product: supplierProducts,
      })
      .from(productCatalogSharing)
      .leftJoin(supplierProducts, eq(productCatalogSharing.productId, supplierProducts.productId))
      .where(and(...conditions));

    // Filter products based on query
    let products = sharedCatalogs
      .map((sc) => sc.product)
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (query.category) {
      products = products.filter((p) => p.productCategory === query.category);
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      products = products.filter(
        (p) =>
          p.productName.toLowerCase().includes(searchLower) ||
          p.productCode.toLowerCase().includes(searchLower)
      );
    }

    return { products };
  },
};









