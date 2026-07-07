import type { ReactNode } from 'react';
import { usePartnerAuthStore } from '@/lib/stores/partnerAuthStore';

export interface RoleGuardProps {
  /** Partner JWT role(s) allowed */
  allow: Array<'admin' | 'manager' | 'member' | 'viewer'>;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Hide partner-portal UI unless the signed-in user has one of the allowed roles.
 * Reads `role` from the persisted JWT-backed store (set at login).
 */
export function RoleGuard({ allow, children, fallback = null }: RoleGuardProps) {
  const role = usePartnerAuthStore((s) => s.user?.role as string | undefined);
  if (!role || !allow.includes(role as any)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
