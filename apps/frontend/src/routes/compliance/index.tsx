import { createFileRoute } from '@tanstack/react-router';
import { ComplianceAdminPage } from '@/features/compliance/pages/ComplianceAdminPage';

export const Route = createFileRoute('/compliance/')({
  component: ComplianceAdminPage,
});
