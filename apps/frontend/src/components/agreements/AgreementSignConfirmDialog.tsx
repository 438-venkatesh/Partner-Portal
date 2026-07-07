import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, PenLine } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agreementTitle: string;
  agreementNumber?: string;
  onConfirm: () => void;
  isPending?: boolean;
}

export function AgreementSignConfirmDialog({
  open,
  onOpenChange,
  agreementTitle,
  agreementNumber,
  onConfirm,
  isPending = false,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign agreement</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground pt-1">
              <p>
                You are about to sign <strong className="text-foreground">{agreementTitle}</strong>
                {agreementNumber ? (
                  <>
                    {' '}
                    (<span className="font-mono text-xs">{agreementNumber}</span>)
                  </>
                ) : null}
                .
              </p>
              <p>
                This records your acceptance in the partner portal. Operations may countersign before the
                onboarding step is marked complete.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing…
              </>
            ) : (
              <>
                <PenLine className="h-4 w-4 mr-2" />
                Sign agreement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
