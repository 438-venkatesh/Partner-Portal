import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { partnerOnboardingApi } from '@/lib/api/partnerOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FormTextarea } from '@/components/ui/form-field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FlaskConical, Layers, Clock } from 'lucide-react';

interface Props {
  initial?: Record<string, unknown>;
  editable: boolean;
  submitted: boolean;
  onSubmit: () => void;
  submitting: boolean;
}

export function ServiceTestingStagePanel({
  initial,
  editable,
  submitted,
  onSubmit,
  submitting,
}: Props) {
  const [pilotCompleted, setPilotCompleted] = useState(
    !!initial?.pilotCompleted || !!initial?.pilotWithTenant
  );
  const [handoffVerified, setHandoffVerified] = useState(!!initial?.handoffVerified);
  const [issuesResolved, setIssuesResolved] = useState(!!initial?.issuesResolved);
  const [notes, setNotes] = useState((initial?.notes as string) || '');

  const allChecked = pilotCompleted && handoffVerified && issuesResolved;

  const saveAndSubmit = useMutation({
    mutationFn: () =>
      partnerOnboardingApi.saveDraft('testing', {
        pilotCompleted: true,
        pilotWithTenant: true,
        handoffVerified,
        issuesResolved,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => onSubmit(),
  });

  const isBusy = submitting || saveAndSubmit.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Pilot testing
          </CardTitle>
          <CardDescription>
            Confirm you completed a pilot with at least one tenant workflow and resolved any blocking
            issues before go-live review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to="/partner/tenants"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Tenant workspaces</span>
            </Link>
            <Link
              to="/partner/timelines"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Service timelines</span>
            </Link>
          </div>

          <div className="space-y-4 border-t pt-4">
            {[
              {
                id: 'pilot',
                label: 'We completed a pilot test with at least one active tenant / service workflow',
                checked: pilotCompleted,
                set: setPilotCompleted,
              },
              {
                id: 'handoff',
                label: 'Delivery handoffs, notifications, and portal access worked as expected',
                checked: handoffVerified,
                set: setHandoffVerified,
              },
              {
                id: 'issues',
                label: 'Pilot issues are documented and resolved (or accepted by operations)',
                checked: issuesResolved,
                set: setIssuesResolved,
              },
            ].map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <Checkbox
                  id={item.id}
                  checked={item.checked}
                  onCheckedChange={(v) => item.set(v === true)}
                  disabled={!editable}
                  className="mt-0.5"
                />
                <Label htmlFor={item.id} className="text-sm leading-relaxed cursor-pointer">
                  {item.label}
                </Label>
              </div>
            ))}
          </div>

          <FormTextarea
            label="Pilot summary (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!editable}
            rows={3}
            placeholder="Tenant used, dates, scenarios tested, outstanding items…"
          />

          {editable && !submitted && (
            <Button disabled={!allChecked || isBusy} onClick={() => saveAndSubmit.mutate()}>
              {isBusy ? 'Submitting…' : 'Submit pilot testing for review'}
            </Button>
          )}

          {submitted && (
            <Alert className="border-blue-100 bg-blue-50">
              <AlertDescription>
                Pilot testing submitted for platform review. Operations will validate before go-live.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
