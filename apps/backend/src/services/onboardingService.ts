import { db } from '../db';
import { partnerOnboardingWorkflows } from '../db/schema/advanced';
import { partners } from '../db/schema/partners';
import { eq } from 'drizzle-orm';
import {
  PARTNER_ONBOARDING_STAGE_ORDER as COMMON_PARTNER_STAGES,
  type PartnerOnboardingStageCode,
  getPartnerOnboardingStageOrder,
  getPartnerAdminOnlyStages,
  getPartnerSubmitForReviewStages,
  getServicePartnerOnboardingFlow,
  buildInitialPartnerOnboardingState,
  isPartnerOnboardingCompleteForType,
  isPartnerOnboardingStageApplicable,
  PARTNER_REQUIRED_DOCUMENT_TYPES,
} from '@partner-portal/common';
import { partnerAuthService } from './partnerAuthService';
import { agreementService } from './agreementService';
import {
  PartnerStageValidationError,
  validateAdminCanApprovePartnerStage,
  validatePartnerStageCompletion,
} from './partnerOnboardingValidation';
import { getMissingApprovedRequiredDocumentTypes } from './documentReviewRequirements';

export const PARTNER_ONBOARDING_STAGE_ORDER = COMMON_PARTNER_STAGES;

export type OnboardingStage = PartnerOnboardingStageCode;
type OnboardingStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped';

export type { OnboardingStage };

/** @deprecated Use getPartnerSubmitForReviewStages(partnerType) */
export const PARTNER_SUBMIT_FOR_REVIEW_STAGES: OnboardingStage[] = [
  'service_selection',
  'documentation',
  'agreement',
  'user_setup',
  'training',
  'testing',
];

/** @deprecated Use getPartnerAdminOnlyStages(partnerType) */
export const PARTNER_ADMIN_ONLY_STAGES: OnboardingStage[] = [
  'initial_review',
  'verification',
  'app_access',
  'go_live',
];

type StageEntry = {
  status?: OnboardingStatus;
  submittedForReview?: boolean;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionNotes?: string;
  notes?: string;
  completedAt?: string;
  [key: string]: unknown;
};

async function getPartnerType(partnerId: string): Promise<string> {
  const [partner] = await db
    .select({ partnerType: partners.partnerType })
    .from(partners)
    .where(eq(partners.partnerId, partnerId))
    .limit(1);
  return partner?.partnerType ?? 'agency';
}

function nextStage(stage: OnboardingStage, partnerType: string): OnboardingStage | null {
  const order = getPartnerOnboardingStageOrder(partnerType);
  const idx = order.indexOf(stage);
  if (idx < 0 || idx >= order.length - 1) return null;
  return order[idx + 1];
}

function resolveStageStatus(
  stage: OnboardingStage,
  workflow: {
    currentStage: string;
    stageStatus: string;
    completedStages: string[];
    stageData: Record<string, StageEntry>;
  }
): OnboardingStatus {
  const entry = workflow.stageData[stage];
  if (workflow.completedStages.includes(stage)) {
    return entry?.status === 'skipped' ? 'skipped' : 'completed';
  }
  if (entry?.status) return entry.status;
  if (stage === workflow.currentStage) return workflow.stageStatus as OnboardingStatus;
  return 'pending';
}

function buildStagesResponse(
  workflow: {
    currentStage: string;
    stageStatus: string;
    completedStages: string[];
    stageData: Record<string, StageEntry>;
  },
  partnerType: string
) {
  const stages: Record<
    string,
    {
      status: OnboardingStatus;
      completedAt?: string;
      notes?: string;
      stageData?: StageEntry;
      submittedForReview?: boolean;
    }
  > = {};

  const order = getPartnerOnboardingStageOrder(partnerType);
  for (const stage of order) {
    const entry = workflow.stageData[stage] || {};
    const status = resolveStageStatus(stage, workflow);
    stages[stage] = {
      status,
      completedAt:
        entry.completedAt ||
        (workflow.completedStages.includes(stage) ? new Date().toISOString() : undefined),
      notes: entry.notes || entry.rejectionNotes,
      stageData: entry,
      submittedForReview: entry.submittedForReview === true,
    };
  }
  return stages;
}

/** Auto-skip stages that do not apply to this partner type; fix current stage if needed. */
async function reconcileWorkflowForPartnerType(
  partnerId: string,
  partnerType: string,
  row: {
    currentStage: string;
    stageStatus: string;
    completedStages: string[];
    stageData: Record<string, StageEntry>;
  }
): Promise<typeof row | null> {
  const order = getPartnerOnboardingStageOrder(partnerType);
  const completedStages = [...row.completedStages];
  const stageData = { ...row.stageData };
  let currentStage = row.currentStage as OnboardingStage;
  let changed = false;

  for (const stage of PARTNER_ONBOARDING_STAGE_ORDER) {
    if (order.includes(stage)) continue;
    if (!completedStages.includes(stage)) {
      completedStages.push(stage);
      changed = true;
    }
    if (stageData[stage]?.status !== 'skipped') {
      stageData[stage] = { ...stageData[stage], status: 'skipped' };
      changed = true;
    }
  }

  if (!order.includes(currentStage)) {
    const nextOpen = order.find((s) => !completedStages.includes(s));
    if (nextOpen) {
      currentStage = nextOpen;
      if (stageData[currentStage]?.status !== 'completed') {
        stageData[currentStage] = { ...stageData[currentStage], status: 'in_progress' };
      }
      changed = true;
    }
  }

  if (!changed) return null;

  const allDone = isPartnerOnboardingCompleteForType(partnerType, completedStages, stageData);
  await db
    .update(partnerOnboardingWorkflows)
    .set({
      currentStage,
      stageStatus: allDone ? 'completed' : row.stageStatus,
      completedStages,
      stageData,
      completedAt: allDone ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(partnerOnboardingWorkflows.partnerId, partnerId));

  return { currentStage, stageStatus: row.stageStatus, completedStages, stageData };
}

export function isPartnerOnboardingComplete(
  wf: {
    overallStatus: string;
    completedStages: string[];
    stages: Record<string, { status: string }>;
  },
  partnerType: string
): boolean {
  if (wf.overallStatus === 'blocked') return false;
  return isPartnerOnboardingCompleteForType(partnerType, wf.completedStages, wf.stages);
}

function workflowMeta(partnerType: string) {
  const flow = getServicePartnerOnboardingFlow(partnerType);
  return {
    partnerType,
    stageOrder: [...flow.stageOrder],
    flowTitle: flow.title,
    flowDescription: flow.description,
  };
}

export const onboardingService = {
  async loadWorkflowRow(partnerId: string) {
    const [row] = await db
      .select()
      .from(partnerOnboardingWorkflows)
      .where(eq(partnerOnboardingWorkflows.partnerId, partnerId))
      .limit(1);
    return row ?? null;
  },

  async persistWorkflow(
    partnerId: string,
    patch: {
      currentStage: OnboardingStage;
      stageStatus: OnboardingStatus;
      completedStages: string[];
      stageData: Record<string, StageEntry>;
      blockedReasons?: string | null;
      completedAt?: Date | null;
    }
  ) {
    const existing = await this.loadWorkflowRow(partnerId);
    const workflowData = {
      currentStage: patch.currentStage,
      stageStatus: patch.stageStatus,
      completedStages: patch.completedStages,
      stageData: patch.stageData,
      blockedReasons: patch.blockedReasons ?? null,
      updatedAt: new Date(),
      completedAt: patch.completedAt ?? null,
    };

    if (existing) {
      await db
        .update(partnerOnboardingWorkflows)
        .set(workflowData)
        .where(eq(partnerOnboardingWorkflows.partnerId, partnerId));
    } else {
      await db.insert(partnerOnboardingWorkflows).values({
        partnerId,
        ...workflowData,
        startedAt: new Date(),
      });
    }
    return this.getWorkflow(partnerId);
  },

  async reconcileDocumentationStageCompletion(
    partnerId: string,
    partnerType: string
  ): Promise<boolean> {
    const row = await this.loadWorkflowRow(partnerId);
    if (!row) return false;

    const docStage: OnboardingStage = 'documentation';
    const order = getPartnerOnboardingStageOrder(partnerType);
    if (!order.includes(docStage)) return false;

    const completedStages = [...((row.completedStages as string[]) || [])];
    const stageData = { ...((row.stageData as Record<string, StageEntry>) || {}) };
    const docEntry = stageData[docStage] || {};

    const missing = await getMissingApprovedRequiredDocumentTypes(
      partnerId,
      PARTNER_REQUIRED_DOCUMENT_TYPES
    );
    const docMarkedComplete =
      completedStages.includes(docStage) || docEntry.status === 'completed';

    if (missing.length === 0 || !docMarkedComplete) return false;

    const newCompleted = completedStages.filter((s) => s !== docStage);
    stageData[docStage] = {
      ...docEntry,
      status: 'in_progress',
      submittedForReview: docEntry.submittedForReview ?? true,
      completedAt: undefined,
      reviewedAt: undefined,
      reviewedBy: undefined,
    };

    let currentStage = row.currentStage as OnboardingStage;
    const docIdx = order.indexOf(docStage);
    const currentIdx = order.indexOf(currentStage);
    if (currentIdx > docIdx) {
      currentStage = docStage;
    }

    await db
      .update(partnerOnboardingWorkflows)
      .set({
        currentStage,
        stageStatus: 'in_progress',
        completedStages: newCompleted,
        stageData,
        completedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(partnerOnboardingWorkflows.partnerId, partnerId));
    return true;
  },

  async getWorkflow(partnerId: string) {
    const partnerType = await getPartnerType(partnerId);
    const meta = workflowMeta(partnerType);
    let workflow = await this.loadWorkflowRow(partnerId);

    if (workflow) {
      const reconciled = await reconcileWorkflowForPartnerType(partnerId, partnerType, {
        currentStage: workflow.currentStage,
        stageStatus: workflow.stageStatus,
        completedStages: (workflow.completedStages as string[]) || [],
        stageData: (workflow.stageData as Record<string, StageEntry>) || {},
      });
      if (reconciled) {
        workflow = await this.loadWorkflowRow(partnerId);
      }
      const docReconciled = await this.reconcileDocumentationStageCompletion(
        partnerId,
        partnerType
      );
      if (docReconciled) {
        workflow = await this.loadWorkflowRow(partnerId);
      }
      if (!workflow) {
        throw new Error('Workflow missing after reconcile');
      }

      const completedStages = (workflow.completedStages as string[]) || [];
      const stageData = (workflow.stageData as Record<string, StageEntry>) || {};
      const stages = buildStagesResponse(
        {
          currentStage: workflow.currentStage,
          stageStatus: workflow.stageStatus,
          completedStages,
          stageData,
        },
        partnerType
      );

      const applicableDone = meta.stageOrder.filter(
        (s) => completedStages.includes(s) || stages[s]?.status === 'skipped'
      ).length;

      let overallStatus: OnboardingStatus = 'pending';
      if (isPartnerOnboardingCompleteForType(partnerType, completedStages, stageData)) {
        overallStatus = 'completed';
      } else if (workflow.stageStatus === 'blocked') {
        overallStatus = 'blocked';
      } else if (applicableDone > 0 || workflow.stageStatus === 'in_progress') {
        overallStatus = 'in_progress';
      }

      return {
        workflowId: workflow.workflowId,
        partnerId: workflow.partnerId,
        currentStage: workflow.currentStage as OnboardingStage,
        overallStatus,
        stages,
        completedStages,
        blockedStages: workflow.blockedReasons ? [workflow.currentStage] : [],
        startedAt: workflow.startedAt?.toISOString() || new Date().toISOString(),
        completedAt: workflow.completedAt?.toISOString(),
        assignedTo: workflow.assignedTo,
        notes: workflow.blockedReasons || undefined,
        createdAt: workflow.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: workflow.updatedAt?.toISOString() || new Date().toISOString(),
        ...meta,
      };
    }

    const initial = buildInitialPartnerOnboardingState(partnerType);
    const stages = buildStagesResponse(
      {
        currentStage: initial.currentStage,
        stageStatus: initial.stageStatus,
        completedStages: initial.completedStages,
        stageData: initial.stageData as Record<string, StageEntry>,
      },
      partnerType
    );

    return {
      workflowId: `wf-${partnerId}-${Date.now()}`,
      partnerId,
      currentStage: initial.currentStage,
      overallStatus: 'in_progress' as OnboardingStatus,
      stages,
      completedStages: initial.completedStages,
      blockedStages: [] as string[],
      startedAt: new Date().toISOString(),
      completedAt: undefined,
      assignedTo: undefined,
      notes: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...meta,
    };
  },

  assertPartnerCanEditStage(
    workflow: { currentStage: string; stages: Record<string, { status?: string }> },
    stage: OnboardingStage
  ) {
    const stageStatus = workflow.stages[stage]?.status;
    if (workflow.currentStage === stage) return;
    if (stageStatus === 'blocked') return;
    throw new Error('You can only edit the current onboarding stage');
  },

  async completeStageInternal(
    partnerId: string,
    stage: OnboardingStage,
    actor: { type: 'partner' | 'admin'; id?: string },
    extraStageData?: Record<string, unknown>
  ) {
    const partnerType = await getPartnerType(partnerId);
    if (!isPartnerOnboardingStageApplicable(partnerType, stage)) {
      throw new PartnerStageValidationError('This stage does not apply to your partner type');
    }

    const row = await this.loadWorkflowRow(partnerId);
    const completedStages = [...((row?.completedStages as string[]) || [])];
    if (!completedStages.includes(stage)) completedStages.push(stage);

    const stageData = { ...((row?.stageData as Record<string, StageEntry>) || {}) };
    stageData[stage] = {
      ...stageData[stage],
      ...extraStageData,
      status: 'completed',
      completedAt: new Date().toISOString(),
      submittedForReview: false,
      rejectionNotes: undefined,
      reviewedAt: actor.type === 'admin' ? new Date().toISOString() : stageData[stage]?.reviewedAt,
      reviewedBy: actor.type === 'admin' ? actor.id : stageData[stage]?.reviewedBy,
    };

    const next = nextStage(stage, partnerType);
    const allDone = isPartnerOnboardingCompleteForType(partnerType, completedStages, stageData);

    if (next) {
      if (!stageData[next]) stageData[next] = {};
      if (stageData[next].status !== 'completed' && stageData[next].status !== 'skipped') {
        stageData[next].status = 'in_progress';
      }
    }

    if (stage === 'go_live') {
      await db
        .update(partners)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(partners.partnerId, partnerId));
    }

    return this.persistWorkflow(partnerId, {
      currentStage: next || stage,
      stageStatus: allDone ? 'completed' : 'in_progress',
      completedStages,
      stageData,
      blockedReasons: null,
      completedAt: allDone ? new Date() : null,
    });
  },

  async saveStageDraft(
    partnerId: string,
    stage: OnboardingStage,
    payload: Record<string, unknown>
  ) {
    const partnerType = await getPartnerType(partnerId);
    if (!isPartnerOnboardingStageApplicable(partnerType, stage)) {
      throw new PartnerStageValidationError('This stage does not apply to your partner type');
    }

    const wf = await this.getWorkflow(partnerId);
    this.assertPartnerCanEditStage(wf, stage);

    const row = await this.loadWorkflowRow(partnerId);
    const stageData = { ...((row?.stageData as Record<string, StageEntry>) || {}) };
    if (!stageData[stage]) stageData[stage] = {};
    stageData[stage] = {
      ...stageData[stage],
      ...payload,
      status: stageData[stage].status === 'completed' ? 'completed' : 'in_progress',
    };

    return this.persistWorkflow(partnerId, {
      currentStage: (row?.currentStage as OnboardingStage) || wf.currentStage,
      stageStatus: 'in_progress',
      completedStages: (row?.completedStages as string[]) || wf.completedStages,
      stageData,
      blockedReasons: null,
    });
  },

  async submitStage(
    partnerId: string,
    stage: OnboardingStage,
    actor: { accountId?: string },
    payload?: Record<string, unknown>
  ) {
    const partnerType = await getPartnerType(partnerId);
    const adminOnly = getPartnerAdminOnlyStages(partnerType);
    const submitForReview = getPartnerSubmitForReviewStages(partnerType);

    if (!isPartnerOnboardingStageApplicable(partnerType, stage)) {
      throw new PartnerStageValidationError('This stage does not apply to your partner type');
    }

    const row = await this.loadWorkflowRow(partnerId);
    const wf = await this.getWorkflow(partnerId);
    this.assertPartnerCanEditStage(wf, stage);

    if (adminOnly.includes(stage)) {
      throw new PartnerStageValidationError('This stage is completed by the platform team');
    }

    if (payload?.displayName !== undefined || payload?.website !== undefined || payload?.description !== undefined) {
      await partnerAuthService.updateOrganization(partnerId, {
        displayName: payload.displayName as string | undefined,
        website: payload.website as string | undefined,
        description: payload.description as string | undefined,
      });
    }

    const stageData = { ...((row?.stageData as Record<string, StageEntry>) || {}) };
    const merged = { ...stageData[stage], ...payload };

    await validatePartnerStageCompletion(stage, partnerId, merged);

    if (stage === 'registration') {
      return this.completeStageInternal(partnerId, stage, { type: 'partner', id: actor.accountId }, {
        acceptedTerms: merged.acceptedTerms,
        submittedBy: actor.accountId,
        submittedAt: new Date().toISOString(),
      });
    }

    if (!submitForReview.includes(stage)) {
      throw new PartnerStageValidationError('This stage cannot be submitted from the partner portal');
    }

    stageData[stage] = {
      ...merged,
      status: 'in_progress',
      submittedForReview: true,
      submittedAt: new Date().toISOString(),
      submittedBy: actor.accountId,
    };

    return this.persistWorkflow(partnerId, {
      currentStage: (row?.currentStage as OnboardingStage) || stage,
      stageStatus: 'in_progress',
      completedStages: (row?.completedStages as string[]) || [],
      stageData,
      blockedReasons: null,
    });
  },

  /** @deprecated use submitStage */
  async submitPartnerStage(
    partnerId: string,
    stage: OnboardingStage,
    actor: { accountId?: string },
    payload?: Record<string, unknown>
  ) {
    return this.submitStage(partnerId, stage, actor, payload);
  },

  async approveStage(
    partnerId: string,
    stage: OnboardingStage,
    actor: { type: 'admin'; id?: string },
    options?: { notes?: string; stageData?: Record<string, unknown> }
  ) {
    await validateAdminCanApprovePartnerStage(stage, partnerId);
    return this.completeStageInternal(partnerId, stage, actor, {
      ...options?.stageData,
      notes: options?.notes,
    });
  },

  async rejectStage(
    partnerId: string,
    stage: OnboardingStage,
    actor: { type: 'admin'; id?: string },
    reason: string
  ) {
    const row = await this.loadWorkflowRow(partnerId);
    const stageData = { ...((row?.stageData as Record<string, StageEntry>) || {}) };
    stageData[stage] = {
      ...stageData[stage],
      status: 'blocked',
      submittedForReview: false,
      rejectionNotes: reason,
      notes: reason,
      reviewedAt: new Date().toISOString(),
      reviewedBy: actor.id,
    };

    const completedStages = ((row?.completedStages as string[]) || []).filter((s) => s !== stage);

    return this.persistWorkflow(partnerId, {
      currentStage: stage,
      stageStatus: 'blocked',
      completedStages,
      stageData,
      blockedReasons: reason,
    });
  },

  async getReviewQueue() {
    const rows = await db.select().from(partnerOnboardingWorkflows);
    const queue: Array<{
      partnerId: string;
      partnerName: string;
      partnerType: string;
      currentStage: string;
      stage: string;
      submittedAt?: string;
      awaitingOpsReview?: boolean;
    }> = [];

    for (const row of rows) {
      const stageData = (row.stageData as Record<string, StageEntry>) || {};
      const completedStages = (row.completedStages as string[]) || [];
      const [partner] = await db
        .select({ partnerName: partners.partnerName, partnerType: partners.partnerType })
        .from(partners)
        .where(eq(partners.partnerId, row.partnerId))
        .limit(1);
      if (!partner) continue;

      const stageOrder = getPartnerOnboardingStageOrder(partner.partnerType);
      const adminOnly = getPartnerAdminOnlyStages(partner.partnerType);
      const seen = new Set<string>();

      for (const stage of stageOrder) {
        const entry = stageData[stage];
        if (entry?.submittedForReview) {
          const key = `${row.partnerId}:${stage}`;
          if (seen.has(key)) continue;
          seen.add(key);
          queue.push({
            partnerId: row.partnerId,
            partnerName: partner.partnerName,
            partnerType: partner.partnerType,
            currentStage: row.currentStage,
            stage,
            submittedAt: entry.submittedAt,
            awaitingOpsReview: false,
          });
        }
      }

      const current = row.currentStage as OnboardingStage;
      if (adminOnly.includes(current) && !completedStages.includes(current)) {
        const entry = stageData[current];
        const key = `${row.partnerId}:${current}`;
        if (
          !seen.has(key) &&
          entry?.status !== 'completed' &&
          entry?.status !== 'blocked'
        ) {
          seen.add(key);
          queue.push({
            partnerId: row.partnerId,
            partnerName: partner.partnerName,
            partnerType: partner.partnerType,
            currentStage: row.currentStage,
            stage: current,
            submittedAt: entry?.submittedAt,
            awaitingOpsReview: true,
          });
        }
      }
    }
    return queue;
  },

  async updateStage(
    partnerId: string,
    data: {
      stage: string;
      status: string;
      stageData?: Record<string, unknown>;
      notes?: string;
      force?: boolean;
    },
    user: { userId?: string }
  ) {
    if (data.status === 'completed' && !data.force) {
      return this.approveStage(
        partnerId,
        data.stage as OnboardingStage,
        { type: 'admin', id: user?.userId },
        { notes: data.notes, stageData: data.stageData }
      );
    }

    if (data.status === 'blocked') {
      return this.rejectStage(
        partnerId,
        data.stage as OnboardingStage,
        { type: 'admin', id: user?.userId },
        data.notes || 'Blocked by administrator'
      );
    }

    const partnerType = await getPartnerType(partnerId);
    const row = await this.loadWorkflowRow(partnerId);
    const completedStages = [...((row?.completedStages as string[]) || [])];
    const stageData = { ...((row?.stageData as Record<string, StageEntry>) || {}) };
    if (!stageData[data.stage]) stageData[data.stage] = {};
    stageData[data.stage].notes = data.notes;
    stageData[data.stage].status = data.status as OnboardingStatus;
    if (data.stageData) {
      stageData[data.stage] = { ...stageData[data.stage], ...data.stageData };
    }

    if (data.status === 'completed' && !completedStages.includes(data.stage)) {
      completedStages.push(data.stage);
    } else if (data.status !== 'completed') {
      const index = completedStages.indexOf(data.stage);
      if (index >= 0) completedStages.splice(index, 1);
    }

    const allDone = isPartnerOnboardingCompleteForType(partnerType, completedStages, stageData);

    return this.persistWorkflow(partnerId, {
      currentStage: data.stage as OnboardingStage,
      stageStatus: data.status as OnboardingStatus,
      completedStages,
      stageData,
      blockedReasons: data.status === 'blocked' ? data.notes || null : null,
      completedAt: allDone ? new Date() : null,
    });
  },

  /** Issue master agreement when verification is done or partner is on the agreement step. */
  async ensureServicePartnerAgreementIfNeeded(partnerId: string) {
    const row = await this.loadWorkflowRow(partnerId);
    if (!row) return null;

    const partnerType = await getPartnerType(partnerId);
    const order = getPartnerOnboardingStageOrder(partnerType);
    const completed = (row.completedStages as string[]) ?? [];
    const onAgreementStep = row.currentStage === 'agreement';
    const verificationDone =
      !order.includes('verification') || completed.includes('verification');
    if (!onAgreementStep && !verificationDone) return null;

    return this.ensureServicePartnerAgreementIssued(partnerId);
  },

  async ensureServicePartnerAgreementIssued(partnerId: string) {
    const agreements = await agreementService.listForPartner(partnerId);
    const serviceAgreements = agreements.filter(
      (a) =>
        a.agreementType === 'service_partner' ||
        a.agreementType === 'partner' ||
        a.agreementType === 'agency'
    );
    const open = serviceAgreements.find((a) =>
      ['pending_signature', 'draft'].includes(a.status ?? '')
    );
    if (open) return open;
    const signed = serviceAgreements.find((a) => a.status === 'signed');
    if (signed) return signed;

    const agreementNumber = `AGR-SVC-${Date.now()}`;
    return agreementService.create({
      partnerId,
      agreementType: 'service_partner',
      agreementNumber,
      title: 'Partner Master Agreement',
      description:
        'Standard commercial terms for delivering services through the partner portal. Review and sign to continue onboarding.',
      documentUrl: 'https://pdfobject.com/pdf/sample.pdf',
      status: 'pending_signature',
    });
  },
};
