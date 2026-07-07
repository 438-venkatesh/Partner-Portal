import { createFileRoute } from '@tanstack/react-router';
import { InvoiceDetailPage } from '@/features/suppliers/pages/InvoiceDetailPage';

export const Route = createFileRoute('/suppliers/invoices/$invoiceId')({
  component: InvoiceDetailPage,
});









