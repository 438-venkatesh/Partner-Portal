import { FastifyInstance } from 'fastify';
import { productService } from '../services/productService';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import { zodToFastifySchema } from '../utils/schemaConverter';

export async function productRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticate);

  // Get supplier products
  fastify.get('/suppliers/:supplierId/products', {
    schema: {
      params: zodToFastifySchema(z.object({ supplierId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const products = await productService.getSupplierProducts(
      request.params.supplierId,
      request.query
    );
    return reply.send(products);
  });

  // Get product by ID
  fastify.get('/products/:productId', {
    schema: {
      params: zodToFastifySchema(z.object({ productId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const product = await productService.getProductById(request.params.productId);
    return reply.send(product);
  });

  // Create product
  fastify.post('/suppliers/:supplierId/products', {
    schema: {
      params: zodToFastifySchema(z.object({ supplierId: z.string().uuid() })),
      body: zodToFastifySchema(z.object({
        productCode: z.string().min(1),
        productName: z.string().min(1),
        productCategory: z.enum(['raw_materials', 'components', 'finished_goods', 'mro', 'services', 'other']),
        description: z.string().optional(),
        specifications: z.record(z.unknown()).optional(),
        unitOfMeasure: z.string().default('piece'),
        unitPrice: z.number().nonnegative(),
        currency: z.string().length(3).default('USD'),
        minimumOrderQuantity: z.number().positive().default(1),
        leadTimeDays: z.number().int().positive().optional(),
        imageUrl: z.string().url().optional(),
        imageUrls: z.array(z.string().url()).optional(),
        tags: z.array(z.string()).optional(),
        metadata: z.record(z.unknown()).optional(),
      })),
    },
  }, async (request, reply) => {
    const product = await productService.createProduct(
      request.params.supplierId,
      request.body,
      request.user
    );
    return reply.code(201).send(product);
  });

  // Update product
  fastify.put('/products/:productId', {
    schema: {
      params: zodToFastifySchema(z.object({ productId: z.string().uuid() })),
      body: zodToFastifySchema(z.object({
        productName: z.string().min(1).optional(),
        description: z.string().optional(),
        specifications: z.record(z.unknown()).optional(),
        unitPrice: z.number().nonnegative().optional(),
        minimumOrderQuantity: z.number().positive().optional(),
        leadTimeDays: z.number().int().positive().optional(),
        status: z.enum(['active', 'inactive', 'discontinued', 'pending_approval']).optional(),
        imageUrl: z.string().url().optional(),
        imageUrls: z.array(z.string().url()).optional(),
        tags: z.array(z.string()).optional(),
        metadata: z.record(z.unknown()).optional(),
      })),
    },
  }, async (request, reply) => {
    const product = await productService.updateProduct(
      request.params.productId,
      request.body,
      request.user
    );
    return reply.send(product);
  });

  // Delete product
  fastify.delete('/products/:productId', {
    schema: {
      params: zodToFastifySchema(z.object({ productId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    await productService.deleteProduct(request.params.productId, request.user);
    return reply.code(204).send();
  });

  // Share catalog with tenant
  fastify.post('/suppliers/:supplierId/share-catalog', {
    schema: {
      params: zodToFastifySchema(z.object({ supplierId: z.string().uuid() })),
      body: zodToFastifySchema(z.object({
        tenantId: z.string().uuid(),
        productIds: z.array(z.string().uuid()).optional(), // null/empty means all products
      })),
    },
  }, async (request, reply) => {
    await productService.shareCatalog(
      request.params.supplierId,
      request.body.tenantId,
      request.body.productIds,
      request.user
    );
    return reply.code(204).send();
  });

  // Get shared catalog for tenant
  fastify.get('/tenants/:tenantId/catalog', {
    schema: {
      params: zodToFastifySchema(z.object({ tenantId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const catalog = await productService.getTenantCatalog(
      request.params.tenantId,
      request.query
    );
    return reply.send(catalog);
  });
}

