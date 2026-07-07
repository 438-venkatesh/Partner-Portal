import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface Props {
  totalCount: number;
  selectedCount: number;
  allSelected: boolean;
  onSelectAllChange: (checked: boolean) => void;
  onApproveSelected: () => void;
  onRejectSelected: () => void;
  approvePending?: boolean;
  rejectPending?: boolean;
  disabled?: boolean;
  approveLabel?: string;
  rejectLabel?: string;
}

export function AdminBulkReviewToolbar({
  totalCount,
  selectedCount,
  allSelected,
  onSelectAllChange,
  onApproveSelected,
  onRejectSelected,
  approvePending,
  rejectPending,
  disabled,
  approveLabel = 'Approve selected',
  rejectLabel = 'Reject selected',
}: Props) {
  if (totalCount === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-2">
        <Checkbox
          id="select-all-review"
          checked={allSelected}
          onCheckedChange={(v) => onSelectAllChange(v === true)}
          disabled={disabled}
        />
        <Label htmlFor="select-all-review" className="text-sm font-normal cursor-pointer">
          Select all ({selectedCount} of {totalCount} selected)
        </Label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || selectedCount === 0 || rejectPending || approvePending}
          onClick={onRejectSelected}
        >
          {rejectPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          {rejectLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={disabled || selectedCount === 0 || approvePending || rejectPending}
          onClick={onApproveSelected}
        >
          {approvePending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          {approveLabel}
        </Button>
      </div>
    </div>
  );
}
