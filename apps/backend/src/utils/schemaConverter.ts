import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

/**
 * Convert Zod schema to JSON Schema for Fastify
 * Fastify requires JSON Schema format, not raw Zod schemas
 */
export function zodToFastifySchema(zodSchema: z.ZodTypeAny): any {
  return zodToJsonSchema(zodSchema, {
    target: 'jsonSchema7',
    strict: false,
    $refStrategy: 'none',
  });
}









