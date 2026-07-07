import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { supplierApi } from '@/lib/api/suppliers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { AdminSupplierSelector } from '../components/AdminSupplierSelector';

interface PurchaseOrder {
  poId: string;
  poNumber: string;
  tenantId: string;
  status: string;
  poDate: Date;
  deliveryDate: Date;
  totalAmount: number;
  currency: string;
}

export function PurchaseOrderListPage() {
  const navigate = useNavigate();
  const [supplierId, setSupplierId] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['purchase-orders', supplierId],
    queryFn: () => supplierApi.getPurchaseOrders(supplierId),
    enabled: Boolean(supplierId),
  });

  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      accessorKey: 'poNumber',
      header: 'PO Number',
      cell: ({ row }) => <div className="font-medium">{row.getValue('poNumber')}</div>,
    },
    {
      accessorKey: 'poDate',
      header: 'PO Date',
      cell: ({ row }) => new Date(row.getValue('poDate') as Date).toLocaleDateString(),
    },
    {
      accessorKey: 'totalAmount',
      header: 'Total',
      cell: ({ row }) => {
        const amount = row.getValue('totalAmount') as number;
        const currency = row.original.currency || 'USD';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.getValue('status') as 'pending'} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            navigate({ to: '/suppliers/purchase-orders/$poId', params: { poId: row.original.poId } })
          }
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Purchase orders</h1>
        <p className="text-sm text-muted-foreground mt-1">View POs by supplier partner.</p>
      </div>

      <AdminSupplierSelector value={supplierId} onValueChange={setSupplierId} />

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            {supplierId ? 'Purchase orders for the selected supplier' : 'Select a supplier above'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!supplierId && (
            <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg">
              Choose a supplier to load purchase orders.
            </p>
          )}
          {supplierId && error && (
            <p className="text-sm text-destructive">Failed to load purchase orders.</p>
          )}
          {supplierId && !error && (
            <DataTable
              columns={columns}
              data={(data?.purchaseOrders ?? data ?? []) as PurchaseOrder[]}
              searchable={false}
            />
          )}
          {supplierId && isLoading && (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
