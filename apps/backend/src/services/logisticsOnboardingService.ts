import { db } from '../db';
import { logisticsOnboardingWorkflows } from '../db/schema/advanced';
import { eq } from 'drizzle-orm';

export const LOGISTICS_ONBOARDING_STAGE_ORDER = [
  'logistics_registration',
  'fleet_setup',
  'logistics_documentation',
  'logistics_verification',
  'logistics_agreement',
  'api_integration',
  'logistics_portal_access',
  'logistics_testing',
  'logistics_activation',
] as const;

type LogisticsOnboardingStage = (typeof LOGISTICS_ONBOARDING_STAGE_ORDER)[number];
type OnboardingStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped';

export function isLogisticsOnboardingComplete(wf: {
  overallStatus: string;
  completedStages: string[];
  stages: Record<string, { status: string }>;
}): boolean {
  if (wf.overallStatus === 'blocked') return false;
  return LOGISTICS_ONBOARDING_STAGE_ORDER.every((stage) => {
    if (wf.completedStages.includes(stage)) return true;
    return wf.stages[stage]?.status === 'skipped';
  });
}

export const logisticsOnboardingService = {
  async getWorkflow(logisticsId: string) {
    const [workflow] = await db
      .select()
      .from(logisticsOnboardingWorkflows)
      .where(eq(logisticsOnboardingWorkflows.logisticsId, logisticsId))
      .limit(1);

    if (workflow) {
      const completedStages = (workflow.completedStages as string[]) || [];
      const stageData = (workflow.stageData as Record<string, any>) || {};
      
      const stages: Record<string, {
        status: OnboardingStatus;
        completedAt?: string;
        notes?: string;
        stageData?: Record<string, any>;
      }> = {};

      LOGISTICS_ONBOARDING_STAGE_ORDER.forEach((stage) => {
        const isCompleted = completedStages.includes(stage);
        stages[stage] = {
          status: isCompleted ? 'completed' : (stage === workflow.currentStage ? (workflow.stageStatus as OnboardingStatus) : 'pending'),
          completedAt: isCompleted ? new Date().toISOString() : undefined,
          notes: stageData[stage]?.notes,
          stageData: stageData[stage],
        };
      });

      let overallStatus: OnboardingStatus = 'pending';
      if (completedStages.length === LOGISTICS_ONBOARDING_STAGE_ORDER.length) {
        overallStatus = 'completed';
      } else if (workflow.stageStatus === 'blocked') {
        overallStatus = 'blocked';
      } else if (completedStages.length > 0 || workflow.stageStatus === 'in_progress') {
        overallStatus = 'in_progress';
      }

      return {
        workflowId: workflow.workflowId,
        logisticsId: workflow.logisticsId,
        currentStage: workflow.currentStage as LogisticsOnboardingStage,
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

    // Default workflow if none exists
    const defaultWorkflow = {
      workflowId: `wf-logistics-${logisticsId}-${Date.now()}`,
      logisticsId,
      currentStage: 'logistics_registration' as LogisticsOnboardingStage,
      overallStatus: 'in_progress' as OnboardingStatus,
      stages: {} as Record<string, {
        status: OnboardingStatus;
        completedAt?: string;
        notes?: string;
        stageData?: Record<string, any>;
      }>,
      completedStages: [] as string[],
      blockedStages: [] as string[],
      startedAt: new Date().toISOString(),
      completedAt: undefined,
      assignedTo: undefined,
      notes: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    LOGISTICS_ONBOARDING_STAGE_ORDER.forEach((stage, index) => {
      defaultWorkflow.stages[stage] = {
        status: index === 0 ? 'in_progress' : 'pending',
      };
    });

    return defaultWorkflow;
  },

  async updateStage(logisticsId: string, data: {
    stage: string;
    status: string;
    stageData?: Record<string, unknown>;
    notes?: string;
  }, user: any) {
    const [existing] = await db
      .select()
      .from(logisticsOnboardingWorkflows)
      .where(eq(logisticsOnboardingWorkflows.logisticsId, logisticsId))
      .limit(1);

    const completedStages = (existing?.completedStages as string[]) || [];
    const stageData = (existing?.stageData as Record<string, any>) || {};
    
    if (!stageData[data.stage]) {
      stageData[data.stage] = {};
    }
    stageData[data.stage].notes = data.notes;
    stageData[data.stage].status = data.status;
    if (data.stageData) {
      stageData[data.stage] = { ...stageData[data.stage], ...data.stageData };
    }

    if (data.status === 'completed' && !completedStages.includes(data.stage)) {
      completedStages.push(data.stage);
    } else if (data.status !== 'completed' && completedStages.includes(data.stage)) {
      const index = completedStages.indexOf(data.stage);
      completedStages.splice(index, 1);
    }

    let overallStatus = data.status;
    if (completedStages.length === LOGISTICS_ONBOARDING_STAGE_ORDER.length) {
      overallStatus = 'completed';
    }

    const workflowData = {
      currentStage: data.stage,
      stageStatus: data.status,
      completedStages,
      stageData,
      blockedReasons: data.status === 'blocked' ? data.notes : null,
      updatedAt: new Date(),
    };

    if (existing) {
      await db
        .update(logisticsOnboardingWorkflows)
        .set(workflowData)
        .where(eq(logisticsOnboardingWorkflows.logisticsId, logisticsId));
    } else {
      await db.insert(logisticsOnboardingWorkflows).values({
        logisticsId,
        ...workflowData,
        startedAt: new Date(),
      });
    }

    return this.getWorkflow(logisticsId);
  },
};









