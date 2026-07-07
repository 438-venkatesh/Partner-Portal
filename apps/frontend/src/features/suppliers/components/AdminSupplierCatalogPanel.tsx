import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ColumnDef } from '@tanstack/react-table';
import { productApi, Product } from '@/lib/api/products';
import { onboardingApi, SupplierOnboardingStage } from '@/lib/api/onboarding';
import { useToast } from '@/lib/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { AdminSupplierSelector } from './AdminSupplierSelector';
import { ProductDetailDialog } from './ProductDetailDialog';
import { useAdminSupplierPartners, findSupplierPartner } from '../hooks/useAdminSupplierPartners';
import {
  CheckCircle2,
  Eye,
  ExternalLink,
  Package,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onCompleteStageReview: (target: {
    supplierId: string;
    partnerId: string;
    stage: SupplierOnboardingStage;
  }) => void;
}

export function AdminSupplierCatalogPanel({ onCompleteStageReview }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  const { data: supplierPartners, isLoading: loadingPartners } = useAdminSupplierPartners();
  const selectedPartner = findSupplierPartner(supplierPartners, selectedSupplierId || null);

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['admin-supplier-products', selectedSupplierId, statusFilter],
    queryFn: () =>
      productApi.getSupplierProducts(selectedSupplierId, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 200,
      }),
    enabled: Boolean(selectedSupplierId),
  });

  const { data: workflowData } = useQuery({
    queryKey: ['supplier-onboarding', selectedSupplierId],
    queryFn: () => onboardingApi.getSupplierWorkflow(selectedSupplierId),
    enabled: Boolean(selectedSupplierId),
  });

  const approveProductMutation = useMutation({
    mutationFn: (productId: string) => productApi.updateProduct(productId, { status: 'active' }),
    onSuccess: () => {
      toast({ title: 'Product approved' });
      queryClient.invalidateQueries({ queryKey: ['admin-supplier-products', selectedSupplierId] });
      setViewProduct(null);
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast({
        title: 'Approval failed',
        description: err?.response?.data?.message,
        variant: 'destructive',
      });
    },
  });

  const approveAllMutation = useMutation({
    mutationFn: () => onboardingApi.approveAllCatalogProducts(selectedSupplierId),
    onSuccess: (res) => {
      toast({ title: `Approved ${res.approved} product(s)` });
      queryClient.invalidateQueries({ queryKey: ['admin-supplier-products', selectedSupplierId] });
      queryClient.invalidateQueries({ queryKey: ['supplier-onboarding', selectedSupplierId] });
      queryClient.invalidateQueries({ queryKey: ['supplier-review-queue'] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast({
        title: 'Bulk approve failed',
        description: err?.response?.data?.message,
        variant: 'destructive',
      });
    },
  });

  const products = productsData?.products ?? [];
  const pendingCount = products.filter((p) => p.status === 'pending_approval').length;
  const activeCount = products.filter((p) => p.status === 'active').length;
  const catalogSubmitted = (
    workflowData?.stages?.catalog_setup as { submittedForReview?: boolean } | undefined
  )?.submittedForReview;

  const currentOnboardingStage = workflowData?.currentStage as SupplierOnboardingStage | undefined;
  const opsReviewStages: SupplierOnboardingStage[] = [
    'supplier_verification',
    'payment_setup',
    'supplier_activation',
  ];
  const needsOpsReview =
    Boolean(currentOnboardingStage) &&
    opsReviewStages.includes(currentOnboardingStage!) &&
    !workflowData?.completedStages?.includes(currentOnboardingStage!);

  const OPS_STAGE_LABELS: Record<string, string> = {
    supplier_verification: 'Platform verification',
    payment_setup: 'Payment setup',
    supplier_activation: 'Supplier activation',
  };

  const handleApprove = useCallback(
    (productId: string) => approveProductMutation.mutate(productId),
    [approveProductMutation]
  );

  const columns: ColumnDef<Product>[] = useMemo(
    () => [
      {
        accessorKey: 'productCode',
        header: 'SKU',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-foreground">{row.original.productCode}</span>
        ),
      },
      {
        accessorKey: 'productName',
        header: 'Product',
        cell: ({ row }) => (
          <button
            type="button"
            className="text-left font-medium text-foreground hover:text-primary hover:underline"
            onClick={() => setViewProduct(row.original)}
          >
            {row.original.productName}
          </button>
        ),
      },
      {
        accessorKey: 'productCategory',
        header: 'Category',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground capitalize">
            {String(row.original.productCategory).replace(/_/g, ' ')}
          </span>
        ),
      },
      {
        accessorKey: 'unitPrice',
        header: 'Price',
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {row.original.currency}{' '}
            {Number(row.original.unitPrice).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge
            status={
              row.original.status === 'active'
                ? 'active'
                : row.original.status === 'pending_approval'
                  ? 'pending'
                  : 'suspended'
            }
          />
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex justify-end items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => setViewProduct(p)}
              >
                <Eye className="h-4 w-4 mr-1.5" />
                View
              </Button>
              {p.status === 'pending_approval' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  disabled={approveProductMutation.isPending}
                  onClick={() => handleApprove(p.productId)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Approve
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [approveProductMutation.isPending, handleApprove]
  );

  return (
    <div className="space-y-4">
      <Card className="border shadow-sm overflow-hidden">
        <div className="border-b bg-muted/30 px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background border shadow-sm">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Catalog by supplier</h2>
                <p className="text-sm text-muted-foreground">
                  Inspect products, then approve individually or in bulk.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <AdminSupplierSelector
                value={selectedSupplierId}
                onValueChange={setSelectedSupplierId}
                className="w-full sm:w-[260px]"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending_approval">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          {!selectedSupplierId && (
            <div className="py-14 text-center rounded-lg border border-dashed bg-muted/15">
              <Package className="h-9 w-9 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">Select a supplier</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                {loadingPartners
                  ? 'Loading supplier partners…'
                  : (supplierPartners?.length ?? 0) === 0
                    ? 'No supplier partners in the system yet.'
                    : 'Choose a partner from the dropdown to load their catalog.'}
              </p>
            </div>
          )}

          {selectedSupplierId && selectedPartner && (
            <>
              <div
                className={cn(
                  'flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border px-4 py-3',
                  'bg-background'
                )}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium truncate">{selectedPartner.partnerName}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="font-normal">
                      {products.length} product{products.length === 1 ? '' : 's'}
                    </Badge>
                    {pendingCount > 0 && (
                      <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 font-normal">
                        {pendingCount} pending
                      </Badge>
                    )}
                    {activeCount > 0 && (
                      <Badge variant="secondary" className="font-normal">
                        {activeCount} active
                      </Badge>
                    )}
                    {catalogSubmitted && (
                      <Badge className="bg-blue-600 font-normal">Catalog submitted</Badge>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="shrink-0" asChild>
                  <Link
                    to="/partners/$partnerId"
                    params={{ partnerId: selectedPartner.partnerId }}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Partner onboarding
                  </Link>
                </Button>
              </div>

              {(pendingCount > 0 || catalogSubmitted || needsOpsReview) && (
                <div className="flex flex-wrap gap-2">
                  {needsOpsReview && selectedPartner && currentOnboardingStage && (
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700"
                      onClick={() =>
                        onCompleteStageReview({
                          supplierId: selectedSupplierId,
                          partnerId: selectedPartner.partnerId,
                          stage: currentOnboardingStage,
                        })
                      }
                    >
                      <ClipboardCheck className="h-4 w-4 mr-1.5" />
                      Review {OPS_STAGE_LABELS[currentOnboardingStage] ?? 'current stage'}
                    </Button>
                  )}
                  {pendingCount > 0 && (
                    <Button
                      size="sm"
                      onClick={() => approveAllMutation.mutate()}
                      disabled={approveAllMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Approve all pending ({pendingCount})
                    </Button>
                  )}
                  {catalogSubmitted && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        onCompleteStageReview({
                          supplierId: selectedSupplierId,
                          partnerId: selectedPartner.partnerId,
                          stage: 'catalog_setup',
                        })
                      }
                    >
                      <ClipboardCheck className="h-4 w-4 mr-1.5" />
                      Complete catalog stage
                    </Button>
                  )}
                </div>
              )}

              {loadingProducts ? (
                <div className="space-y-2 py-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-11 bg-muted animate-pulse rounded-md" />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="py-12 text-center rounded-lg border border-dashed">
                  <p className="text-sm text-muted-foreground">No products match this filter.</p>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={products}
                  searchable={products.length > 3}
                  searchPlaceholder="Search SKU or product name…"
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {viewProduct && (
        <ProductDetailDialog
          product={viewProduct}
          open={!!viewProduct}
          onOpenChange={(open) => !open && setViewProduct(null)}
          onApprove={
            viewProduct.status === 'pending_approval'
              ? () => handleApprove(viewProduct.productId)
              : undefined
          }
          approvePending={approveProductMutation.isPending}
        />
      )}
    </div>
  );
}
