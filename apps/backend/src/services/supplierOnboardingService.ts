import { db } from '../db';
import { supplierOnboardingWorkflows } from '../db/schema/advanced';
import { suppliers } from '../db/schema/suppliers';
import { partners } from '../db/schema/partners';
import { eq } from 'drizzle-orm';
import {
  SUPPLIER_ONBOARDING_STAGE_ORDER,
  SUPPLIER_REQUIRED_DOCUMENT_TYPES,
  type SupplierOnboardingStageCode,
} from '@partner-portal/common';
import { ensureSupplierOnboarding } from './supplierOnboardingBootstrap';
import {
  StageValidationError,
  validateAdminCanApproveStage,
  validateSupplierStageCompletion,
} from './supplierOnboardingValidation';
import { supplierService } from './supplierService';
import { agreementService } from './agreementService';
import { getMissingApprovedRequiredDocumentTypes } from './documentReviewRequirements';
import { partnerHasCountersignedAgreement } from './agreementReviewRequirements';

const DEFAULT_SUPPLIER_AGREEMENT_TITLE = 'Supplier Master Agreement';
const DEFAULT_SUPPLIER_AGREEMENT_DOC_URL = 'https://pdfobject.com/pdf/sample.pdf';

export { SUPPLIER_ONBOARDING_STAGE_ORDER };

type OnboardingStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped';

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

function nextStage(stage: SupplierOnboardingStageCode): SupplierOnboardingStageCode | null {
  const idx = SUPPLIER_ONBOARDING_STAGE_ORDER.indexOf(stage);
  if (idx < 0 || idx >= SUPPLIER_ONBOARDING_STAGE_ORDER.length - 1) return null;
  return SUPPLIER_ONBOARDING_STAGE_ORDER[idx + 1];
}

function resolveStageStatus(
  stage: SupplierOnboardingStageCode,
  workflow: {
    currentStage: string;
    stageStatus: string;
    completedStages: string[];
    stageData: Record<string, StageEntry>;
  }
): OnboardingStatus {
  const entry = workflow.stageData[stage];
  if (workflow.completedStages.includes(stage)) return 'completed';
  if (entry?.status) return entry.status;
  if (stage === workflow.currentStage) return workflow.stageStatus as OnboardingStatus;
  return 'pending';
}

function buildStagesResponse(workflow: {
  currentStage: string;
  stageStatus: string;
  completedStages: string[];
  stageData: Record<string, StageEntry>;
}) {
  const completedStages = workflow.completedStages;
  const stageData = workflow.stageData;
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

  for (const stage of SUPPLIER_ONBOARDING_STAGE_ORDER) {
    const entry = stageData[stage] || {};
    const status = resolveStageStatus(stage, {
      currentStage: workflow.currentStage,
      stageStatus: workflow.stageStatus,
      completedStages,
      stageData,
    });
    stages[stage] = {
      status,
      completedAt: entry.completedAt || (completedStages.includes(stage) ? new Date().toISOString() : undefined),
      notes: entry.notes || entry.rejectionNotes,
      stageData: entry,
      submittedForReview: entry.submittedForReview === true,
    };
  }
  return stages;
}

export function isSupplierOnboardingComplete(wf: {
  overallStatus: string;
  completedStages: string[];
  stages: Record<string, { status: string }>;
}): boolean {
  if (wf.overallStatus === 'blocked') return false;
  return SUPPLIER_ONBOARDING_STAGE_ORDER.every((stage) => {
    if (wf.completedStages.includes(stage)) return true;
    return wf.stages[stage]?.status === 'skipped';
  });
}

export const supplierOnboardingService = {
  /**
   * Creates a supplier master agreement for signing when none exists yet.
   * Called after platform verification is approved or when partner opens the agreement step.
   */
  /** Issue master agreement when verification is done or partner is on the agreement step. */
  async ensureSupplierAgreementForPartnerIfNeeded(partnerId: string) {
    const [sup] = await db
      .select({ supplierId: suppliers.supplierId })
      .from(suppliers)
      .where(eq(suppliers.partnerId, partnerId))
      .limit(1);
    if (!sup) return null;

    const [wf] = await db
      .select({
        currentStage: supplierOnboardingWorkflows.currentStage,
        completedStages: supplierOnboardingWorkflows.completedStages,
      })
      .from(supplierOnboardingWorkflows)
      .where(eq(supplierOnboardingWorkflows.supplierId, sup.supplierId))
      .limit(1);
    if (!wf) return null;

    const completed = (wf.completedStages as string[]) ?? [];
    const onAgreementStep = wf.currentStage === 'supplier_agreement';
    const verificationDone = completed.includes('supplier_verification');
    if (!onAgreementStep && !verificationDone) return null;

    return this.ensureSupplierAgreementIssued(partnerId);
  },

  async ensureSupplierAgreementIssued(partnerId: string) {
    const agreements = await agreementService.listForPartner(partnerId);
    const supplierAgreements = agreements.filter(
      (a) => a.agreementType === 'supplier' || a.agreementType?.includes('supplier')
    );
    const open = supplierAgreements.find((a) =>
      ['pending_signature', 'draft'].includes(a.status ?? '')
    );
    if (open) return open;
    const signed = supplierAgreements.find((a) => a.status === 'signed');
    if (signed) return signed;

    const agreementNumber = `AGR-SUP-${Date.now()}`;
    return agreementService.create({
      partnerId,
      agreementType: 'supplier',
      agreementNumber,
      title: DEFAULT_SUPPLIER_AGREEMENT_TITLE,
      description:
        'Standard commercial terms for supplying goods and services through the partner portal. Review and sign to continue onboarding.',
      documentUrl: DEFAULT_SUPPLIER_AGREEMENT_DOC_URL,
      status: 'pending_signature',
    });
  },

  async getSupplierContext(partnerId: string) {
    const result = await ensureSupplierOnboarding(partnerId);
    if (!result) throw new Error('Partner is not a supplier type');
    const workflow = await this.getWorkflow(result.supplierId);
    await this.ensureSupplierAgreementForPartnerIfNeeded(partnerId);
    return { supplierId: result.supplierId, supplier: result.supplier, workflow };
  },

  /**
   * If documentation was marked complete without every required type approved, roll it back.
   */
  async reconcileDocumentationStageCompletion(supplierId: string, partnerId: string): Promise<boolean> {
    const row = await this.loadWorkflowRow(supplierId);
    if (!row) return false;

    const docStage: SupplierOnboardingStageCode = 'supplier_documentation';
    const completedStages = [...((row.completedStages as string[]) || [])];
    const stageData = { ...((row.stageData as Record<string, StageEntry>) || {}) };
    const docEntry = stageData[docStage] || {};

    const missing = await getMissingApprovedRequiredDocumentTypes(
      partnerId,
      SUPPLIER_REQUIRED_DOCUMENT_TYPES
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

    let currentStage = row.currentStage as SupplierOnboardingStageCode;
    const docIdx = SUPPLIER_ONBOARDING_STAGE_ORDER.indexOf(docStage);
    const currentIdx = SUPPLIER_ONBOARDING_STAGE_ORDER.indexOf(currentStage);
    if (currentIdx > docIdx) {
      currentStage = docStage;
    }

    await db
      .update(supplierOnboardingWorkflows)
      .set({
        currentStage,
        stageStatus: 'in_progress',
        completedStages: newCompleted,
        stageData,
        completedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(supplierOnboardingWorkflows.supplierId, supplierId));
    return true;
  },

  /** Roll back agreement stage if marked complete without an operations-countersigned agreement. */
  async reconcileAgreementStageCompletion(supplierId: string, partnerId: string): Promise<boolean> {
    const row = await this.loadWorkflowRow(supplierId);
    if (!row) return false;

    const agreementStage: SupplierOnboardingStageCode = 'supplier_agreement';
    const completedStages = [...((row.completedStages as string[]) || [])];
    const stageData = { ...((row.stageData as Record<string, StageEntry>) || {}) };
    const entry = stageData[agreementStage] || {};

    const countersigned = await partnerHasCountersignedAgreement(partnerId);
    const markedComplete =
      completedStages.includes(agreementStage) || entry.status === 'completed';

    if (countersigned || !markedComplete) return false;

    const newCompleted = completedStages.filter((s) => s !== agreementStage);
    stageData[agreementStage] = {
      ...entry,
      status: 'in_progress',
      submittedForReview: entry.submittedForReview ?? true,
      completedAt: undefined,
      reviewedAt: undefined,
      reviewedBy: undefined,
    };

    let currentStage = row.currentStage as SupplierOnboardingStageCode;
    const stageIdx = SUPPLIER_ONBOARDING_STAGE_ORDER.indexOf(agreementStage);
    const currentIdx = SUPPLIER_ONBOARDING_STAGE_ORDER.indexOf(currentStage);
    if (currentIdx > stageIdx) {
      currentStage = agreementStage;
    }

    await db
      .update(supplierOnboardingWorkflows)
      .set({
        currentStage,
        stageStatus: 'in_progress',
        completedStages: newCompleted,
        stageData,
        completedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(supplierOnboardingWorkflows.supplierId, supplierId));
    return true;
  },

  async getWorkflow(supplierId: string) {
    const [sup] = await db
      .select({ partnerId: suppliers.partnerId })
      .from(suppliers)
      .where(eq(suppliers.supplierId, supplierId))
      .limit(1);

    if (sup?.partnerId) {
      await this.reconcileDocumentationStageCompletion(supplierId, sup.partnerId);
      await this.reconcileAgreementStageCompletion(supplierId, sup.partnerId);
    }

    const [workflow] = await db
      .select()
      .from(supplierOnboardingWorkflows)
      .where(eq(supplierOnboardingWorkflows.supplierId, supplierId))
      .limit(1);

    if (workflow) {
      const completedStages = (workflow.completedStages as string[]) || [];
      const stageData = (workflow.stageData as Record<string, StageEntry>) || {};
      const stages = buildStagesResponse({
        currentStage: workflow.currentStage,
        stageStatus: workflow.stageStatus,
        completedStages,
        stageData,
      });

      let overallStatus: OnboardingStatus = 'pending';
      if (completedStages.length === SUPPLIER_ONBOARDING_STAGE_ORDER.length) {
        overallStatus = 'completed';
      } else if (workflow.stageStatus === 'blocked') {
        overallStatus = 'blocked';
      } else if (completedStages.length > 0 || workflow.stageStatus === 'in_progress') {
        overallStatus = 'in_progress';
      }

      return {
        workflowId: workflow.workflowId,
        supplierId: workflow.supplierId,
        currentStage: workflow.currentStage as SupplierOnboardingStageCode,
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
      };
    }

    const defaultWorkflow = {
      workflowId: `wf-supplier-${supplierId}-${Date.now()}`,
      supplierId,
      currentStage: 'supplier_registration' as SupplierOnboardingStageCode,
      overallStatus: 'in_progress' as OnboardingStatus,
      stages: {} as Record<string, { status: OnboardingStatus; stageData?: StageEntry }>,
      completedStages: [] as string[],
      blockedStages: [] as string[],
      startedAt: new Date().toISOString(),
      completedAt: undefined,
      assignedTo: undefined,
      notes: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    SUPPLIER_ONBOARDING_STAGE_ORDER.forEach((stage, index) => {
      defaultWorkflow.stages[stage] = {
        status: index === 0 ? 'in_progress' : 'pending',
      };
    });

    return defaultWorkflow;
  },

  async loadWorkflowRow(supplierId: string) {
    const [row] = await db
      .select()
      .from(supplierOnboardingWorkflows)
      .where(eq(supplierOnboardingWorkflows.supplierId, supplierId))
      .limit(1);
    return row;
  },

  async persistWorkflow(
    supplierId: string,
    patch: {
      currentStage?: SupplierOnboardingStageCode;
      stageStatus?: OnboardingStatus;
      completedStages?: string[];
      stageData?: Record<string, StageEntry>;
      blockedReasons?: string | null;
      completedAt?: Date | null;
    }
  ) {
    const existing = await this.loadWorkflowRow(supplierId);
    const data = {
      ...patch,
      updatedAt: new Date(),
    };
    if (existing) {
      await db
        .update(supplierOnboardingWorkflows)
        .set(data)
        .where(eq(supplierOnboardingWorkflows.supplierId, supplierId));
    } else {
      await db.insert(supplierOnboardingWorkflows).values({
        supplierId,
        currentStage: patch.currentStage || 'supplier_registration',
        stageStatus: patch.stageStatus || 'in_progress',
        completedStages: patch.completedStages || [],
        stageData: patch.stageData || {},
        blockedReasons: patch.blockedReasons ?? null,
        startedAt: new Date(),
        completedAt: patch.completedAt ?? null,
      });
    }
    return this.getWorkflow(supplierId);
  },

  assertPartnerCanEditStage(
    workflow: { currentStage: string; stages: Record<string, { status: string }> },
    stage: SupplierOnboardingStageCode
  ) {
    const stageStatus = workflow.stages[stage]?.status;
    if (workflow.currentStage === stage) return;
    if (stageStatus === 'blocked') return;
    throw new Error('You can only edit the current onboarding stage');
  },

  async saveStageDraft(
    supplierId: string,
    stage: SupplierOnboardingStageCode,
    payload: Record<string, unknown>,
    actor: { type: 'partner' | 'admin'; id?: string },
    partnerId?: string
  ) {
    const wf = await this.getWorkflow(supplierId);
    if (actor.type === 'partner' && partnerId) {
      this.assertPartnerCanEditStage(wf, stage);
    }

    const row = await this.loadWorkflowRow(supplierId);
    const stageData = { ...((row?.stageData as Record<string, StageEntry>) || {}) };
    if (!stageData[stage]) stageData[stage] = {};
    stageData[stage] = {
      ...stageData[stage],
      ...payload,
      status: stageData[stage].status === 'completed' ? 'completed' : 'in_progress',
    };

    return this.persistWorkflow(supplierId, {
      currentStage: (row?.currentStage as SupplierOnboardingStageCode) || wf.currentStage,
      stageStatus: 'in_progress',
      completedStages: (row?.completedStages as string[]) || wf.completedStages,
      stageData,
      blockedReasons: null,
    });
  },

  async completeStageInternal(
    supplierId: string,
    stage: SupplierOnboardingStageCode,
    actor: { type: 'partner' | 'admin'; id?: string },
    extraStageData?: Record<string, unknown>
  ) {
    const row = await this.loadWorkflowRow(supplierId);
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

    const next = nextStage(stage);
    const allDone = completedStages.length === SUPPLIER_ONBOARDING_STAGE_ORDER.length;

    if (next) {
      if (!stageData[next]) stageData[next] = {};
      if (stageData[next].status !== 'completed') {
        stageData[next].status = 'in_progress';
      }
    }

    if (stage === 'supplier_verification') {
      const [sup] = await db
        .select({ partnerId: suppliers.partnerId })
        .from(suppliers)
        .where(eq(suppliers.supplierId, supplierId))
        .limit(1);
      if (sup?.partnerId) {
        await this.ensureSupplierAgreementIssued(sup.partnerId);
      }
    }

    return this.persistWorkflow(supplierId, {
      currentStage: next || stage,
      stageStatus: allDone ? 'completed' : 'in_progress',
      completedStages,
      stageData,
      blockedReasons: null,
      completedAt: allDone ? new Date() : null,
    });
  },

  async submitStage(
    supplierId: string,
    stage: SupplierOnboardingStageCode,
    actor: { type: 'partner'; partnerId: string; accountId?: string }
  ) {
    const row = await this.loadWorkflowRow(supplierId);
    const wf = await this.getWorkflow(supplierId);
    this.assertPartnerCanEditStage(wf, stage);

    const stageData = { ...((row?.stageData as Record<string, StageEntry>) || {}) };
    const merged = { ...stageData[stage] };

    await validateSupplierStageCompletion(stage, supplierId, actor.partnerId, merged);

    if (stage === 'supplier_registration') {
      return this.completeStageInternal(supplierId, stage, { type: 'partner', id: actor.accountId }, {
        acceptedTerms: merged.acceptedTerms,
      });
    }

    const adminOnlyStages: SupplierOnboardingStageCode[] = [
      'supplier_verification',
      'payment_setup',
      'supplier_activation',
    ];
    if (adminOnlyStages.includes(stage)) {
      throw new StageValidationError('This stage is completed by the platform team');
    }

    stageData[stage] = {
      ...merged,
      status: 'in_progress',
      submittedForReview: true,
      submittedAt: new Date().toISOString(),
    };

    return this.persistWorkflow(supplierId, {
      currentStage: (row?.currentStage as SupplierOnboardingStageCode) || stage,
      stageStatus: 'in_progress',
      completedStages: (row?.completedStages as string[]) || [],
      stageData,
    });
  },

  async approveStage(
    supplierId: string,
    stage: SupplierOnboardingStageCode,
    actor: { type: 'admin'; id?: string },
    options?: { notes?: string; stageData?: Record<string, unknown> }
  ) {
    const sup = await db
      .select({ partnerId: suppliers.partnerId })
      .from(suppliers)
      .where(eq(suppliers.supplierId, supplierId))
      .limit(1);
    if (!sup[0]) throw new Error('Supplier not found');

    await validateAdminCanApproveStage(stage, supplierId, sup[0].partnerId);

    if (stage === 'payment_setup' && options?.stageData) {
      const payment = options.stageData as {
        paymentTerms?: string;
        creditLimit?: string;
        currency?: string;
      };
      await db
        .update(suppliers)
        .set({
          paymentTerms: payment.paymentTerms,
          creditLimit: payment.creditLimit,
          currency: payment.currency,
          updatedAt: new Date(),
        })
        .where(eq(suppliers.supplierId, supplierId));
    }

    if (stage === 'supplier_activation') {
      await db
        .update(partners)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(partners.partnerId, sup[0].partnerId));
      await db
        .update(suppliers)
        .set({ supplierPortalEnabled: true, updatedAt: new Date() })
        .where(eq(suppliers.supplierId, supplierId));
    }

    return this.completeStageInternal(supplierId, stage, actor, {
      ...options?.stageData,
      notes: options?.notes,
    });
  },

  async rejectStage(
    supplierId: string,
    stage: SupplierOnboardingStageCode,
    actor: { type: 'admin'; id?: string },
    reason: string
  ) {
    const row = await this.loadWorkflowRow(supplierId);
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

    return this.persistWorkflow(supplierId, {
      currentStage: stage,
      stageStatus: 'blocked',
      completedStages,
      stageData,
      blockedReasons: reason,
    });
  },

  async getReviewQueue() {
    /** Partner cannot submit these; ops approves when they become currentStage. */
    const adminOpsStages: SupplierOnboardingStageCode[] = [
      'supplier_verification',
      'payment_setup',
      'supplier_activation',
    ];

    const rows = await db.select().from(supplierOnboardingWorkflows);
    const queue: Array<{
      supplierId: string;
      partnerId: string;
      partnerName: string;
      partnerType?: string;
      currentStage: string;
      stage: string;
      submittedAt?: string;
      awaitingOpsReview?: boolean;
    }> = [];

    const queueKey = (supplierId: string, stage: string) => `${supplierId}:${stage}`;

    for (const row of rows) {
      const stageData = (row.stageData as Record<string, StageEntry>) || {};
      const completedStages = (row.completedStages as string[]) || [];
      const [sup] = await db
        .select({ partnerId: suppliers.partnerId })
        .from(suppliers)
        .where(eq(suppliers.supplierId, row.supplierId))
        .limit(1);
      if (!sup) continue;
      const [partner] = await db
        .select({ partnerName: partners.partnerName, partnerType: partners.partnerType })
        .from(partners)
        .where(eq(partners.partnerId, sup.partnerId))
        .limit(1);

      const seen = new Set<string>();

      for (const stage of SUPPLIER_ONBOARDING_STAGE_ORDER) {
        const entry = stageData[stage];
        if (entry?.submittedForReview) {
          const key = queueKey(row.supplierId, stage);
          if (seen.has(key)) continue;
          seen.add(key);
          queue.push({
            supplierId: row.supplierId,
            partnerId: sup.partnerId,
            partnerName: partner?.partnerName || 'Unknown',
            partnerType: partner?.partnerType,
            currentStage: row.currentStage,
            stage,
            submittedAt: entry.submittedAt,
            awaitingOpsReview: false,
          });
        }
      }

      const current = row.currentStage as SupplierOnboardingStageCode;
      if (adminOpsStages.includes(current) && !completedStages.includes(current)) {
        const entry = stageData[current];
        const key = queueKey(row.supplierId, current);
        if (
          !seen.has(key) &&
          entry?.status !== 'completed' &&
          entry?.status !== 'blocked'
        ) {
          seen.add(key);
          queue.push({
            supplierId: row.supplierId,
            partnerId: sup.partnerId,
            partnerName: partner?.partnerName || 'Unknown',
            partnerType: partner?.partnerType,
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

  async updateSupplierProfile(
    partnerId: string,
    data: {
      supplierCategory?: string;
      supplyRegions?: string[];
      leadTimeDays?: number;
      minimumOrderQuantity?: number;
      productCatalogUrl?: string;
      acceptedTerms?: boolean;
    }
  ) {
    const sup = await supplierService.getSupplierByPartnerId(partnerId);
    if (!sup) throw new Error('Supplier record not found');

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (data.supplierCategory) update.supplierCategory = data.supplierCategory;
    if (data.supplyRegions) update.supplyRegions = data.supplyRegions;
    if (data.leadTimeDays !== undefined) update.leadTimeDays = data.leadTimeDays;
    if (data.minimumOrderQuantity !== undefined) {
      update.minimumOrderQuantity = data.minimumOrderQuantity.toString();
    }
    if (data.productCatalogUrl !== undefined) update.productCatalogUrl = data.productCatalogUrl || null;

    await db.update(suppliers).set(update).where(eq(suppliers.supplierId, sup.supplierId));

    if (data.acceptedTerms !== undefined) {
      await this.saveStageDraft(
        sup.supplierId,
        'supplier_registration',
        { acceptedTerms: data.acceptedTerms },
        { type: 'partner' },
        partnerId
      );
    }

    const [updated] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.supplierId, sup.supplierId))
      .limit(1);
    return updated;
  },

  async updateStage(
    supplierId: string,
    data: {
      stage: string;
      status: string;
      stageData?: Record<string, unknown>;
      notes?: string;
      force?: boolean;
    },
    user: any
  ) {
    if (data.status === 'completed' && !data.force) {
      const sup = await db
        .select({ partnerId: suppliers.partnerId })
        .from(suppliers)
        .where(eq(suppliers.supplierId, supplierId))
        .limit(1);
      if (sup[0]) {
        await validateAdminCanApproveStage(
          data.stage as SupplierOnboardingStageCode,
          supplierId,
          sup[0].partnerId
        );
      }
      return this.approveStage(
        supplierId,
        data.stage as SupplierOnboardingStageCode,
        { type: 'admin', id: user?.userId },
        { notes: data.notes, stageData: data.stageData }
      );
    }

    if (data.status === 'blocked') {
      return this.rejectStage(
        supplierId,
        data.stage as SupplierOnboardingStageCode,
        { type: 'admin', id: user?.userId },
        data.notes || 'Blocked by administrator'
      );
    }

    const row = await this.loadWorkflowRow(supplierId);
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

    const allDone = completedStages.length === SUPPLIER_ONBOARDING_STAGE_ORDER.length;

    return this.persistWorkflow(supplierId, {
      currentStage: data.stage as SupplierOnboardingStageCode,
      stageStatus: data.status as OnboardingStatus,
      completedStages,
      stageData,
      blockedReasons: data.status === 'blocked' ? data.notes || null : null,
      completedAt: allDone ? new Date() : null,
    });
  },
};
