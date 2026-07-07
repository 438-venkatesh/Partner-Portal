import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OnboardingStage, OnboardingWorkflow } from '@/lib/api/onboarding';
import { SERVICE_REQUIRED_DOCUMENTS } from '@/lib/serviceOnboardingConstants';
import { serviceApi } from '@/lib/api/services';
import { partnerApi } from '@/lib/api/partners';
import { AdminSupplierDocumentsReviewPanel } from '@/features/suppliers/components/AdminSupplierDocumentsReviewPanel';
import { AdminAgreementsReviewPanel } from '@/components/admin/AdminAgreementsReviewPanel';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import {
  resolvePartnerAdminOnlyStages,
  resolveServiceStageOrder,
} from '@/lib/serviceOnboardingConstants';

const STAGE_LABELS: Record<OnboardingStage, string> = {
  registration: 'Registration',
  service_selection: 'Service selection',
  initial_review: 'Initial review',
  documentation: 'Documentation',
  verification: 'Verification',
  agreement: 'Agreement',
  app_access: 'App access',
  user_setup: 'User setup',
  training: 'Training',
  testing: 'Testing',
  go_live: 'Go live',
};

const PARTNER_REQUIRED_DOCS = SERVICE_REQUIRED_DOCUMENTS.map(({ type, label }) => ({ type, label }));

interface Props {
  partnerId: string;
  stage: OnboardingStage;
  stageData?: Record<string, unknown>;
  workflow?: OnboardingWorkflow;
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-sm py-1.5 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium break-words">{value}</span>
    </div>
  );
}

function boolLabel(value: unknown): boolean {
  return value === true;
}

function AttestationChecklistReview({
  title,
  description,
  items,
  notes,
}: {
  title: string;
  description: string;
  items: Array<{ label: string; confirmed: boolean }>;
  notes?: string | null;
}) {
  const confirmedCount = items.filter((i) => i.confirmed).length;

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">
          {confirmedCount} / {items.length} attestations confirmed
        </Badge>
      </div>

      <ul className="space-y-2 rounded-md border bg-background p-3">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2.5 text-sm">
            {item.confirmed ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <span className={item.confirmed ? 'text-foreground' : 'text-muted-foreground'}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      {notes?.trim() ? (
        <div className="rounded-md border bg-background p-3 text-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Partner notes
          </p>
          <p className="whitespace-pre-wrap">{notes.trim()}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">No additional notes from partner.</p>
      )}
    </div>
  );
}

export function AdminPartnerStageSubmissionPanel({ partnerId, stage, stageData, workflow }: Props) {
  const { data: relationshipsData, isLoading: loadingRelationships } = useQuery({
    queryKey: ['partner-relationships', partnerId],
    queryFn: () => serviceApi.getPartnerRelationships(partnerId),
    enabled: stage === 'service_selection' || stage === 'initial_review',
  });

  const { data: partner, isLoading: loadingPartner } = useQuery({
    queryKey: ['partners', partnerId],
    queryFn: () => partnerApi.getById(partnerId),
    enabled: stage === 'registration' || stage === 'initial_review' || stage === 'verification',
  });


  const { data: readiness, isLoading: loadingReadiness } = useQuery({
    queryKey: ['partners', partnerId, 'activation-readiness'],
    queryFn: () => partnerApi.getActivationReadiness(partnerId),
    enabled: stage === 'verification' || stage === 'go_live',
  });

  const { data: portalUsersData, isLoading: loadingPortalUsers } = useQuery({
    queryKey: ['partners', partnerId, 'portal-users'],
    queryFn: () => partnerApi.getPortalUsers(partnerId),
    enabled: stage === 'user_setup',
  });

  const relationships = relationshipsData?.relationships ?? [];
  const activeRelationships = useMemo(
    () => relationships.filter((r) => r.status === 'active'),
    [relationships]
  );

  if (stage === 'service_selection') {
    return (
      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <div>
          <h3 className="text-sm font-semibold">Submitted service selection</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Active tenant–service relationships the partner will deliver. Verify each link before
            approving.
          </p>
        </div>

        {loadingRelationships ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading relationships…
          </p>
        ) : activeRelationships.length === 0 ? (
          <Alert variant="destructive">
            <AlertDescription>
              No active service relationships found. The partner cannot proceed until Operations
              creates an active tenant–service link.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{relationships.length} total links</Badge>
              <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                {activeRelationships.length} active
              </Badge>
            </div>
            <div className="rounded-md border overflow-hidden bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relationships.map((row) => (
                    <TableRow key={row.relationshipId}>
                      <TableCell>
                        <p className="font-medium">{row.tenant?.tenantName ?? row.tenantId}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {row.tenant?.tenantCode}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{row.service?.serviceName ?? row.serviceId}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {row.service?.serviceCode}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={row.status === 'active' ? 'default' : 'secondary'}
                          className="font-normal capitalize"
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    );
  }

  if (stage === 'documentation') {
    return (
      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <div>
          <h3 className="text-sm font-semibold">Uploaded compliance documents</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Verify all required document types are present and valid before approval.
          </p>
        </div>
        <AdminSupplierDocumentsReviewPanel
          partnerId={partnerId}
          canVerify
          requiredDocuments={PARTNER_REQUIRED_DOCS}
        />
      </div>
    );
  }

  if (stage === 'agreement') {
    return (
      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <div>
          <h3 className="text-sm font-semibold">Partner agreement</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Accept or reject each agreement. At least one signed agreement is required before stage approval.
          </p>
        </div>
        <AdminAgreementsReviewPanel partnerId={partnerId} />
      </div>
    );
  }

  if (stage === 'registration') {
    return (
      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <div>
          <h3 className="text-sm font-semibold">Registration details</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Company profile submitted by the partner.</p>
        </div>
        {loadingPartner ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading partner profile…
          </p>
        ) : (
          <div className="rounded-md border bg-background p-3">
            <DetailRow label="Company name" value={partner?.partnerName} />
            <DetailRow label="Display name" value={partner?.displayName} />
            <DetailRow label="Website" value={partner?.website} />
            <DetailRow label="Description" value={partner?.description} />
            <DetailRow
              label="Terms accepted"
              value={stageData?.acceptedTerms === true ? 'Yes' : 'No'}
            />
          </div>
        )}
      </div>
    );
  }

  if (stage === 'user_setup') {
    const portalUsers = portalUsersData?.employees ?? [];

    return (
      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <div>
          <h3 className="text-sm font-semibold">Portal users submitted for review</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Verify the partner has configured portal users before approving user setup.
          </p>
        </div>
        {loadingPortalUsers ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading portal users…
          </p>
        ) : portalUsers.length === 0 ? (
          <Alert variant="destructive">
            <AlertDescription>No portal users found for this partner.</AlertDescription>
          </Alert>
        ) : (
          <>
            <Badge variant="outline">{portalUsers.length} portal user(s)</Badge>
            <div className="rounded-md border overflow-hidden bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portalUsers.map((user) => (
                    <TableRow key={user.accountId}>
                      <TableCell className="font-medium">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : '—'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="capitalize">{user.role ?? 'member'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal capitalize">
                          {user.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    );
  }

  if (stage === 'training') {
    const notes = typeof stageData?.notes === 'string' ? stageData.notes : null;

    return (
      <AttestationChecklistReview
        title="Training attestations"
        description="Each item below was confirmed by the partner before submission."
        notes={notes}
        items={[
          {
            label: 'Completed partner portal enablement (live session, recording, or self-guided)',
            confirmed: boolLabel(stageData?.trainingCompleted) || boolLabel(stageData?.portalTraining),
          },
          {
            label: 'Understands tenant relationships, service timelines, and delivery handoffs',
            confirmed: boolLabel(stageData?.tenantsUnderstood),
          },
          {
            label: 'Understands document uploads, agreements, and compliance expectations',
            confirmed: boolLabel(stageData?.complianceUnderstood),
          },
        ]}
      />
    );
  }

  if (stage === 'testing') {
    const notes = typeof stageData?.notes === 'string' ? stageData.notes : null;

    return (
      <AttestationChecklistReview
        title="Pilot testing attestations"
        description="Partner confirmed the following pilot outcomes before submission."
        notes={notes}
        items={[
          {
            label: 'Completed a pilot test with at least one active tenant / service workflow',
            confirmed: boolLabel(stageData?.pilotCompleted) || boolLabel(stageData?.pilotWithTenant),
          },
          {
            label: 'Delivery handoffs, notifications, and portal access worked as expected',
            confirmed: boolLabel(stageData?.handoffVerified),
          },
          {
            label: 'Pilot issues are documented and resolved (or accepted by operations)',
            confirmed: boolLabel(stageData?.issuesResolved),
          },
        ]}
      />
    );
  }

  const adminOnly = workflow
    ? resolvePartnerAdminOnlyStages(workflow.partnerType ?? 'agency', workflow)
    : [];
  const progressStages = workflow
    ? resolveServiceStageOrder(workflow.partnerType ?? 'agency', workflow)
    : [];

  if (adminOnly.includes(stage) || stage === 'verification') {
    return (
      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <div>
          <h3 className="text-sm font-semibold">Onboarding progress</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review prior stages before completing this operations step.
          </p>
        </div>
        {workflow ? (
          <ul className="space-y-1.5 text-sm">
            {progressStages.map((key) => {
              const label = STAGE_LABELS[key];
              const info = workflow.stages[key];
              const done =
                workflow.completedStages.includes(key) || info?.status === 'completed';
              const current = workflow.currentStage === key;
              return (
                <li key={key} className="flex items-center gap-2">
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : current ? (
                    <Loader2 className="h-4 w-4 text-amber-600 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={done ? 'text-muted-foreground' : current ? 'font-medium' : ''}>
                    {label}
                    {current && !done ? ' (current)' : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Workflow data unavailable.</p>
        )}
        {(stage === 'verification' || stage === 'go_live') && readiness && !readiness.ready && (
          <Alert variant="destructive">
            <AlertDescription>{readiness.blockers.join('. ')}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return null;
}

export function getPartnerStageApproveHint(
  stage: OnboardingStage,
  context: {
    activeRelationships: number;
    missingDocs: number;
    signedAgreements: number;
    portalUserCount?: number;
    trainingCompleted?: boolean;
    trainingChecklistComplete?: boolean;
    pilotCompleted?: boolean;
    testingChecklistComplete?: boolean;
  }
): string {
  switch (stage) {
    case 'service_selection':
      return context.activeRelationships === 0
        ? 'At least one active tenant–service relationship is required before approval.'
        : 'Verify tenant–service links match what Operations assigned, then approve.';
    case 'documentation':
      return context.missingDocs > 0
        ? `${context.missingDocs} required document type(s) still need an approved file.`
        : 'Review each file (approve or reject), then approve the stage to advance.';
    case 'agreement':
      return context.signedAgreements === 0
        ? 'Partner must sign at least one agreement before you can approve the stage.'
        : 'Accept or reject agreements above, then approve the stage.';
    case 'user_setup':
      return (context.portalUserCount ?? 0) === 0
        ? 'At least one portal user must exist before user setup can be approved.'
        : `Review ${context.portalUserCount} portal user(s), then approve.`;
    case 'training':
      return context.trainingChecklistComplete
        ? 'All training attestations confirmed by partner — review notes, then approve.'
        : 'Partner did not complete all training checklist items.';
    case 'testing':
      return context.testingChecklistComplete
        ? 'All pilot testing attestations confirmed — review notes, then approve.'
        : 'Partner did not complete all pilot testing checklist items.';
    default:
      return 'Review the submission below, then approve or reject with feedback.';
  }
}

export function partnerStageBlocksApprove(
  stage: OnboardingStage,
  context: {
    activeRelationships: number;
    missingDocs: number;
    signedAgreements: number;
    portalUserCount?: number;
    trainingChecklistComplete?: boolean;
    testingChecklistComplete?: boolean;
  }
): boolean {
  if (stage === 'service_selection') return context.activeRelationships === 0;
  if (stage === 'documentation') return context.missingDocs > 0;
  if (stage === 'agreement') return context.signedAgreements === 0;
  if (stage === 'user_setup') return (context.portalUserCount ?? 0) === 0;
  if (stage === 'training') return !context.trainingChecklistComplete;
  if (stage === 'testing') return !context.testingChecklistComplete;
  return false;
}

export function isTrainingChecklistComplete(stageData?: Record<string, unknown>): boolean {
  if (!stageData) return false;
  const enablement = boolLabel(stageData.trainingCompleted) || boolLabel(stageData.portalTraining);
  return enablement && boolLabel(stageData.tenantsUnderstood) && boolLabel(stageData.complianceUnderstood);
}

export function isTestingChecklistComplete(stageData?: Record<string, unknown>): boolean {
  if (!stageData) return false;
  const pilot = boolLabel(stageData.pilotCompleted) || boolLabel(stageData.pilotWithTenant);
  return pilot && boolLabel(stageData.handoffVerified) && boolLabel(stageData.issuesResolved);
}
