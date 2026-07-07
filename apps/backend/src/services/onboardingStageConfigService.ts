import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { onboardingStageSettings } from '../db/schema';
import {
  PARTNER_ONBOARDING_STAGE_ORDER,
  PARTNER_STAGE_LABELS,
  applyStageOverrides,
  getPartnerOnboardingStageOrder,
  type PartnerOnboardingStageCode,
} from '@partner-portal/common';

type StageOverride = { isEnabled?: boolean; sortOrder?: number };
type StageOverrideMap = Partial<Record<PartnerOnboardingStageCode, StageOverride>>;

export const onboardingStageConfigService = {
  /** Raw DB overrides for a partner type, keyed by stage code. */
  async getOverridesMap(partnerType: string): Promise<StageOverrideMap> {
    const rows = await db
      .select()
      .from(onboardingStageSettings)
      .where(eq(onboardingStageSettings.partnerType, partnerType));

    const map: StageOverrideMap = {};
    for (const row of rows) {
      map[row.stageCode as PartnerOnboardingStageCode] = {
        isEnabled: row.isEnabled ?? undefined,
        sortOrder: row.sortOrder ?? undefined,
      };
    }
    return map;
  },

  /** The stage order actually in effect for this partner type, after admin overrides. */
  async getEffectiveOrder(partnerType: string): Promise<PartnerOnboardingStageCode[]> {
    const baseOrder = getPartnerOnboardingStageOrder(partnerType);
    const overrides = await this.getOverridesMap(partnerType);
    return applyStageOverrides(baseOrder, overrides);
  },

  /** Full settings screen payload: every known stage, its default vs. effective state. */
  async listForAdmin(partnerType: string) {
    const baseOrder = getPartnerOnboardingStageOrder(partnerType);
    const overrides = await this.getOverridesMap(partnerType);
    const effectiveOrder = applyStageOverrides(baseOrder, overrides);
    const rows = await db
      .select()
      .from(onboardingStageSettings)
      .where(eq(onboardingStageSettings.partnerType, partnerType));
    const rowByStage = new Map(rows.map((r) => [r.stageCode, r]));

    return PARTNER_ONBOARDING_STAGE_ORDER.map((stageCode) => {
      const override = overrides[stageCode];
      const defaults = PARTNER_STAGE_LABELS[stageCode];
      const row = rowByStage.get(stageCode);
      const isEnabledByDefault = baseOrder.includes(stageCode);
      return {
        stageCode,
        label: row?.label || defaults.label,
        description: row?.description || defaults.description,
        isEnabled: override?.isEnabled ?? isEnabledByDefault,
        isEnabledByDefault,
        sortOrder: effectiveOrder.indexOf(stageCode),
        hasCustomLabel: !!row?.label,
        hasCustomOrder: override?.sortOrder !== undefined,
      };
    }).sort((a, b) => {
      if (a.sortOrder === -1 && b.sortOrder === -1) return 0;
      if (a.sortOrder === -1) return 1;
      if (b.sortOrder === -1) return -1;
      return a.sortOrder - b.sortOrder;
    });
  },

  async upsertSetting(
    partnerType: string,
    stageCode: PartnerOnboardingStageCode,
    patch: { label?: string; description?: string; isEnabled?: boolean; sortOrder?: number },
    updatedBy?: string
  ) {
    const [existing] = await db
      .select()
      .from(onboardingStageSettings)
      .where(
        and(
          eq(onboardingStageSettings.partnerType, partnerType),
          eq(onboardingStageSettings.stageCode, stageCode)
        )
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(onboardingStageSettings)
        .set({ ...patch, updatedBy, updatedAt: new Date() })
        .where(eq(onboardingStageSettings.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(onboardingStageSettings)
      .values({ partnerType, stageCode, ...patch, updatedBy })
      .returning();
    return created;
  },
};
