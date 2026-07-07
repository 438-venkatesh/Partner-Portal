import { createFileRoute } from '@tanstack/react-router';
import { CreateServiceRelationshipPage } from '@/features/partners/pages/CreateServiceRelationshipPage';

export const Route = createFileRoute('/partners/$partnerId/relationships/new')({
  component: CreateServiceRelationshipPage,
});
