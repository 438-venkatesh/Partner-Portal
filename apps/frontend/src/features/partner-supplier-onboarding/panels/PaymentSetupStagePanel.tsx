import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Info } from 'lucide-react';

interface Props {
  supplier?: Record<string, unknown>;
  stageData?: Record<string, unknown>;
  completed?: boolean;
  notes?: string;
}

export function PaymentSetupStagePanel({ supplier, stageData, completed, notes }: Props) {
  const paymentTerms = (supplier?.paymentTerms as string) || (stageData?.paymentTerms as string);
  const creditLimit = supplier?.creditLimit ?? stageData?.creditLimit;
  const currency = (supplier?.currency as string) || (stageData?.currency as string) || 'USD';
  const configured = Boolean(paymentTerms);
  const reviewerNote = String(stageData?.notes ?? notes ?? '').trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment & terms
        </CardTitle>
        <CardDescription>
          Payment terms are configured by the platform operations team after your agreement is in place.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!configured ? (
          <div className="flex gap-3 p-4 rounded-lg border bg-muted/30">
            <Info className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="font-medium">Not configured yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                You will see your payment terms here once operations completes this step. No action is required
                from you.
              </p>
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border">
              <dt className="text-xs text-muted-foreground uppercase tracking-wide">Payment terms</dt>
              <dd className="text-lg font-semibold mt-1">{paymentTerms}</dd>
            </div>
            <div className="p-4 rounded-lg border">
              <dt className="text-xs text-muted-foreground uppercase tracking-wide">Credit limit</dt>
              <dd className="text-lg font-semibold mt-1">
                {creditLimit != null ? `${currency} ${creditLimit}` : '—'}
              </dd>
            </div>
            <div className="p-4 rounded-lg border sm:col-span-2">
              <dt className="text-xs text-muted-foreground uppercase tracking-wide">Currency</dt>
              <dd className="text-lg font-semibold mt-1">{currency}</dd>
            </div>
          </dl>
        )}
        <div className="flex flex-wrap gap-2">
          <Badge variant={configured ? 'default' : 'outline'}>
            {configured ? 'Terms assigned' : 'Pending operations setup'}
          </Badge>
          {completed && (
            <Badge className="bg-emerald-600 hover:bg-emerald-600">Step complete</Badge>
          )}
        </div>

        {configured && !completed && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
            Payment terms are on file. Operations will confirm this step so you can continue to portal
            training — no action needed from you unless we send feedback below.
          </p>
        )}

        {completed && (
          <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md p-3">
            Payment setup is complete. Continue to <strong>Portal training</strong> when ready.
          </p>
        )}

        {reviewerNote && (
          <p className="text-sm text-muted-foreground border-t pt-3">
            <span className="font-medium text-foreground">Note from operations: </span>
            {reviewerNote}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
