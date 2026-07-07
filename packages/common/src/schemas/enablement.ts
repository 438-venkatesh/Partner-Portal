import { z } from 'zod';

export const createPlaybookSchema = z.object({
  title: z.string().min(1).max(200),
  dealStage: z.enum(['pending_review', 'approved', 'won', 'lost']).optional(),
  partnerType: z.string().max(50).optional(),
  content: z.string().min(1).max(20000),
  recommendedAssetIds: z.array(z.string().uuid()).optional(),
  isActive: z.boolean().optional(),
});

export const updatePlaybookSchema = createPlaybookSchema.partial();

export const createAssetSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(50).optional(),
  partnerType: z.string().max(50).optional(),
  minTier: z.string().max(50).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateAssetSchema = createAssetSchema.partial();

export type CreatePlaybookInput = z.infer<typeof createPlaybookSchema>;
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
