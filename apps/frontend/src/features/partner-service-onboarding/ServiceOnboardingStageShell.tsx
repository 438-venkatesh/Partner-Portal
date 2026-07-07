import { Link } from '@tanstack/react-router';
import type { OnboardingStage } from '@/lib/api/onboarding';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Lock } from 'lucide-react';
import {
  resolveServiceStageOrder,
  resolvePartnerAdminOnlyStages,
  getServiceStageAccess,
  serviceStageMeta,
  type StageAccess,
} from '@/lib/serviceOnboardingConstants';
import { getPartnerStageFeedback } from '@/features/partner-supplier-onboarding/partnerStageFeedback';

interface WorkflowShape {
  currentStage: string;
  overallStatus: string;
  completedStages: string[];
  stages?: Record<
    string,
    {
      status?: string;
      submittedForReview?: boolean;
      stageData?: Record<string, unknown>;
      notes?: string;
    }
  >;
}

interface Props {
  stage: OnboardingStage;
  workflow: WorkflowShape & { stageOrder?: readonly string[]; partnerType?: string };
  partnerType: string;
  children: React.ReactNode;
}

function StatusBadge({ access, submitted }: { access: StageAccess; submitted: boolean }) {
  if (access === 'completed') return <Badge className="bg-green-600">Completed</Badge>;
  if (submitted) return <Badge variant="secondary">Awaiting review</Badge>;
  if (access === 'readonly') return <Badge variant="outline">Platform review</Badge>;
  if (access === 'locked')
    return (
      <Badge variant="outline">
        <Lock className="h-3 w-3 mr-1" />
        Locked
      </Badge>
    );
  return <Badge variant="default">In progress</Badge>;
}

export function ServiceOnboardingStageShell({ stage, workflow, partnerType, children }: Props) {
  const meta = serviceStageMeta(stage);
  const stageInfo = workflow.stages?.[stage];
  const stageOrder = resolveServiceStageOrder(partnerType, workflow);
  const adminOnly = resolvePartnerAdminOnlyStages(partnerType, workflow);
  const access = getServiceStageAccess(stage, workflow, partnerType);
  const idx = stageOrder.indexOf(stage);
  const doneCount = stageOrder.filter((s) => workflow.completedStages.includes(s)).length;
  const progressPct = Math.round((doneCount / stageOrder.length) * 100);
  const submitted = stageInfo?.submittedForReview;
  const feedback = getPartnerStageFeedback(stage, workflow, adminOnly);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/partner/onboarding">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to onboarding
        </Link>
      </Button>

      <header className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Step {idx + 1} of {stageOrder.length}
            </p>
            <h1 className="text-2xl font-semibold">{meta?.title ?? stage}</h1>
            <p className="text-sm text-muted-foreground mt-1">{meta?.hint}</p>
          </div>
          <StatusBadge access={access} submitted={!!submitted} />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {doneCount} of {stageOrder.length} stages completed
            </span>
            <span>{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
      </header>

      {feedback?.kind === 'rejected' && (
        <Alert variant="destructive">
          <AlertDescription>{feedback.message ?? 'Changes requested by the platform team.'}</AlertDescription>
        </Alert>
      )}
      {feedback?.kind === 'pending_review' && (
        <Alert>
          <AlertDescription>
            Submitted for platform review. You cannot edit until Operations approves or requests changes.
          </AlertDescription>
        </Alert>
      )}
      {feedback?.kind === 'platform_review' && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertDescription>
            This step is handled by the platform team. You will be notified when it is complete.
          </AlertDescription>
        </Alert>
      )}

      {access === 'locked' ? (
        <Alert>
          <AlertDescription>Complete earlier stages before working on this step.</AlertDescription>
        </Alert>
      ) : (
        children
      )}
    </div>
  );
}
