import { createFileRoute } from '@tanstack/react-router';
import { InvoiceListPage } from '@/features/suppliers/pages/InvoiceListPage';

export const Route = createFileRoute('/suppliers/invoices')({
  component: InvoiceListPage,
});









