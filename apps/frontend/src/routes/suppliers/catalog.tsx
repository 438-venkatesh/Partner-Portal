import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/suppliers/catalog')({
  beforeLoad: () => {
    throw redirect({ to: '/partner-operations' });
  },
});
