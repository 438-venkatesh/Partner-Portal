import { Link } from '@tanstack/react-router';
import {
  ONBOARDING_TRACK_CONFIG,
  type PartnerOnboardingTrack,
  type OnboardingStageMeta,
} from '@/lib/partnerOnboardingStages';
import {
  getServicePartnerOnboardingFlow,
  getPartnerOnboardingStageOrder,
} from '@/lib/partnerOnboardingByType';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PartnerWorkflowShape {
  currentStage: string;
  overallStatus: string;
  stages?: Record<string, { status?: string; notes?: string }>;
  completedStages?: string[];
  notes?: string;
  stageOrder?: readonly string[];
}

interface PartnerOnboardingTrackCardProps {
  track: PartnerOnboardingTrack;
  workflow: PartnerWorkflowShape | null | undefined;
  partnerType?: string;
  missingMessage?: string;
}

function stageMeta(track: PartnerOnboardingTrack, stage: string): OnboardingStageMeta {
  const copy = ONBOARDING_TRACK_CONFIG[track].stageCopy[stage];
  return copy ?? { title: stage.replace(/_/g, ' '), hint: '' };
}

export function PartnerOnboardingTrackCard({
  track,
  workflow,
  partnerType,
  missingMessage,
}: PartnerOnboardingTrackCardProps) {
  const config = ONBOARDING_TRACK_CONFIG[track];
  const stageOrder =
    track === 'service' && partnerType
      ? workflow?.stageOrder?.length
        ? workflow.stageOrder
        : getPartnerOnboardingStageOrder(partnerType)
      : config.stageOrder;
  const trackTitle =
    track === 'service' && partnerType
      ? getServicePartnerOnboardingFlow(partnerType).title
      : config.title;
  const trackDescription =
    track === 'service' && partnerType
      ? getServicePartnerOnboardingFlow(partnerType).description
      : config.description;

  if (!workflow) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{trackTitle}</CardTitle>
          <CardDescription>{trackDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {missingMessage ??
              'Onboarding has not been started yet. Your platform contact will initialize this workflow.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const doneCount = workflow.completedStages?.length ?? 0;
  const total = stageOrder.length;
  const progressPct = Math.min(100, Math.round((doneCount / total) * 100));
  const currentMeta = stageMeta(track, workflow.currentStage);

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{trackTitle}</CardTitle>
            <CardDescription>
              Current stage:{' '}
              <span className="font-medium text-foreground">{currentMeta.title}</span>
              {partnerType ? ` · ${partnerType.replace(/_/g, ' ')}` : ''}
            </CardDescription>
          </div>
          <Badge variant={workflow.overallStatus === 'completed' ? 'default' : 'secondary'} className="capitalize">
            {workflow.overallStatus.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {doneCount} of {total} stages completed
            </span>
            <span>{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        {workflow.notes && (
          <p className="text-sm text-muted-foreground border-l-2 border-muted pl-3">{workflow.notes}</p>
        )}

        <ol className="relative border-l border-gray-200 ml-3 space-y-6 pl-8 py-1">
          {stageOrder.map((stage: string) => {
            const meta = stageMeta(track, stage);
            const st = workflow.stages?.[stage];
            const status = st?.status ?? 'pending';
            const isCurrent = workflow.currentStage === stage;
            const completed = status === 'completed' || workflow.completedStages?.includes(stage);

            return (
              <li key={stage} className="relative">
                <span
                  className={cn(
                    'absolute -left-[21px] flex h-9 w-9 items-center justify-center rounded-full border-2 bg-white',
                    completed && 'border-green-500 text-green-600',
                    !completed && isCurrent && 'border-blue-500 text-blue-600',
                    !completed && !isCurrent && 'border-gray-200 text-gray-400'
                  )}
                >
                  {completed ? <CheckCircle2 className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
                </span>
                <div
                  className={cn(
                    'rounded-lg border p-4 transition-colors',
                    isCurrent && 'border-blue-200 bg-blue-50/50',
                    !isCurrent && 'border-gray-100 bg-white'
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{meta.title}</p>
                      <p className="text-sm text-muted-foreground">{meta.hint}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className="capitalize">
                        {status.replace(/_/g, ' ')}
                      </Badge>
                      {(st as { submittedForReview?: boolean })?.submittedForReview && (
                        <Badge variant="secondary" className="text-xs">
                          Submitted
                        </Badge>
                      )}
                    </div>
                  </div>
                  {st?.notes && (
                    <p className="text-sm text-muted-foreground mt-2 border-t pt-2">{String(st.notes)}</p>
                  )}
                  {meta.link && (
                    <div className="mt-3">
                      <Button
                        variant={isCurrent || status === 'blocked' ? 'default' : 'secondary'}
                        size="sm"
                        asChild
                      >
                        {meta.link.params ? (
                          <Link
                            to={meta.link.to as '/partner/onboarding/supplier/$stage' | '/partner/onboarding/service/$stage'}
                            params={meta.link.params}
                          >
                            {isCurrent || status === 'blocked' ? meta.link.label : 'Open stage'}
                          </Link>
                        ) : (
                          <Link to={meta.link.to}>
                            {isCurrent || status === 'blocked' ? meta.link.label : 'Open stage'}
                          </Link>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
