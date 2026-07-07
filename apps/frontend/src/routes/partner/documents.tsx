import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { partnerDocumentsApi } from '@/lib/api/partnerDocuments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useToast } from '@/lib/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUp, FileText } from 'lucide-react';
import { DocumentViewerDialog } from '@/components/documents/DocumentViewerDialog';
import { DocumentActions } from '@/components/documents/DocumentActions';
import type { PartnerPortalDocument } from '@/lib/api/partnerDocuments';
import { downloadFilename, saveBlobAsFile } from '@/lib/documentFile';

export const Route = createFileRoute('/partner/documents')({
  component: PartnerDocumentsPage,
});

const DOC_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'contract', label: 'Contract' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'tax', label: 'Tax / W-9' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
  { value: 'business_license', label: 'Business license (supplier)' },
  { value: 'tax_certificate', label: 'Tax certificate (supplier)' },
  { value: 'quality_certification', label: 'Quality certification (supplier)' },
  { value: 'insurance_certificate', label: 'Insurance certificate (supplier)' },
  { value: 'compliance_document', label: 'Compliance document (supplier)' },
] as const;

function PartnerDocumentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [documentType, setDocumentType] = useState<string>('general');
  const [documentName, setDocumentName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<PartnerPortalDocument | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['partner-documents'],
    queryFn: () => partnerDocumentsApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => partnerDocumentsApi.deleteDocument(documentId),
    onSuccess: () => {
      toast({ title: 'Deleted', description: 'Document removed.' });
      queryClient.invalidateQueries({ queryKey: ['partner-documents'] });
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (e instanceof Error ? e.message : 'Could not delete document');
      toast({ title: 'Delete failed', description: msg, variant: 'destructive' });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file || !documentName.trim()) throw new Error('Missing file or name');
      return partnerDocumentsApi.upload({
        documentType: documentType.trim(),
        documentName: documentName.trim(),
        file,
      });
    },
    onSuccess: () => {
      toast({ title: 'Uploaded', description: 'Document submitted for review.' });
      queryClient.invalidateQueries({ queryKey: ['partner-documents'] });
      setDocumentName('');
      setFile(null);
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Could not upload';
      toast({
        title: 'Upload failed',
        description: msg,
        variant: 'destructive',
      });
    },
  });

  const rows = data?.documents ?? [];

  const handleView = (doc: PartnerPortalDocument) => {
    setViewingDocument(doc);
    setViewerOpen(true);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Documents</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Upload contracts, compliance artifacts, and supporting files. Use View to preview documents inside the
          portal.
        </p>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FileUp className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Upload</CardTitle>
              <CardDescription>Files are scoped to your partner organization automatically.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <span className="text-sm font-medium">Document type</span>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FormInput
            label="Display name"
            required
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            placeholder="e.g. 2025 insurance certificate"
          />
          <div className="space-y-2">
            <span className="text-sm font-medium">File</span>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && (
              <p className="text-xs text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
          <Button
            type="button"
            disabled={uploadMutation.isPending || !file || !documentName.trim()}
            onClick={() => uploadMutation.mutate()}
          >
            {uploadMutation.isPending ? 'Uploading…' : 'Upload document'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Your documents</CardTitle>
          </div>
          <CardDescription>Recent uploads and review status.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && <p className="text-sm text-destructive">Could not load documents.</p>}
          {!isLoading && !error && rows.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 py-14 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="font-medium text-gray-800">No uploads yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Add your first document using the form above.
              </p>
            </div>
          )}
          {!isLoading && !error && rows.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((d) => (
                    <TableRow key={d.documentId}>
                      <TableCell className="font-medium">{d.documentName}</TableCell>
                      <TableCell>{d.documentType}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{d.status ?? '—'}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DocumentActions
                          document={d}
                          onView={() => handleView(d)}
                          onDownload={async () => {
                            try {
                              const blob = await partnerDocumentsApi.fetchDocumentContent(d.documentId);
                              saveBlobAsFile(
                                blob,
                                downloadFilename(d.documentName, d.mimeType, blob.type)
                              );
                            } catch (e: unknown) {
                              const msg = e instanceof Error ? e.message : 'Could not download document';
                              toast({ title: 'Download failed', description: msg, variant: 'destructive' });
                            }
                          }}
                          onDelete={async () => {
                            await deleteMutation.mutateAsync(d.documentId);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {viewingDocument && (
        <DocumentViewerDialog
          open={viewerOpen}
          onOpenChange={(open) => {
            setViewerOpen(open);
            if (!open) setViewingDocument(null);
          }}
          title={viewingDocument.documentName}
          mimeType={viewingDocument.mimeType}
          loadBlob={() => partnerDocumentsApi.fetchDocumentContent(viewingDocument.documentId)}
        />
      )}
    </div>
  );
}
