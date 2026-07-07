import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/lib/api/products';
import { documentApi, Document } from '@/lib/api/documents';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DocumentViewerDialog } from '@/components/documents/DocumentViewerDialog';
import { CheckCircle2, Package, FileText, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getPriorStageStatusLabel,
  getStageReviewerNote,
  type StageStatusLabelVariant,
} from '@/features/partner-supplier-onboarding/partnerStageFeedback';
import { cn } from '@/lib/utils';

interface WorkflowShape {
  currentStage: string;
  completedStages: string[];
  stages?: Record<string, { status?: string; notes?: string; stageData?: Record<string, unknown> }>;
}

interface Props {
  supplierId: string;
  partnerId: string;
  workflow: WorkflowShape;
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

const PRIOR_STEPS: { stage: string; label: string; icon: typeof FileText }[] = [
  { stage: 'supplier_registration', label: 'Company & registration', icon: Building2 },
  { stage: 'catalog_setup', label: 'Product catalog', icon: Package },
  { stage: 'supplier_documentation', label: 'Compliance documents', icon: FileText },
];

export function AdminSupplierVerificationReviewPanel({
  supplierId,
  partnerId,
  workflow,
}: Props) {
  const [showDocReference, setShowDocReference] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);

  const { data: productsData } = useQuery({
    queryKey: ['products', supplierId, 'verification-review'],
    queryFn: () => productApi.getSupplierProducts(supplierId, { limit: 200 }),
    enabled: Boolean(supplierId),
  });

  const { data: documents } = useQuery({
    queryKey: ['documents', partnerId],
    queryFn: () => documentApi.getPartnerDocuments(partnerId),
    enabled: Boolean(partnerId),
  });

  const productCount = productsData?.products?.length ?? 0;
  const activeCount = productsData?.products?.filter((p) => p.status === 'active').length ?? 0;
  const docs = documents ?? [];

  const priorReady = PRIOR_STEPS.every(
    (s) =>
      workflow.completedStages.includes(s.stage) ||
      workflow.stages?.[s.stage]?.status === 'completed'
  );

  return (
    <div className="space-y-4">
      <Alert className="border-amber-200 bg-amber-50/80">
        <AlertDescription className="text-amber-950 text-sm">
          <span className="font-medium">Platform verification</span> confirms registration, catalog, and
          documents are acceptable as a package. Document types were already approved in the{' '}
          <strong>Document upload</strong> step — you are not re-running that review here.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <p className="text-sm font-medium">Onboarding package summary</p>
        <ul className="space-y-2">
          {PRIOR_STEPS.map(({ stage, label, icon: Icon }) => {
            const status = getPriorStageStatusLabel(stage, workflow);
            const note = getStageReviewerNote(stage, workflow);
            const detail =
              stage === 'catalog_setup'
                ? `${productCount} products (${activeCount} active)`
                : stage === 'supplier_documentation'
                  ? `${docs.length} file(s) on file`
                  : undefined;
            return (
              <li
                key={stage}
                className={cn(
                  'rounded-md border p-3 text-sm',
                  status.variant === 'approved' ? 'border-emerald-200 bg-emerald-50/50' : 'bg-muted/20'
                )}
              >
                <div className="flex items-start gap-2">
                  {status.variant === 'approved' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{label}</span>
                      {detail && (
                        <span className="text-xs text-muted-foreground">({detail})</span>
                      )}
                      <Badge
                        variant="outline"
                        className={cn('font-normal text-xs', statusBadgeClass(status.variant))}
                      >
                        {status.label}
                      </Badge>
                    </div>
                    {note && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium text-foreground">Prior note: </span>
                        {note}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {!priorReady && (
        <Alert variant="destructive">
          <AlertDescription>
            One or more prior steps are not completed. Consider rejecting verification or completing
            earlier stages first.
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <button
          type="button"
          className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-muted/40"
          onClick={() => setShowDocReference((v) => !v)}
        >
          <span>Reference — view uploaded files (read-only)</span>
          {showDocReference ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {showDocReference && (
          <div className="border-t px-3 pb-3">
            {docs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No documents loaded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((doc) => (
                    <TableRow key={doc.documentId}>
                      <TableCell className="text-sm max-w-[160px] truncate">{doc.documentName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {doc.documentType.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => setViewingDocument(doc)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </div>

      {viewingDocument && (
        <DocumentViewerDialog
          open={!!viewingDocument}
          onOpenChange={(open) => !open && setViewingDocument(null)}
          title={viewingDocument.documentName}
          mimeType={viewingDocument.mimeType}
          loadBlob={() => documentApi.fetchDocumentContent(viewingDocument.documentId)}
        />
      )}
    </div>
  );
}
