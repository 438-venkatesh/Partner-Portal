import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rocket, CheckCircle2 } from 'lucide-react';
import { SUPPLIER_STAGE_ORDER } from '../supplierOnboardingConstants';

interface Props {
  workflow: {
    completedStages: string[];
    overallStatus: string;
  };
  notes?: string;
}

export function ActivationStagePanel({ workflow, notes }: Props) {
  const allButLast = SUPPLIER_STAGE_ORDER.slice(0, -1);
  const prereqsMet = allButLast.every((s) => workflow.completedStages.includes(s));
  const activated = workflow.overallStatus === 'completed';

  return (
    <Card className={activated ? 'border-green-200 bg-green-50/30' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Supplier activation
        </CardTitle>
        <CardDescription>
          Final go-live step performed by operations. Once activated, your catalog can be shared with tenants and
          your account is fully enabled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Badge variant={activated ? 'default' : 'outline'} className="text-sm">
          {activated ? 'Supplier activated' : 'Awaiting final activation'}
        </Badge>

        <ul className="space-y-2">
          {allButLast.map((stage) => {
            const done = workflow.completedStages.includes(stage);
            return (
              <li key={stage} className="flex items-center gap-2 text-sm">
                <CheckCircle2
                  className={`h-4 w-4 ${done ? 'text-green-600' : 'text-muted-foreground/40'}`}
                />
                <span className={done ? 'text-foreground' : 'text-muted-foreground'}>
                  {stage.replace(/_/g, ' ')}
                </span>
              </li>
            );
          })}
        </ul>

        {!prereqsMet && (
          <p className="text-sm text-muted-foreground border-t pt-4">
            Complete all prior stages before activation can proceed.
          </p>
        )}

        {prereqsMet && !activated && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
            All onboarding steps are complete on your side. Operations will run final activation to enable
            your supplier account and catalog — no action needed unless we send feedback below.
          </p>
        )}

        {notes?.trim() && (
          <p className="text-sm text-muted-foreground border-t pt-3">
            <span className="font-medium text-foreground">Note from operations: </span>
            {notes.trim()}
          </p>
        )}

        {activated && (
          <p className="text-sm text-green-800 bg-green-100/80 rounded-md p-3">
            Congratulations — your supplier onboarding is complete. Use the product catalog and documents
            sections to manage ongoing operations.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
