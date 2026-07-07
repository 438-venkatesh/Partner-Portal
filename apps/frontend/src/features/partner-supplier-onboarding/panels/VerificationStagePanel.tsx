import { useQuery } from '@tanstack/react-query';
import { partnerDocumentsApi } from '@/lib/api/partnerDocuments';
import { partnerSupplierCatalogApi } from '@/lib/api/partnerSupplierCatalog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Package, FileText, Clock, CheckCircle2 } from 'lucide-react';
import { SUPPLIER_REQUIRED_DOCUMENTS, type StageAccess } from '../supplierOnboardingConstants';
import {
  getPriorStageStatusLabel,
  getStageReviewerNote,
  type StageStatusLabelVariant,
} from '../partnerStageFeedback';
import { cn } from '@/lib/utils';

interface WorkflowShape {
  currentStage: string;
  completedStages: string[];
  stages?: Record<
    string,
    {
      status?: string;
      submittedForReview?: boolean;
      notes?: string;
      stageData?: Record<string, unknown>;
    }
  >;
}

interface Props {
  workflow: WorkflowShape;
  stageData?: Record<string, unknown>;
  notes?: string;
  completed?: boolean;
  access?: StageAccess;
}

function statusBadgeClass(variant: StageStatusLabelVariant): string {
  switch (variant) {
    case 'approved':
      return 'border-emerald-300 bg-emerald-50 text-emerald-800';
    case 'awaiting':
      return 'border-blue-300 bg-blue-50 text-blue-800';
    case 'blocked':
      return 'border-red-300 bg-red-50 text-red-800';
    case 'in_progress':
      return 'border-amber-300 bg-amber-50 text-amber-900';
    default:
      return '';
  }
}

export function VerificationStagePanel({ workflow, stageData, notes, completed, access }: Props) {
  const { data: docsData } = useQuery({
    queryKey: ['partner-documents'],
    queryFn: () => partnerDocumentsApi.list(),
  });
  const { data: productsData } = useQuery({
    queryKey: ['partner-supplier-products'],
    queryFn: () => partnerSupplierCatalogApi.getProducts({ limit: 100 }),
  });

  const docs = docsData?.documents ?? [];
  const productCount = productsData?.products?.length ?? 0;
  const docTypesUploaded = SUPPLIER_REQUIRED_DOCUMENTS.filter((r) =>
    docs.some((d) => d.documentType === r.type)
  ).length;

  const registrationStatus = getPriorStageStatusLabel('supplier_registration', workflow);
  const catalogStatus = getPriorStageStatusLabel('catalog_setup', workflow);
  const documentationStatus = getPriorStageStatusLabel('supplier_documentation', workflow);
  const verificationStatus = getPriorStageStatusLabel('supplier_verification', workflow);

  const catalogNote = getStageReviewerNote('catalog_setup', workflow);
  const documentationNote = getStageReviewerNote('supplier_documentation', workflow);
  const verificationNote = notes?.trim() || getStageReviewerNote('supplier_verification', workflow);

  const checklist: {
    icon: typeof FileText;
    label: string;
    status: { label: string; variant: StageStatusLabelVariant };
    reviewerNote?: string;
  }[] = [
    {
      icon: FileText,
      label: 'Company & registration',
      status: registrationStatus,
      reviewerNote: getStageReviewerNote('supplier_registration', workflow),
    },
    {
      icon: Package,
      label: `Product catalog (${productCount} products)`,
      status:
        productCount < 5 && catalogStatus.variant !== 'approved'
          ? { label: 'Incomplete', variant: 'pending' as const }
          : catalogStatus,
      reviewerNote: catalogNote,
    },
    {
      icon: ShieldCheck,
      label: `Compliance documents (${docTypesUploaded}/${SUPPLIER_REQUIRED_DOCUMENTS.length} types)`,
      status:
        docTypesUploaded < SUPPLIER_REQUIRED_DOCUMENTS.length &&
        documentationStatus.variant !== 'approved'
          ? { label: `${docTypesUploaded}/${SUPPLIER_REQUIRED_DOCUMENTS.length} uploaded`, variant: 'pending' }
          : documentationStatus,
      reviewerNote: documentationNote,
    },
    {
      icon: Clock,
      label: 'Platform verification',
      status: completed
        ? { label: 'Approved', variant: 'approved' }
        : verificationStatus.variant === 'awaiting'
          ? verificationStatus
          : { label: 'In progress', variant: 'in_progress' },
      reviewerNote: verificationNote,
    },
  ];

  const priorStepsApproved =
    workflow.completedStages.includes('supplier_registration') &&
    workflow.completedStages.includes('catalog_setup') &&
    workflow.completedStages.includes('supplier_documentation');

  if (completed) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-900">
            <ShieldCheck className="h-5 w-5" />
            Verification complete
          </CardTitle>
          <CardDescription className="text-emerald-800/90">
            Operations approved this step. Continue to the supplier agreement when ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChecklistItems items={checklist} />
          {verificationNote && (
            <p className="text-sm text-emerald-900 border-t pt-4">
              <span className="font-medium">Note from reviewer: </span>
              {verificationNote}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-amber-100 bg-amber-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-700" />
            Platform verification in progress
          </CardTitle>
          <CardDescription>
            {priorStepsApproved
              ? 'Registration, catalog, and documents are approved. Our team is completing final platform verification — no action needed unless we send feedback below.'
              : access === 'readonly'
                ? 'Our team is reviewing your onboarding package. Check each item below for status and any feedback from operations.'
                : 'Our operations team is reviewing your registration, catalog, and documents.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stageData?.submittedAt && (
            <p className="text-sm text-muted-foreground">
              Last documentation submission:{' '}
              {new Date(String(stageData.submittedAt)).toLocaleString()}
            </p>
          )}
          <ChecklistItems items={checklist} />
        </CardContent>
      </Card>
    </div>
  );
}

function ChecklistItems({
  items,
}: {
  items: {
    icon: typeof FileText;
    label: string;
    status: { label: string; variant: StageStatusLabelVariant };
    reviewerNote?: string;
  }[];
}) {
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const Icon = item.icon;
        const approved = item.status.variant === 'approved';
        return (
          <li key={item.label} className="rounded-md border bg-white overflow-hidden">
            <div className="flex items-center gap-3 p-3">
              {approved ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              ) : (
                <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <span className="flex-1 font-medium text-sm">{item.label}</span>
              <Badge variant="outline" className={cn('font-normal', statusBadgeClass(item.status.variant))}>
                {item.status.label}
              </Badge>
            </div>
            {item.reviewerNote && (
              <p className="text-xs text-muted-foreground px-3 pb-3 pt-0 border-t bg-muted/30">
                <span className="font-medium text-foreground">Reviewer: </span>
                {item.reviewerNote}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
