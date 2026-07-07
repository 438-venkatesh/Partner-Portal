import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi, Product } from '@/lib/api/products';
import { useBulkSelection } from '@/lib/hooks/useBulkSelection';
import { AdminBulkReviewToolbar } from '@/components/admin/AdminBulkReviewToolbar';
import { RejectNotesDialog } from '@/components/admin/RejectNotesDialog';
import { useToast } from '@/lib/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';

interface Props {
  supplierId: string;
  products: Product[];
  onViewProduct?: (product: Product) => void;
}

export function AdminCatalogProductsReviewPanel({ supplierId, products, onViewProduct }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const selectable = useMemo(
    () => products.map((p) => ({ ...p, id: p.productId })),
    [products]
  );
  const selection = useBulkSelection(selectable);

  const pendingCount = products.filter((p) => p.status === 'pending_approval').length;
  const activeCount = products.filter((p) => p.status === 'active').length;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['products', supplierId] });
    queryClient.invalidateQueries({ queryKey: ['admin-supplier-products', supplierId] });
  };

  const approveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => productApi.updateProduct(id, { status: 'active' })));
    },
    onSuccess: (_, ids) => {
      toast({ title: `Approved ${ids.length} product(s)` });
      selection.clear();
      invalidate();
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast({
        title: 'Approve failed',
        description: err?.response?.data?.message,
        variant: 'destructive',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ ids, notes }: { ids: string[]; notes?: string }) => {
      await Promise.all(
        ids.map((id) =>
          productApi.updateProduct(id, {
            status: 'inactive',
            metadata: notes ? { rejectionNotes: notes } : undefined,
          })
        )
      );
    },
    onSuccess: (_, { ids }) => {
      toast({ title: `Rejected ${ids.length} product(s)` });
      selection.clear();
      setRejectOpen(false);
      setRejectNotes('');
      invalidate();
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast({
        title: 'Reject failed',
        description: err?.response?.data?.message,
        variant: 'destructive',
      });
    },
  });

  const selectedProducts = selectable.filter((p) => selection.isSelected(p.id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="outline">{products.length} total</Badge>
        <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
          {pendingCount} pending
        </Badge>
        <Badge variant="secondary">{activeCount} active</Badge>
      </div>

      <AdminBulkReviewToolbar
        totalCount={products.length}
        selectedCount={selection.selectedCount}
        allSelected={selection.allSelected}
        onSelectAllChange={(checked) => (checked ? selection.selectAll() : selection.clear())}
        onApproveSelected={() => approveMutation.mutate(selection.selectedIds)}
        onRejectSelected={() => setRejectOpen(true)}
        approvePending={approveMutation.isPending}
        rejectPending={rejectMutation.isPending}
        approveLabel="Approve selected products"
        rejectLabel="Reject selected products"
      />

      <div className="rounded-md border overflow-x-auto max-h-[280px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.productId}>
                <TableCell>
                  <Checkbox
                    checked={selection.isSelected(p.productId)}
                    onCheckedChange={() => selection.toggle(p.productId)}
                    aria-label={`Select ${p.productName}`}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">{p.productCode}</TableCell>
                <TableCell className="max-w-[160px] truncate">{p.productName}</TableCell>
                <TableCell>
                  <StatusBadge
                    status={
                      p.status === 'active'
                        ? 'active'
                        : p.status === 'pending_approval'
                          ? 'pending'
                          : 'suspended'
                    }
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 flex-wrap">
                    {p.status !== 'active' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate([p.productId])}
                      >
                        Approve
                      </Button>
                    )}
                    {p.status !== 'inactive' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive"
                        disabled={rejectMutation.isPending}
                        onClick={() => rejectMutation.mutate({ ids: [p.productId] })}
                      >
                        Reject
                      </Button>
                    )}
                    {onViewProduct && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => onViewProduct(p)}
                      >
                        View
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Approve or reject individual products, then use <strong>Approve &amp; advance</strong>{' '}
        below when the catalog is ready. At least 5 products are required to complete this stage.
      </p>

      <RejectNotesDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        itemCount={selectedProducts.length}
        notes={rejectNotes}
        onNotesChange={setRejectNotes}
        pending={rejectMutation.isPending}
        onConfirm={() =>
          rejectMutation.mutate({ ids: selection.selectedIds, notes: rejectNotes.trim() || undefined })
        }
      />
    </div>
  );
}
