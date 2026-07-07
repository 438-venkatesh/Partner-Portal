import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi, Document } from '@/lib/api/documents';
import { useToast } from '@/lib/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormTextarea } from '@/components/ui/form-field';
import { useState } from 'react';
import { Upload, Check, X, FileText, Calendar } from 'lucide-react';
import { DocumentViewerDialog } from '@/components/documents/DocumentViewerDialog';
import { DocumentActions } from '@/components/documents/DocumentActions';
import { downloadFilename, saveBlobAsFile } from '@/lib/documentFile';
import { format } from 'date-fns';
import { DocumentUploadDialog } from './DocumentUploadDialog';

interface DocumentListProps {
  partnerId: string;
  canUpload?: boolean;
  canVerify?: boolean;
}

export function DocumentList({ partnerId, canUpload = true, canVerify = false }: DocumentListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', partnerId],
    queryFn: () => documentApi.getPartnerDocuments(partnerId),
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => documentApi.deleteDocument(documentId),
    onSuccess: () => {
      toast({ title: 'Deleted', description: 'Document removed.' });
      queryClient.invalidateQueries({ queryKey: ['documents', partnerId] });
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Failed to delete document');
      toast({ title: 'Error', description: message, variant: 'destructive' });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({ documentId, verified, notes }: { documentId: string; verified: boolean; notes?: string }) =>
      documentApi.verifyDocument(documentId, { verified, notes }),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Document verification updated',
      });
      queryClient.invalidateQueries({ queryKey: ['documents', partnerId] });
      setVerifyDialogOpen(false);
      setSelectedDocument(null);
      setVerificationNotes('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to verify document',
        variant: 'destructive',
      });
    },
  });

  const handleView = (document: Document) => {
    setViewingDocument(document);
    setViewerOpen(true);
  };

  const handleVerify = (document: Document) => {
    setSelectedDocument(document);
    setVerifyDialogOpen(true);
  };

  const handleVerifySubmit = (verified: boolean) => {
    if (!selectedDocument) return;
    verifyMutation.mutate({
      documentId: selectedDocument.documentId,
      verified,
      notes: verificationNotes || undefined,
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      business_license: 'Business License',
      tax_certificate: 'Tax Certificate',
      insurance: 'Insurance',
      certification: 'Certification',
      contract: 'Contract',
      nda: 'NDA',
      msa: 'MSA',
      other: 'Other',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Partner documents and certifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Partner documents and certifications</CardDescription>
            </div>
            {canUpload && (
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!documents || documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents uploaded yet.</p>
              {canUpload && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setUploadDialogOpen(true)}
                >
                  Upload First Document
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.documentId}>
                    <TableCell className="font-medium">{doc.documentName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getDocumentTypeLabel(doc.documentType)}</Badge>
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
                    <TableCell>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(doc.uploadedAt), 'MMM dd, yyyy')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {doc.expiryDate ? (
                        <div className="flex items-center space-x-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{format(new Date(doc.expiryDate), 'MMM dd, yyyy')}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No expiry</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatFileSize(doc.fileSize)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <DocumentActions
                          document={doc}
                          onView={() => handleView(doc)}
                          onDownload={async () => {
                            try {
                              const blob = await documentApi.fetchDocumentContent(doc.documentId);
                              saveBlobAsFile(
                                blob,
                                downloadFilename(doc.documentName, doc.mimeType, blob.type)
                              );
                            } catch (error: unknown) {
                              const message =
                                error instanceof Error ? error.message : 'Could not download document';
                              toast({ title: 'Error', description: message, variant: 'destructive' });
                            }
                          }}
                          onDelete={async () => {
                            await deleteMutation.mutateAsync(doc.documentId);
                          }}
                        />
                        {canVerify && doc.status === 'pending' && (
                          <Button variant="secondary" size="sm" onClick={() => handleVerify(doc)}>
                            <Check className="h-4 w-4 mr-1" />
                            Verify
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DocumentUploadDialog
        partnerId={partnerId}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />

      {viewingDocument && (
        <DocumentViewerDialog
          open={viewerOpen}
          onOpenChange={(open) => {
            setViewerOpen(open);
            if (!open) setViewingDocument(null);
          }}
          title={viewingDocument.documentName}
          mimeType={viewingDocument.mimeType}
          loadBlob={() => documentApi.fetchDocumentContent(viewingDocument.documentId)}
        />
      )}

      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Document</DialogTitle>
            <DialogDescription>
              {selectedDocument && (
                <>
                  Verify document: <strong>{selectedDocument.documentName}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormTextarea
              label="Verification Notes (Optional)"
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="Add notes about the verification"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVerifyDialogOpen(false);
                setVerificationNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleVerifySubmit(false)}
              disabled={verifyMutation.isPending}
            >
              <X className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              onClick={() => handleVerifySubmit(true)}
              disabled={verifyMutation.isPending}
            >
              <Check className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}










