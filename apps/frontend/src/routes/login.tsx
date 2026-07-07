import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { loginOperationsPortal } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/authStore';
import { useToast } from '@/lib/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-field';
import { LayoutDashboard } from 'lucide-react';

/** Decode JWT exp (no verification — UI hint only). */
function jwtExpiresAtMs(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    const json = atob(base64);
    const { exp } = JSON.parse(json) as { exp?: number };
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/** True only when token parses and is not expired — otherwise treat as logged out. */
function hasActiveOperationsSession(token: string): boolean {
  const t = token.trim();
  if (!t) return false;
  const expMs = jwtExpiresAtMs(t);
  if (expMs === null) return false;
  return Date.now() < expMs - 10_000;
}

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (typeof localStorage === 'undefined') return;

    const token = localStorage.getItem('auth_token');
    if (!token?.trim()) return;

    if (!hasActiveOperationsSession(token)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth-storage');
      return;
    }

    throw redirect({ to: '/partners' });
  },
  component: OperationsLoginPage,
});

function OperationsLoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const setUser = useAuthStore((s) => s.setUser);
  const setToken = useAuthStore((s) => s.setToken);

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginOperationsPortal(email, password),
    onSuccess: (data) => {
      setToken(data.token);
      setUser({
        userId: data.user.userId,
        email: data.user.email,
        role: data.user.role,
      });
      toast({
        title: 'Signed in',
        description: 'Operations Portal',
      });
      navigate({ to: '/partners' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid email or password',
        variant: 'destructive',
      });
    },
  });

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      await loginMutation.mutateAsync(value);
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 p-4">
      <Card className="w-full max-w-md border-slate-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <LayoutDashboard className="h-12 w-12 text-slate-700" />
          </div>
          <CardTitle className="text-2xl">Operations Portal</CardTitle>
          <CardDescription>
            Sign in to manage partners, suppliers, and logistics. This is not
            the partner self-service login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-4"
          >
            <form.Field name="email">
              {(field) => (
                <FormInput
                  label="Email"
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  error={
                    field.state.meta.errors[0]
                      ? String(field.state.meta.errors[0])
                      : undefined
                  }
                  placeholder="admin@operations.local"
                  required
                  autoComplete="username"
                />
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <FormInput
                  label="Password"
                  type="password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  error={
                    field.state.meta.errors[0]
                      ? String(field.state.meta.errors[0])
                      : undefined
                  }
                  placeholder="Enter password"
                  required
                  autoComplete="current-password"
                />
              )}
            </form.Field>

            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
            </Button>

            <div className="text-center text-sm text-muted-foreground pt-2 border-t">
              Are you a partner user?{' '}
              <Button
                type="button"
                variant="link"
                className="px-0 h-auto"
                onClick={() => navigate({ to: '/partner/login' })}
              >
                Partner login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
