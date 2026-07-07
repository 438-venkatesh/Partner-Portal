import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import type { Product } from '@/lib/api/products';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DataTable } from '@/components/ui/data-table';
import { Package, Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SUPPLIER_MIN_CATALOG_PRODUCTS } from './supplierOnboardingConstants';
import { PartnerCreateProductDialog } from './PartnerCreateProductDialog';
import { PartnerEditProductDialog } from './PartnerEditProductDialog';

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCategory(category: string) {
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildColumns(
  showActions: boolean,
  onEdit: (p: Product) => void,
  onDelete: (id: string) => void
): ColumnDef<Product>[] {
  const cols: ColumnDef<Product>[] = [
    {
      accessorKey: 'productCode',
      header: 'SKU',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.productCode}</span>
      ),
    },
    {
      accessorKey: 'productName',
      header: 'Product',
      cell: ({ row }) => <span className="font-medium">{row.original.productName}</span>,
    },
    {
      accessorKey: 'productCategory',
      header: 'Category',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatCategory(String(row.original.productCategory))}
        </span>
      ),
    },
    {
      accessorKey: 'unitPrice',
      header: 'Price',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {row.original.currency} {Number(row.original.unitPrice).toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-normal">
          {formatStatus(row.original.status)}
        </Badge>
      ),
    },
  ];

  if (showActions) {
    cols.push({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(row.original)}
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(row.original.productId)}
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    });
  }

  return cols;
}

interface Props {
  products: Product[];
  isLoading: boolean;
  submitted: boolean;
  editable: boolean;
  variant?: 'stage' | 'full';
  onRefresh: () => void;
  onDelete?: (productId: string) => void;
  onSubmit?: () => void;
  submitPending?: boolean;
  extraActions?: React.ReactNode;
}

export function SupplierCatalogSection({
  products,
  isLoading,
  submitted,
  editable,
  variant = 'stage',
  onRefresh,
  onDelete,
  onSubmit,
  submitPending,
  extraActions,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);

  const count = products.length;
  const progress = Math.min(100, Math.round((count / SUPPLIER_MIN_CATALOG_PRODUCTS) * 100));
  const canSubmit = count >= SUPPLIER_MIN_CATALOG_PRODUCTS;
  const remaining = Math.max(0, SUPPLIER_MIN_CATALOG_PRODUCTS - count);

  const columns = buildColumns(
    variant === 'full' && editable && !!onDelete,
    (p) => {
      setSelected(p);
      setEditOpen(true);
    },
    (id) => onDelete?.(id)
  );

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="pb-4 bg-gradient-to-r from-slate-50/90 to-white border-b">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">
                  {variant === 'full' ? 'Product catalog' : 'Your products'}
                </CardTitle>
                <CardDescription className="mt-1">
                  Minimum {SUPPLIER_MIN_CATALOG_PRODUCTS} products required before submission.
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {extraActions}
              {editable && !submitted && (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add product
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-5">
          <div className="rounded-lg border bg-muted/25 p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">
                {count} / {SUPPLIER_MIN_CATALOG_PRODUCTS} products
              </span>
              <span
                className={cn(
                  'text-xs font-medium px-2.5 py-0.5 rounded-full',
                  submitted && 'bg-blue-100 text-blue-800',
                  !submitted && canSubmit && 'bg-emerald-100 text-emerald-800',
                  !submitted && !canSubmit && 'bg-amber-100 text-amber-800'
                )}
              >
                {submitted ? 'Submitted' : canSubmit ? 'Ready' : `${remaining} to go`}
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Loading…</p>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center py-14 px-4 rounded-lg border border-dashed bg-muted/15">
              <Package className="h-10 w-10 text-muted-foreground/35 mb-3" />
              <p className="font-medium">No products yet</p>
              <p className="text-sm text-muted-foreground mt-1 text-center max-w-xs">
                Add your first product to continue catalog setup.
              </p>
              {editable && (
                <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add product
                </Button>
              )}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={products}
              searchable={products.length > 4}
              searchPlaceholder="Search by name or SKU…"
            />
          )}
        </CardContent>

        {(onSubmit || submitted) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-t bg-muted/15">
            <p className="text-sm text-muted-foreground">
              {submitted
                ? 'Catalog is with operations for review.'
                : canSubmit
                  ? 'You can submit when ready.'
                  : `Add ${remaining} more product${remaining === 1 ? '' : 's'} to submit.`}
            </p>
            {onSubmit && editable && !submitted && (
              <Button disabled={!canSubmit || submitPending} onClick={() => onSubmit()} className="shrink-0">
                {submitPending ? 'Submitting…' : 'Submit for review'}
              </Button>
            )}
          </div>
        )}
      </Card>

      <PartnerCreateProductDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => {
          onRefresh();
          setCreateOpen(false);
        }}
      />
      {selected && (
        <PartnerEditProductDialog
          product={selected}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSuccess={() => {
            onRefresh();
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}
