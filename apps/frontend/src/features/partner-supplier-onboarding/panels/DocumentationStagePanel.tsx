import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { partnerDocumentsApi } from '@/lib/api/partnerDocuments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileUp, CheckCircle2, Circle } from 'lucide-react';
import { SUPPLIER_REQUIRED_DOCUMENTS } from '../supplierOnboardingConstants';
import {
  DOCUMENT_TYPE_STATUS_LABELS,
  countRequiredTypesAllRejected,
  getDocumentTypeReviewStatus,
} from '@/lib/onboardingReviewRequirements';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  editable: boolean;
  submitted: boolean;
  completed?: boolean;
  adminMessage?: string;
  onSubmit: () => void;
  submitting: boolean;
}

export function DocumentationStagePanel({
  editable,
  submitted,
  completed = false,
  adminMessage,
  onSubmit,
  submitting,
}: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['partner-documents'],
    queryFn: () => partnerDocumentsApi.list(),
  });

  const docs = data?.documents ?? [];
  const uploadedTypes = new Set(docs.map((d) => d.documentType));
  const approvedTypes = new Set(
    docs.filter((d) => d.status === 'approved').map((d) => d.documentType)
  );
  const completedCount = SUPPLIER_REQUIRED_DOCUMENTS.filter((r) => uploadedTypes.has(r.type)).length;
  const approvedCount = SUPPLIER_REQUIRED_DOCUMENTS.filter((r) => approvedTypes.has(r.type)).length;
  const allRejectedTypes = countRequiredTypesAllRejected(SUPPLIER_REQUIRED_DOCUMENTS, docs);
  const allDone = completedCount === SUPPLIER_REQUIRED_DOCUMENTS.length;
  const progress = Math.round((completedCount / SUPPLIER_REQUIRED_DOCUMENTS.length) * 100);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Required documents
          </CardTitle>
          <CardDescription>
            Upload one file for each document type. Use the documents page and select the matching type when
            uploading.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {allRejectedTypes > 0 && !completed && (
            <Alert variant="destructive">
              <AlertDescription>
                {allRejectedTypes === SUPPLIER_REQUIRED_DOCUMENTS.length
                  ? 'All required document types were rejected by operations. Re-upload new files for each type from the documents page.'
                  : `${allRejectedTypes} document type(s) were fully rejected. Re-upload for those types; operations must approve at least one file per required type before this step can complete.`}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                {completedCount} of {SUPPLIER_REQUIRED_DOCUMENTS.length} document types uploaded
              </span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="space-y-3">
              {SUPPLIER_REQUIRED_DOCUMENTS.map((req) => {
                const reviewStatus = getDocumentTypeReviewStatus(req.type, docs);
                const done = reviewStatus !== 'missing';
                const matches = docs.filter((d) => d.documentType === req.type);
                const approved = reviewStatus === 'approved';
                return (
                  <li
                    key={req.type}
                    className={`flex gap-3 p-4 rounded-lg border ${
                      approved
                        ? 'border-green-200 bg-green-50/50'
                        : reviewStatus === 'all_rejected'
                          ? 'border-red-200 bg-red-50/40'
                          : done
                            ? 'border-amber-200 bg-amber-50/40'
                            : 'border-border'
                    }`}
                  >
                    {approved ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{req.label}</p>
                      <p className="text-sm text-muted-foreground">{req.description}</p>
                      {matches.length > 0 && (
                        <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                          {matches.map((m) => (
                            <li key={m.documentId}>
                              • {m.documentName}
                              {m.status ? ` (${m.status.replace(/_/g, ' ')})` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <Badge
                      variant={
                        approved ? 'default' : reviewStatus === 'all_rejected' ? 'destructive' : 'outline'
                      }
                      className="shrink-0 h-fit capitalize"
                    >
                      {DOCUMENT_TYPE_STATUS_LABELS[reviewStatus]}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}

          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link to="/partner/documents">Go to documents — upload files</Link>
          </Button>

          {editable && !submitted && (
            <Button
              className="w-full sm:w-auto"
              disabled={!allDone || submitting}
              onClick={() => onSubmit()}
            >
              {submitting ? 'Submitting…' : 'Submit documents for review'}
            </Button>
          )}

          {completed && (
            <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md p-3">
              <span className="font-medium">Approved by operations.</span>
              {adminMessage ? ` ${adminMessage}` : ' Continue to verification & review.'}
            </p>
          )}

          {submitted && !completed && (
            <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-md p-3">
              Documents submitted for review ({approvedCount} of {SUPPLIER_REQUIRED_DOCUMENTS.length}{' '}
              types approved so far). Operations must approve each required type before this stage is
              marked complete. Re-upload any rejected files from the documents page.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
