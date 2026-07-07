import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticatePartner } from '../middleware/partnerAuth';
import { requireSupplierPartner } from '../middleware/requireSupplierPartner';
import { supplierOnboardingService } from '../services/supplierOnboardingService';
import { productService } from '../services/productService';
import { zodToFastifySchema } from '../utils/schemaConverter';

async function getPartnerSupplierId(partnerId: string) {
  const ctx = await supplierOnboardingService.getSupplierContext(partnerId);
  return ctx.supplierId;
}

async function assertProductOwned(productId: string, supplierId: string) {
  const product = await productService.getProductById(productId);
  if (product.supplierId !== supplierId) {
    throw new Error('Product not found');
  }
  return product;
}

export async function partnerSupplierCatalogRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', authenticatePartner);
  fastify.addHook('onRequest', requireSupplierPartner);

  fastify.get('/products', async (request, reply) => {
    const partnerId = request.partnerUser!.partnerId;
    const supplierId = await getPartnerSupplierId(partnerId);
    const products = await productService.getSupplierProducts(supplierId, request.query as any);
    return reply.send(products);
  });

  fastify.get('/products/:productId', {
    schema: {
      params: zodToFastifySchema(z.object({ productId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const partnerId = request.partnerUser!.partnerId;
    const supplierId = await getPartnerSupplierId(partnerId);
    try {
      const product = await assertProductOwned(request.params.productId, supplierId);
      return reply.send(product);
    } catch {
      return reply.code(404).send({ message: 'Product not found' });
    }
  });

  fastify.post('/products', {
    schema: {
      body: zodToFastifySchema(
        z.object({
          productCode: z.string().min(1),
          productName: z.string().min(1),
          productCategory: z.enum([
            'raw_materials',
            'components',
            'finished_goods',
            'mro',
            'services',
            'other',
          ]),
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
        })
      ),
    },
  }, async (request, reply) => {
    const partnerId = request.partnerUser!.partnerId;
    const supplierId = await getPartnerSupplierId(partnerId);
    const product = await productService.createProduct(
      supplierId,
      request.body as any,
      { partnerId }
    );
    return reply.code(201).send(product);
  });

  fastify.put('/products/:productId', {
    schema: {
      params: zodToFastifySchema(z.object({ productId: z.string().uuid() })),
      body: zodToFastifySchema(
        z.object({
          productName: z.string().min(1).optional(),
          description: z.string().optional(),
          specifications: z.record(z.unknown()).optional(),
          unitPrice: z.number().nonnegative().optional(),
          minimumOrderQuantity: z.number().positive().optional(),
          leadTimeDays: z.number().int().positive().optional(),
          imageUrl: z.string().url().optional(),
          imageUrls: z.array(z.string().url()).optional(),
          tags: z.array(z.string()).optional(),
          metadata: z.record(z.unknown()).optional(),
        })
      ),
    },
  }, async (request, reply) => {
    const partnerId = request.partnerUser!.partnerId;
    const supplierId = await getPartnerSupplierId(partnerId);
    try {
      await assertProductOwned(request.params.productId, supplierId);
      const product = await productService.updateProduct(
        request.params.productId,
        request.body as any,
        { partnerId }
      );
      return reply.send(product);
    } catch {
      return reply.code(404).send({ message: 'Product not found' });
    }
  });

  fastify.delete('/products/:productId', {
    schema: {
      params: zodToFastifySchema(z.object({ productId: z.string().uuid() })),
    },
  }, async (request, reply) => {
    const partnerId = request.partnerUser!.partnerId;
    const supplierId = await getPartnerSupplierId(partnerId);
    try {
      await assertProductOwned(request.params.productId, supplierId);
      await productService.deleteProduct(request.params.productId, { partnerId });
      return reply.code(204).send();
    } catch {
      return reply.code(404).send({ message: 'Product not found' });
    }
  });

  fastify.get('/products/count', async (request, reply) => {
    const partnerId = request.partnerUser!.partnerId;
    const supplierId = await getPartnerSupplierId(partnerId);
    const result = await productService.getSupplierProducts(supplierId, { limit: 1, page: 1 });
    return reply.send({ total: result.pagination.total });
  });
}
