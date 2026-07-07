import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerSupplierOnboardingApi } from '@/lib/api/partnerSupplierOnboarding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FormTextarea } from '@/components/ui/form-field';
import { GraduationCap, Settings, FileText } from 'lucide-react';

interface Props {
  initial?: Record<string, unknown>;
  editable: boolean;
  submitted: boolean;
  onSubmit: () => void;
  submitting: boolean;
}

export function PortalAccessStagePanel({
  initial,
  editable,
  submitted,
  onSubmit,
  submitting,
}: Props) {
  const queryClient = useQueryClient();
  const [trainingCompleted, setTrainingCompleted] = useState(!!initial?.trainingCompleted);
  const [poWorkflowUnderstood, setPoWorkflowUnderstood] = useState(!!initial?.poWorkflowUnderstood);
  const [invoiceFlowUnderstood, setInvoiceFlowUnderstood] = useState(!!initial?.invoiceFlowUnderstood);
  const [notes, setNotes] = useState((initial?.notes as string) || '');

  const saveMutation = useMutation({
    mutationFn: () =>
      partnerSupplierOnboardingApi.savePortalChecklist({
        trainingCompleted,
        poWorkflowUnderstood,
        invoiceFlowUnderstood,
        notes: notes || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['partner-supplier-onboarding'] });
      onSubmit();
    },
  });

  const allChecked = trainingCompleted && poWorkflowUnderstood && invoiceFlowUnderstood;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Portal training & readiness
          </CardTitle>
          <CardDescription>
            Confirm you understand how to use the supplier portal before go-live.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to="/partner/settings"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Account settings</span>
            </Link>
            <Link
              to="/partner/documents"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Documents</span>
            </Link>
          </div>

          <div className="space-y-4 border-t pt-4">
            {[
              {
                id: 'training',
                label: 'I completed supplier portal training (or equivalent enablement)',
                checked: trainingCompleted,
                set: setTrainingCompleted,
              },
              {
                id: 'po',
                label: 'I understand how to acknowledge purchase orders in this portal',
                checked: poWorkflowUnderstood,
                set: setPoWorkflowUnderstood,
              },
              {
                id: 'inv',
                label: 'I understand invoice submission and payment terms visibility',
                checked: invoiceFlowUnderstood,
                set: setInvoiceFlowUnderstood,
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
            placeholder="Training date, questions, or pilot PO reference…"
          />

          {editable && !submitted && (
            <Button
              disabled={!allChecked || saveMutation.isPending || submitting}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending || submitting ? 'Submitting…' : 'Save checklist & submit for review'}
            </Button>
          )}

          {submitted && (
            <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-md p-3">
              Training checklist submitted. Operations will confirm before activation.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
