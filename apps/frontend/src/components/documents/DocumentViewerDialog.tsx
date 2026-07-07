import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

export interface DocumentViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  mimeType?: string | null;
  loadBlob: () => Promise<Blob>;
}

function canPreviewInline(
  mimeType?: string | null,
  title?: string
): 'pdf' | 'image' | 'text' | false {
  const m = (mimeType || '').toLowerCase();
  const name = (title || '').toLowerCase();
  if (m === 'application/pdf' || m.endsWith('/pdf') || name.endsWith('.pdf')) return 'pdf';
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('text/')) return 'text';
  return false;
}

export function DocumentViewerDialog({
  open,
  onOpenChange,
  title,
  mimeType,
  loadBlob,
}: DocumentViewerDialogProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadBlobRef = useRef(loadBlob);
  loadBlobRef.current = loadBlob;

  useEffect(() => {
    if (!open) {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadBlobRef
      .current()
      .then((blob) => {
        if (cancelled) return;
        const preview = canPreviewInline(mimeType, title);
        const typedBlob =
          preview === 'pdf' && !blob.type.includes('pdf')
            ? new Blob([blob], { type: 'application/pdf' })
            : blob;
        const url = URL.createObjectURL(typedBlob);
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (err instanceof Error ? err.message : 'Could not load document');
        setError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, mimeType, title]);

  useEffect(() => {
    return () => {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

  const previewKind = canPreviewInline(mimeType, title);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[min(96vw,64rem)] p-0 gap-0 overflow-hidden flex flex-col max-h-[92vh]">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle className="pr-8 truncate">{title}</DialogTitle>
          <DialogDescription className="sr-only">Document preview</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 px-6 pb-6">
          <div className="relative flex h-[min(72vh,640px)] min-h-[320px] items-center justify-center rounded-lg border bg-muted/40 overflow-hidden">
            {loading && (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Loading document…</p>
              </div>
            )}

            {!loading && error && (
              <p className="text-sm text-destructive px-4 text-center">{error}</p>
            )}

            {!loading && !error && blobUrl && previewKind === 'pdf' && (
              <iframe
                src={blobUrl}
                title={title}
                className="absolute inset-0 h-full w-full border-0 bg-white"
              />
            )}

            {!loading && !error && blobUrl && previewKind === 'image' && (
              <img
                src={blobUrl}
                alt={title}
                className="max-h-full max-w-full object-contain p-2"
              />
            )}

            {!loading && !error && blobUrl && previewKind === 'text' && (
              <iframe
                src={blobUrl}
                title={title}
                className="absolute inset-0 h-full w-full border-0 bg-white"
              />
            )}

            {!loading && !error && blobUrl && !previewKind && (
              <p className="text-sm text-muted-foreground px-6 text-center">
                In-browser preview is not available for this file type.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
