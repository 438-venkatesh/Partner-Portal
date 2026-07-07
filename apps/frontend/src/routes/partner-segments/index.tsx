import { createFileRoute } from '@tanstack/react-router';
import { SegmentsPage } from '@/features/relationship/pages/SegmentsPage';

export const Route = createFileRoute('/partner-segments/')({
  component: SegmentsPage,
});
