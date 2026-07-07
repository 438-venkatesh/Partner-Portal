import { Link } from '@tanstack/react-router';

import type { SupplierOnboardingStage } from '@/lib/api/onboarding';

import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';

import { Progress } from '@/components/ui/progress';

import { Alert, AlertDescription } from '@/components/ui/alert';

import { ArrowLeft, ChevronLeft, ChevronRight, Lock } from 'lucide-react';

import {

  SUPPLIER_STAGE_ORDER,

  getSupplierStageAccess,

  supplierStageMeta,

  type StageAccess,

} from './supplierOnboardingConstants';

import { SupplierOnboardingStepper } from './SupplierOnboardingStepper';
import { getPartnerStageFeedback } from './partnerStageFeedback';



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

  notes?: string;

}



interface Props {

  stage: SupplierOnboardingStage;

  workflow: WorkflowShape;

  children: React.ReactNode;

  showStepNav?: boolean;

}



export function SupplierOnboardingStageShell({

  stage,

  workflow,

  children,

  showStepNav = true,

}: Props) {

  const meta = supplierStageMeta(stage);

  const stageInfo = workflow.stages?.[stage];

  const access = getSupplierStageAccess(stage, workflow);

  const idx = SUPPLIER_STAGE_ORDER.indexOf(stage);

  const doneCount = workflow.completedStages.length;

  const progressPct = Math.round((doneCount / SUPPLIER_STAGE_ORDER.length) * 100);

  const submitted = stageInfo?.submittedForReview;

  const blocked = stageInfo?.status === 'blocked';

  const stageFeedback = getPartnerStageFeedback(stage, workflow);



  const prevStage = idx > 0 ? SUPPLIER_STAGE_ORDER[idx - 1] : null;

  const nextStage = idx < SUPPLIER_STAGE_ORDER.length - 1 ? SUPPLIER_STAGE_ORDER[idx + 1] : null;

  const stageComplete =
    workflow.completedStages.includes(stage) || stageInfo?.status === 'completed';

  return (

    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">

      <nav className="flex flex-wrap items-center gap-2 text-sm">

        <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" asChild>

          <Link to="/partner/onboarding">

            <ArrowLeft className="h-4 w-4 mr-1.5" />

            Onboarding

          </Link>

        </Button>

        <span className="text-muted-foreground/50">/</span>

        <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" asChild>

          <Link to="/partner/dashboard">Dashboard</Link>

        </Button>

      </nav>



      <header className="rounded-xl border bg-card p-6 shadow-sm space-y-5">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

          <div className="space-y-1 min-w-0">

            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">

              Step {idx + 1} of {SUPPLIER_STAGE_ORDER.length}

            </p>

            <h1 className="text-2xl font-semibold tracking-tight text-foreground">

              {meta?.title ?? stage}

            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{meta?.hint}</p>

          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">

            <StatusBadge access={access} submitted={!!submitted} />

            {workflow.currentStage === stage && (

              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">

                Current

              </Badge>

            )}

          </div>

        </div>



        <div className="space-y-2">

          <div className="flex justify-between text-xs text-muted-foreground">

            <span>Overall progress</span>

            <span className="font-medium tabular-nums">{progressPct}%</span>

          </div>

          <Progress value={progressPct} className="h-1.5" />

        </div>

      </header>



      <SupplierOnboardingStepper activeStage={stage} workflow={workflow} />



      {access === 'locked' && (

        <Alert className="border-amber-200 bg-amber-50/80">

          <Lock className="h-4 w-4 text-amber-700" />

          <AlertDescription className="text-amber-900">

            Complete earlier steps first. Your active step is{' '}

            <strong>

              {supplierStageMeta(workflow.currentStage as SupplierOnboardingStage)?.title}

            </strong>

            .

          </AlertDescription>

        </Alert>

      )}



      {stageFeedback?.kind === 'rejected' && stageFeedback.message && (

        <Alert variant="destructive">

          <AlertDescription>

            <span className="font-medium">Changes requested by operations — </span>

            {stageFeedback.message}

          </AlertDescription>

        </Alert>

      )}



      {stageFeedback?.kind === 'approved' && stageComplete && (

        <Alert className="border-emerald-200 bg-emerald-50/90 text-emerald-900">

          <AlertDescription>

            <span className="font-medium">Approved by operations.</span>

            {stageFeedback.message

              ? ` ${stageFeedback.message}`

              : ' You can continue to the next step.'}

          </AlertDescription>

        </Alert>

      )}



      {stageFeedback?.kind === 'pending_review' && access === 'editable' && (

        <Alert className="border-blue-200 bg-blue-50/90 text-blue-900">

          <AlertDescription>

            Submitted for platform review. You can still update until operations approves or requests

            changes.

          </AlertDescription>

        </Alert>

      )}



      {stageFeedback?.kind === 'platform_review' && (

        <Alert className="border-amber-200 bg-amber-50/90 text-amber-950">

          <AlertDescription>

            This step is handled by the operations team. You can view status here; we will post any

            feedback if a prior step needs changes.

          </AlertDescription>

        </Alert>

      )}



      {access !== 'locked' && <main className="space-y-6">{children}</main>}



      {showStepNav && access !== 'locked' && (

        <footer className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-2 border-t">

          {prevStage ? (

            <Button variant="outline" size="sm" className="justify-start" asChild>

              <Link to="/partner/onboarding/supplier/$stage" params={{ stage: prevStage }}>

                <ChevronLeft className="h-4 w-4 mr-1" />

                <span className="truncate max-w-[200px]">

                  {supplierStageMeta(prevStage).title}

                </span>

              </Link>

            </Button>

          ) : (

            <span />

          )}

          {nextStage ? (
            stageComplete ? (
              <Button variant="outline" size="sm" className="justify-end sm:ml-auto" asChild>
                <Link to="/partner/onboarding/supplier/$stage" params={{ stage: nextStage }}>
                  <span className="truncate max-w-[200px]">{supplierStageMeta(nextStage).title}</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="justify-end sm:ml-auto"
                disabled
                title="Complete and get approval for this step before continuing"
              >
                <span className="truncate max-w-[200px]">{supplierStageMeta(nextStage).title}</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )
          ) : null}

        </footer>

      )}

    </div>

  );

}



function StatusBadge({ access, submitted }: { access: StageAccess; submitted: boolean }) {

  if (submitted) {

    return (

      <Badge className="bg-blue-600 hover:bg-blue-600 font-normal">Awaiting review</Badge>

    );

  }

  if (access === 'completed') {

    return <Badge className="bg-emerald-600 hover:bg-emerald-600 font-normal">Completed</Badge>;

  }

  if (access === 'locked') {

    return <Badge variant="outline" className="font-normal">Locked</Badge>;

  }

  if (access === 'readonly') {

    return <Badge variant="secondary" className="font-normal">View only</Badge>;

  }

  return <Badge variant="outline" className="font-normal">In progress</Badge>;

}


