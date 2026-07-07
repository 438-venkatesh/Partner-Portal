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
import { GraduationCap, Layers, FileText, Users } from 'lucide-react';

interface Props {
  initial?: Record<string, unknown>;
  editable: boolean;
  submitted: boolean;
  onSubmit: () => void;
  submitting: boolean;
}

export function ServiceTrainingStagePanel({
  initial,
  editable,
  submitted,
  onSubmit,
  submitting,
}: Props) {
  const [portalTraining, setPortalTraining] = useState(
    !!initial?.trainingCompleted || !!initial?.portalTraining
  );
  const [tenantsUnderstood, setTenantsUnderstood] = useState(!!initial?.tenantsUnderstood);
  const [complianceUnderstood, setComplianceUnderstood] = useState(!!initial?.complianceUnderstood);
  const [notes, setNotes] = useState((initial?.notes as string) || '');

  const allChecked = portalTraining && tenantsUnderstood && complianceUnderstood;

  const saveAndSubmit = useMutation({
    mutationFn: () =>
      partnerOnboardingApi.saveDraft('training', {
        trainingCompleted: true,
        portalTraining: true,
        tenantsUnderstood,
        complianceUnderstood,
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
            <GraduationCap className="h-5 w-5" />
            Enablement &amp; training
          </CardTitle>
          <CardDescription>
            Complete partner portal training and confirm you understand how to work with tenants,
            services, and compliance before submitting for review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to="/partner/tenants"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Tenants</span>
            </Link>
            <Link
              to="/partner/documents"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Documents</span>
            </Link>
            <Link
              to="/partner/employees"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Employees</span>
            </Link>
            <Link
              to="/partner/services"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Services</span>
            </Link>
          </div>

          <div className="space-y-4 border-t pt-4">
            {[
              {
                id: 'portal-training',
                label: 'I completed partner portal enablement (live session, recording, or self-guided)',
                checked: portalTraining,
                set: setPortalTraining,
              },
              {
                id: 'tenants',
                label: 'I understand tenant relationships, service timelines, and delivery handoffs',
                checked: tenantsUnderstood,
                set: setTenantsUnderstood,
              },
              {
                id: 'compliance',
                label: 'I understand document uploads, agreements, and compliance expectations',
                checked: complianceUnderstood,
                set: setComplianceUnderstood,
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
            label="Notes for operations (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!editable}
            rows={3}
            placeholder="Training date, cohort name, or open questions…"
          />

          {editable && !submitted && (
            <Button disabled={!allChecked || isBusy} onClick={() => saveAndSubmit.mutate()}>
              {isBusy ? 'Submitting…' : 'Submit training for review'}
            </Button>
          )}

          {submitted && (
            <Alert className="border-blue-100 bg-blue-50">
              <AlertDescription>
                Training submitted for platform review. Operations will confirm before you proceed to
                testing.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
