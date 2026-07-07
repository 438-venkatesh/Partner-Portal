import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormTextarea } from '@/components/ui/form-field';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemCount: number;
  notes: string;
  onNotesChange: (value: string) => void;
  onConfirm: () => void;
  pending?: boolean;
}

export function RejectNotesDialog({
  open,
  onOpenChange,
  itemCount,
  notes,
  onNotesChange,
  onConfirm,
  pending,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject {itemCount} item{itemCount === 1 ? '' : 's'}</DialogTitle>
          <DialogDescription>
            Optional notes are saved on each rejected item for the partner to see.
          </DialogDescription>
        </DialogHeader>
        <FormTextarea
          label="Rejection notes (optional)"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          placeholder="Explain what needs to be corrected…"
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Rejecting…
              </>
            ) : (
              'Confirm reject'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
