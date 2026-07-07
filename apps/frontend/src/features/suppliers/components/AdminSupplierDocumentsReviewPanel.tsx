import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi, Document } from '@/lib/api/documents';
import { useBulkSelection } from '@/lib/hooks/useBulkSelection';
import { AdminBulkReviewToolbar } from '@/components/admin/AdminBulkReviewToolbar';
import { RejectNotesDialog } from '@/components/admin/RejectNotesDialog';
import { countMissingApprovedRequiredDocTypes } from '@/lib/onboardingReviewRequirements';
import { useToast } from '@/lib/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DocumentViewerDialog } from '@/components/documents/DocumentViewerDialog';
import { DocumentActions } from '@/components/documents/DocumentActions';
import { StatusBadge } from '@/components/ui/status-badge';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { SUPPLIER_REQUIRED_DOCUMENTS } from '@/features/partner-supplier-onboarding/supplierOnboardingConstants';
import { downloadFilename, saveBlobAsFile } from '@/lib/documentFile';

const DOC_TYPE_LABELS: Record<string, string> = {
  business_license: 'Business license',
  tax_certificate: 'Tax certificate',
  quality_certification: 'Quality certification',
  insurance_certificate: 'Insurance certificate',
  compliance_document: 'Compliance document',
};

interface Props {
  partnerId: string;
  canVerify?: boolean;
  requiredDocuments?: Array<{ type: string; label?: string }>;
}

export function AdminSupplierDocumentsReviewPanel({
  partnerId,
  canVerify = true,
  requiredDocuments = SUPPLIER_REQUIRED_DOCUMENTS,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const { data: documents, isLoading, error } = useQuery({
    queryKey: ['documents', partnerId],
    queryFn: () => documentApi.getPartnerDocuments(partnerId),
    enabled: Boolean(partnerId),
  });

  const docs = useMemo(
    () => (documents ?? []).filter((d) => Boolean(d?.documentId && d?.documentName)),
    [documents]
  );
  const selectable = useMemo(() => docs.map((d) => ({ ...d, id: d.documentId })), [docs]);
  const selection = useBulkSelection(selectable);

  const verifyMutation = useMutation({
    mutationFn: async ({
      documentIds,
      verified,
      notes,
    }: {
      documentIds: string[];
      verified: boolean;
      notes?: string;
    }) => {
      await Promise.all(
        documentIds.map((documentId) =>
          documentApi.verifyDocument(documentId, { verified, notes })
        )
      );
    },
    onSuccess: (_, { documentIds, verified }) => {
      toast({
        title: verified
          ? `Approved ${documentIds.length} document(s)`
          : `Rejected ${documentIds.length} document(s)`,
      });
      selection.clear();
      setRejectOpen(false);
      setRejectNotes('');
      queryClient.invalidateQueries({ queryKey: ['documents', partnerId] });
      queryClient.invalidateQueries({ queryKey: ['partner-supplier-onboarding'] });
      queryClient.invalidateQueries({ queryKey: ['partner-onboarding'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-onboarding'] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast({
        title: 'Update failed',
        description: err?.response?.data?.message,
        variant: 'destructive',
      });
    },
  });

  const uploadedTypes = useMemo(() => new Set(docs.map((d) => d.documentType)), [docs]);
  const approvedTypes = useMemo(
    () => new Set(docs.filter((d) => d.status === 'approved').map((d) => d.documentType)),
    [docs]
  );
  const requiredMet = requiredDocuments.filter((r) => uploadedTypes.has(r.type));
  const missingRequired = requiredDocuments.filter((r) => !uploadedTypes.has(r.type));
  const missingApprovedCount = countMissingApprovedRequiredDocTypes(requiredDocuments, docs);

  if (!partnerId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Partner ID is missing — cannot load documents.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="outline">{docs.length} uploaded</Badge>
        <Badge
          className={
            missingRequired.length === 0
              ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-100'
              : 'bg-amber-100 text-amber-900 hover:bg-amber-100'
          }
        >
          {requiredMet.length} / {requiredDocuments.length} required types uploaded
        </Badge>
        <Badge
          className={
            missingApprovedCount === 0
              ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-100'
              : 'bg-amber-100 text-amber-900 hover:bg-amber-100'
          }
        >
          {requiredDocuments.length - missingApprovedCount} / {requiredDocuments.length} types approved
        </Badge>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {requiredDocuments.map((req) => {
          const uploaded = uploadedTypes.has(req.type);
          const approved = approvedTypes.has(req.type);
          const matches = docs.filter((d) => d.documentType === req.type);
          const label = req.label ?? DOC_TYPE_LABELS[req.type] ?? req.type.replace(/_/g, ' ');
          return (
            <li
              key={req.type}
              className={`flex gap-2 p-2.5 rounded-md border text-sm ${
                approved
                  ? 'border-emerald-200 bg-emerald-50/60'
                  : uploaded
                    ? 'border-amber-200 bg-amber-50/40'
                    : 'border-border bg-muted/20'
              }`}
            >
              {approved ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : uploaded ? (
                <Circle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="font-medium">{label}</p>
                {matches.length > 0 && (
                  <p className="text-xs text-muted-foreground truncate">
                    {matches.map((m) => `${m.documentName} (${m.status})`).join(', ')}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {canVerify && docs.length > 0 && (
        <AdminBulkReviewToolbar
          totalCount={docs.length}
          selectedCount={selection.selectedCount}
          allSelected={selection.allSelected}
          onSelectAllChange={(checked) => (checked ? selection.selectAll() : selection.clear())}
          onApproveSelected={() =>
            verifyMutation.mutate({ documentIds: selection.selectedIds, verified: true })
          }
          onRejectSelected={() => setRejectOpen(true)}
          approvePending={verifyMutation.isPending}
          rejectPending={verifyMutation.isPending}
          approveLabel="Approve selected"
          rejectLabel="Reject selected"
        />
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading documents…
        </p>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>Could not load partner documents. Check admin login and API.</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && docs.length === 0 && (
        <Alert>
          <AlertDescription>
            No documents uploaded yet. The partner must upload files from the partner portal Documents
            page before you can approve this stage.
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && docs.length > 0 && (
        <div className="rounded-md border overflow-x-auto max-h-[280px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {canVerify && <TableHead className="w-10" />}
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc) => (
                <TableRow key={doc.documentId}>
                  {canVerify && (
                    <TableCell>
                      <Checkbox
                        checked={selection.isSelected(doc.documentId)}
                        onCheckedChange={() => selection.toggle(doc.documentId)}
                        aria-label={`Select ${doc.documentName}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium max-w-[140px] truncate" title={doc.documentName}>
                    {doc.documentName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal text-xs">
                      {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={
                        doc.status === 'approved'
                          ? 'active'
                          : doc.status === 'rejected'
                            ? 'suspended'
                            : 'pending'
                      }
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-1 flex-wrap">
                      {canVerify && doc.status !== 'approved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          disabled={verifyMutation.isPending}
                          onClick={() =>
                            verifyMutation.mutate({
                              documentIds: [doc.documentId],
                              verified: true,
                            })
                          }
                        >
                          Approve
                        </Button>
                      )}
                      {canVerify && doc.status !== 'rejected' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive"
                          disabled={verifyMutation.isPending}
                          onClick={() =>
                            verifyMutation.mutate({
                              documentIds: [doc.documentId],
                              verified: false,
                            })
                          }
                        >
                          Reject
                        </Button>
                      )}
                      <DocumentActions
                        document={doc}
                        showDelete={false}
                        onView={() => setViewingDocument(doc)}
                        onDownload={async () => {
                          try {
                            const blob = await documentApi.fetchDocumentContent(doc.documentId);
                            saveBlobAsFile(
                              blob,
                              downloadFilename(doc.documentName, doc.mimeType, blob.type)
                            );
                          } catch (e: unknown) {
                            const msg = e instanceof Error ? e.message : 'Could not download document';
                            toast({ title: 'Download failed', description: msg, variant: 'destructive' });
                          }
                        }}
                        onDelete={async () => {}}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {missingRequired.length > 0 && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2">
          Missing uploads: {missingRequired.map((m) => m.label ?? m.type).join(', ')}.
        </p>
      )}

      {missingApprovedCount > 0 && missingRequired.length === 0 && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2">
          Each required document type needs at least one approved file before you advance the stage.
          Use multi-select to approve only the files that pass review.
        </p>
      )}

      {viewingDocument && (
        <DocumentViewerDialog
          open={!!viewingDocument}
          onOpenChange={(open) => !open && setViewingDocument(null)}
          title={viewingDocument.documentName}
          mimeType={viewingDocument.mimeType}
          loadBlob={() => documentApi.fetchDocumentContent(viewingDocument.documentId)}
        />
      )}

      <RejectNotesDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        itemCount={selection.selectedCount}
        notes={rejectNotes}
        onNotesChange={setRejectNotes}
        pending={verifyMutation.isPending}
        onConfirm={() =>
          verifyMutation.mutate({
            documentIds: selection.selectedIds,
            verified: false,
            notes: rejectNotes.trim() || undefined,
          })
        }
      />
    </div>
  );
}
