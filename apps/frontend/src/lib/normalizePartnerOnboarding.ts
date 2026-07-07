import type { PartnerOnboardingResponse, PartnerOnboardingWorkflow } from '@/lib/api/partnerDashboard';
import type { PartnerOnboardingTrack } from '@/lib/partnerOnboardingStages';
import { onboardingTracksForPartnerType } from '@/lib/partnerOnboardingStages';

const SERVICE_STAGES = new Set([
  'registration',
  'service_selection',
  'initial_review',
  'documentation',
  'verification',
  'agreement',
  'app_access',
  'user_setup',
  'training',
  'testing',
  'go_live',
]);

function stageKeys(wf: PartnerOnboardingWorkflow): string[] {
  return [
    wf.currentStage,
    ...(wf.completedStages ?? []),
    ...Object.keys(wf.stages ?? {}),
  ].filter(Boolean);
}

function inferPartnerTypeFromWorkflow(wf: PartnerOnboardingWorkflow): string {
  const keys = stageKeys(wf);
  const hasLogistics = keys.some(
    (s) => s.startsWith('logistics_') || s === 'fleet_setup' || s === 'api_integration'
  );
  const hasSupplier = keys.some(
    (s) => s.startsWith('supplier_') || s === 'catalog_setup' || s === 'payment_setup'
  );
  const hasService = keys.some((s) => SERVICE_STAGES.has(s));

  if (hasSupplier && hasLogistics) return 'supplier_logistics';
  if (hasLogistics) return 'logistics_partner';
  if (hasSupplier) return 'supplier';
  if (hasService) return 'agency';
  return 'agency';
}

function isWorkflowShape(value: unknown): value is PartnerOnboardingWorkflow {
  return (
    !!value &&
    typeof value === 'object' &&
    'currentStage' in value &&
    'overallStatus' in value &&
    ('workflowId' in value || 'partnerId' in value || 'logisticsId' in value || 'supplierId' in value)
  );
}

/** Supports new multi-track payload and legacy flat workflow responses. */
export function normalizePartnerOnboardingResponse(raw: unknown): PartnerOnboardingResponse {
  if (!raw || typeof raw !== 'object') {
    return { partnerType: 'agency' };
  }

  const record = raw as Record<string, unknown>;

  if (typeof record.partnerType === 'string' && record.partnerType.length > 0) {
    return {
      partnerType: record.partnerType,
      service: (record.service as PartnerOnboardingWorkflow | null | undefined) ?? undefined,
      supplier: record.supplier as PartnerOnboardingWorkflow | null | undefined,
      logistics: record.logistics as PartnerOnboardingWorkflow | null | undefined,
    };
  }

  if ('logistics' in record || 'supplier' in record || 'service' in record) {
    const partnerType =
      (typeof record.partnerType === 'string' && record.partnerType) ||
      (record.logistics && record.supplier
        ? 'supplier_logistics'
        : record.logistics
          ? 'logistics_partner'
          : record.supplier
            ? 'supplier'
            : 'agency');

    return {
      partnerType,
      service: record.service as PartnerOnboardingWorkflow | null | undefined,
      supplier: record.supplier as PartnerOnboardingWorkflow | null | undefined,
      logistics: record.logistics as PartnerOnboardingWorkflow | null | undefined,
    };
  }

  if (isWorkflowShape(raw)) {
    const wf = raw;
    const partnerType = inferPartnerTypeFromWorkflow(wf);
    if (partnerType === 'logistics_partner') {
      return { partnerType, logistics: wf };
    }
    if (partnerType === 'supplier') {
      return { partnerType, supplier: wf };
    }
    if (partnerType === 'supplier_logistics') {
      const keys = stageKeys(wf);
      const logisticsLike = keys.some(
        (s) => s.startsWith('logistics_') || s === 'fleet_setup' || s === 'api_integration'
      );
      return logisticsLike ? { partnerType, logistics: wf } : { partnerType, supplier: wf };
    }
    return { partnerType, service: wf };
  }

  return { partnerType: 'agency' };
}

export function resolveOnboardingTracks(data: PartnerOnboardingResponse): PartnerOnboardingTrack[] {
  const fromType = onboardingTracksForPartnerType(data.partnerType);
  if (fromType.length > 0) {
    return fromType;
  }

  const tracks: PartnerOnboardingTrack[] = [];
  if (data.service) tracks.push('service');
  if (data.supplier !== undefined) tracks.push('supplier');
  if (data.logistics !== undefined) tracks.push('logistics');
  return tracks;
}
