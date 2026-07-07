import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi } from '@/lib/api/documents';
import { useToast } from '@/lib/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormField, FormInput, FormTextarea } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X } from 'lucide-react';

const uploadSchema = z.object({
  documentType: z.string().min(1, 'Document type is required'),
  documentName: z.string().min(1, 'Document name is required'),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
});

interface DocumentUploadDialogProps {
  partnerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DocumentUploadDialog({
  partnerId,
  open,
  onOpenChange,
  onSuccess,
}: DocumentUploadDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm({
    defaultValues: {
      documentType: '',
      documentName: '',
      expiryDate: '',
      notes: '',
    },
    onSubmit: async ({ value }) => {
      if (!partnerId) {
        toast({
          title: 'Error',
          description: 'Partner ID is missing. Reload the page and try again.',
          variant: 'destructive',
        });
        return;
      }
      if (!selectedFile) {
        toast({
          title: 'Error',
          description: 'Please select a file to upload',
          variant: 'destructive',
        });
        return;
      }

      await uploadMutation.mutateAsync({
        partnerId,
        documentType: value.documentType,
        documentName: value.documentName || selectedFile.name,
        file: selectedFile,
        expiryDate: value.expiryDate || undefined,
        notes: value.notes || undefined,
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: documentApi.uploadDocument,
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['documents', partnerId] });
      form.reset();
      setSelectedFile(null);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to upload document',
        variant: 'destructive',
      });
    },
  });

  const documentTypes = [
    { value: 'business_license', label: 'Business License' },
    { value: 'tax_certificate', label: 'Tax Certificate' },
    { value: 'insurance', label: 'Insurance Certificate' },
    { value: 'certification', label: 'Certification' },
    { value: 'contract', label: 'Contract' },
    { value: 'nda', label: 'NDA' },
    { value: 'msa', label: 'MSA' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document for this partner. Supported formats: PDF, DOC, DOCX, JPG, PNG
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field
            name="documentType"
          >
            {(field) => (
              <FormField
                label="Document Type"
                required
                error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
              >
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value)}
                >
                  <SelectTrigger className={field.state.meta.errors[0] ? 'border-destructive' : undefined}>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          </form.Field>

          <form.Field
            name="documentName"
          >
            {(field) => (
              <FormInput
                label="Document Name"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                placeholder="Enter document name"
                required
              />
            )}
          </form.Field>

          <div className="space-y-2">
            <Label>File</Label>
            {selectedFile ? (
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center space-x-2">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-md p-6">
                <Label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium">Click to upload</span>
                  <span className="text-xs text-muted-foreground">PDF, DOC, DOCX, JPG, PNG</span>
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      if (!form.state.values.documentName) {
                        form.setFieldValue('documentName', file.name);
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>

          <form.Field name="expiryDate">
            {(field) => (
              <FormInput
                label="Expiry Date (Optional)"
                type="date"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
              />
            )}
          </form.Field>

          <form.Field name="notes">
            {(field) => (
              <FormTextarea
                label="Notes (Optional)"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                placeholder="Add any additional notes"
                rows={3}
              />
            )}
          </form.Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                form.reset();
                setSelectedFile(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploadMutation.isPending || !selectedFile}>
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

