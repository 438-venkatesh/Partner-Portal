import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { invoiceApi, Invoice } from '@/lib/api/invoices';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { format } from 'date-fns';
import { AdminSupplierSelector } from '../components/AdminSupplierSelector';

export function InvoiceListPage() {
  const navigate = useNavigate();
  const [supplierId, setSupplierId] = useState('');

  const { data, error, isLoading } = useQuery({
    queryKey: ['invoices', supplierId],
    queryFn: () => invoiceApi.getSupplierInvoices(supplierId),
    enabled: Boolean(supplierId),
  });

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: 'invoiceNumber',
      header: 'Invoice #',
      cell: ({ row }) => <span className="font-medium">{row.getValue('invoiceNumber')}</span>,
    },
    {
      accessorKey: 'invoiceDate',
      header: 'Date',
      cell: ({ row }) => format(new Date(row.getValue('invoiceDate') as string), 'MMM d, yyyy'),
    },
    {
      accessorKey: 'totalAmount',
      header: 'Amount',
      cell: ({ row }) => {
        const amount = row.getValue('totalAmount') as number;
        const currency = row.original.currency || 'USD';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <StatusBadge
            status={
              status === 'paid' ? 'active' : status === 'partial' ? 'pending' : 'suspended'
            }
          />
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            navigate({
              to: '/suppliers/invoices/$invoiceId',
              params: { invoiceId: row.original.invoiceId },
            })
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
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-sm text-muted-foreground mt-1">View invoices by supplier partner.</p>
      </div>

      <AdminSupplierSelector value={supplierId} onValueChange={setSupplierId} />

      <Card>
        <CardHeader>
          <CardTitle>Invoice list</CardTitle>
          <CardDescription>
            {supplierId ? `${data?.pagination?.total ?? data?.invoices?.length ?? 0} invoice(s)` : 'Select a supplier'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!supplierId && (
            <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg">
              Choose a supplier to load invoices.
            </p>
          )}
          {supplierId && isLoading && (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          )}
          {supplierId && error && (
            <p className="text-sm text-destructive">Failed to load invoices.</p>
          )}
          {supplierId && !error && !isLoading && (
            <DataTable columns={columns} data={data?.invoices ?? []} searchable={false} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
