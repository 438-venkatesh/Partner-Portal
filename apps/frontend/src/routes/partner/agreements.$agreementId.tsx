import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AgreementSignConfirmDialog } from '@/components/agreements/AgreementSignConfirmDialog';
import { partnerAgreementsApi } from '@/lib/api/partnerAgreementsApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/lib/hooks/use-toast';
import { ArrowLeft, Calendar, PenLine } from 'lucide-react';

export const Route = createFileRoute('/partner/agreements/$agreementId')({
  component: PartnerAgreementDetailPage,
});

function PartnerAgreementDetailPage() {
  const { agreementId } = Route.useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [signDialogOpen, setSignDialogOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['partner-agreements', agreementId],
    queryFn: () => partnerAgreementsApi.get(agreementId),
  });

  const signMutation = useMutation({
    mutationFn: (fullName: string) => partnerAgreementsApi.sign(agreementId, fullName),
    onSuccess: () => {
      setSignDialogOpen(false);
      toast({ title: 'Signed', description: 'Agreement status has been updated.' });
      queryClient.invalidateQueries({ queryKey: ['partner-agreements'] });
      queryClient.invalidateQueries({ queryKey: ['partner-agreements', agreementId] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Could not sign agreement';
      toast({ title: 'Sign failed', description: msg, variant: 'destructive' });
    },
  });

  const a = data?.agreement;
  const canSign =
    a &&
    a.status !== 'signed' &&
    a.status !== 'cancelled' &&
    a.status !== 'terminated';

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/partner/agreements">
          <Button variant="outline" size="icon" type="button" aria-label="Back to agreements">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Agreement</h1>
          <p className="text-sm text-muted-foreground">Review details and sign when you are ready.</p>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Could not load agreement.</p>}

      {a && (
        <Card className="border-gray-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <CardTitle className="text-2xl leading-tight">{a.title}</CardTitle>
                <CardDescription className="font-mono text-xs">{a.agreementNumber}</CardDescription>
              </div>
              <Badge variant="outline" className="capitalize shrink-0">
                {a.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Type</p>
                <p className="font-medium mt-1">{a.agreementType}</p>
              </div>
              {a.tenantId && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Tenant</p>
                  <p className="font-mono text-xs mt-1 break-all">{a.tenantId}</p>
                </div>
              )}
              {a.createdAt && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Created</p>
                    <p className="font-medium mt-1">
                      {new Date(a.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                </div>
              )}
              {a.updatedAt && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Last updated</p>
                    <p className="font-medium mt-1">
                      {new Date(a.updatedAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {a.description && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Description</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{a.description}</p>
                </div>
              </>
            )}

            {canSign && (
              <>
                <Separator />
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
                  <div className="text-sm text-amber-950">
                    <p className="font-medium">Ready to sign?</p>
                    <p className="text-amber-900/80">This records your acceptance in the partner portal.</p>
                  </div>
                  <Button
                    type="button"
                    disabled={signMutation.isPending}
                    onClick={() => setSignDialogOpen(true)}
                    className="shrink-0"
                  >
                    <PenLine className="h-4 w-4 mr-2" />
                    Sign agreement
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
      {a && (
        <AgreementSignConfirmDialog
          open={signDialogOpen}
          onOpenChange={setSignDialogOpen}
          agreementTitle={a.title}
          agreementNumber={a.agreementNumber}
          isPending={signMutation.isPending}
          onConfirm={(fullName) => signMutation.mutate(fullName)}
        />
      )}
    </div>
  );
}
