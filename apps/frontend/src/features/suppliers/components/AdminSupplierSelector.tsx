import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminSupplierPartners } from '../hooks/useAdminSupplierPartners';

interface Props {
  value: string;
  onValueChange: (supplierId: string) => void;
  className?: string;
}

export function AdminSupplierSelector({ value, onValueChange, className }: Props) {
  const { data: options, isLoading } = useAdminSupplierPartners();

  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={isLoading}>
      <SelectTrigger className={className ?? 'w-full sm:w-[280px]'}>
        <SelectValue placeholder={isLoading ? 'Loading suppliers…' : 'Select supplier partner…'} />
      </SelectTrigger>
      <SelectContent>
        {(options ?? []).map((s) => (
          <SelectItem key={s.supplierId} value={s.supplierId}>
            {s.partnerName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
