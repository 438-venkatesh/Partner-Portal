import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db';
import { customFieldDefinitions, partners } from '../db/schema';
import type { CreateCustomFieldDefinitionInput } from '@partner-portal/common';

export const customFieldService = {
  async listDefinitions(entityType = 'partner') {
    return db
      .select()
      .from(customFieldDefinitions)
      .where(eq(customFieldDefinitions.entityType, entityType))
      .orderBy(asc(customFieldDefinitions.sortOrder), asc(customFieldDefinitions.createdAt));
  },

  async createDefinition(input: CreateCustomFieldDefinitionInput) {
    const [row] = await db
      .insert(customFieldDefinitions)
      .values({
        entityType: input.entityType ?? 'partner',
        fieldKey: input.fieldKey,
        label: input.label,
        fieldType: input.fieldType,
        options: input.options ?? [],
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();
    return row;
  },

  async updateDefinition(
    fieldId: string,
    patch: Partial<{ label: string; options: string[]; isActive: boolean; sortOrder: number }>
  ) {
    const [row] = await db
      .update(customFieldDefinitions)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(customFieldDefinitions.fieldId, fieldId))
      .returning();
    return row ?? null;
  },

  async deleteDefinition(fieldId: string) {
    await db.delete(customFieldDefinitions).where(eq(customFieldDefinitions.fieldId, fieldId));
  },

  /** Writes a value into the target entity's own jsonb metadata column, keyed by fieldKey. */
  async setPartnerFieldValue(partnerId: string, fieldKey: string, value: unknown) {
    const [existing] = await db
      .select({ metadata: partners.metadata })
      .from(partners)
      .where(eq(partners.partnerId, partnerId))
      .limit(1);
    if (!existing) throw new Error('Partner not found');

    const metadata = { ...((existing.metadata as Record<string, unknown>) ?? {}), [fieldKey]: value };

    const [row] = await db
      .update(partners)
      .set({ metadata, updatedAt: new Date() })
      .where(eq(partners.partnerId, partnerId))
      .returning();
    return row;
  },
};
