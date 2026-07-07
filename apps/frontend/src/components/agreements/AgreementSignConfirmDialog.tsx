import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-field';
import { Loader2, PenLine } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agreementTitle: string;
  agreementNumber?: string;
  onConfirm: (fullName: string) => void;
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
  const [fullName, setFullName] = useState('');

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
                Typing your full name below and clicking "Sign agreement" records your acceptance —
                including the date, time, and IP address — in the partner portal. Operations may
                countersign before the onboarding step is marked complete.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <FormInput
          label="Type your full legal name to sign"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Doe"
          autoFocus
        />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(fullName)} disabled={isPending || fullName.trim().length < 2}>
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
