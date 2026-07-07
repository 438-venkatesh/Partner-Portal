import { Link } from '@tanstack/react-router';
import type { SupplierOnboardingStage } from '@/lib/api/onboarding';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import {
  SUPPLIER_STAGE_ORDER,
  getSupplierStageAccess,
  supplierStageShortLabel,
  type StageAccess,
} from './supplierOnboardingConstants';

interface WorkflowShape {
  currentStage: string;
  completedStages: string[];
  stages?: Record<string, { status?: string }>;
}

interface Props {
  activeStage: SupplierOnboardingStage;
  workflow: WorkflowShape;
}

export function SupplierOnboardingStepper({ activeStage, workflow }: Props) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/40 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Onboarding steps
        </p>
        <p className="text-xs text-muted-foreground">
          {workflow.completedStages.length} / {SUPPLIER_STAGE_ORDER.length} done
        </p>
      </div>
      <ol className="flex items-stretch overflow-x-auto scrollbar-thin px-2 py-4 gap-0 min-h-[72px]">
        {SUPPLIER_STAGE_ORDER.map((s, i) => {
          const isActive = s === activeStage;
          const isDone = workflow.completedStages.includes(s);
          const access = getSupplierStageAccess(s, workflow);
          const isLast = i === SUPPLIER_STAGE_ORDER.length - 1;

          return (
            <li key={s} className="flex items-center flex-shrink-0">
              <StepLink
                stage={s}
                stepNumber={i + 1}
                label={supplierStageShortLabel(s)}
                isActive={isActive}
                isDone={isDone}
                access={access}
              />
              {!isLast && (
                <div
                  className={cn(
                    'h-px w-4 sm:w-6 mx-0.5 flex-shrink-0',
                    isDone ? 'bg-emerald-300' : 'bg-border'
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StepLink({
  stage,
  stepNumber,
  label,
  isActive,
  isDone,
  access,
}: {
  stage: SupplierOnboardingStage;
  stepNumber: number;
  label: string;
  isActive: boolean;
  isDone: boolean;
  access: StageAccess;
}) {
  const locked = access === 'locked';

  return (
    <Link
      to="/partner/onboarding/supplier/$stage"
      params={{ stage }}
      title={label}
      className={cn(
        'group flex flex-col items-center gap-1.5 px-2 py-1 rounded-lg min-w-[4.5rem] max-w-[5.5rem] transition-colors',
        locked && 'pointer-events-none opacity-45',
        !locked && !isActive && 'hover:bg-muted/60',
        isActive && 'bg-primary/5'
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold border-2 transition-colors',
          isDone && 'border-emerald-500 bg-emerald-500 text-white',
          !isDone && isActive && 'border-primary bg-primary text-primary-foreground',
          !isDone && !isActive && 'border-muted-foreground/30 bg-background text-muted-foreground group-hover:border-muted-foreground/50'
        )}
      >
        {isDone ? <Check className="h-4 w-4" strokeWidth={2.5} /> : stepNumber}
      </span>
      <span
        className={cn(
          'text-[11px] font-medium text-center leading-tight w-full truncate',
          isActive && 'text-foreground',
          !isActive && isDone && 'text-emerald-700',
          !isActive && !isDone && 'text-muted-foreground'
        )}
      >
        {label}
      </span>
    </Link>
  );
}
