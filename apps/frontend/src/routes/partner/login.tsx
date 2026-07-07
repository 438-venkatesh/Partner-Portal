import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { partnerAuthApi } from '@/lib/api/partnerAuth';
import { usePartnerAuthStore } from '@/lib/stores/partnerAuthStore';
import { useToast } from '@/lib/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-field';
import { cn } from '@/lib/utils';
import { ArrowRight, Building2, LayoutDashboard } from 'lucide-react';

export const Route = createFileRoute('/partner/login')({
  component: PartnerLoginPage,
});

function goToOperationsPortalLogin() {
  const base = window.location.origin;
  window.location.assign(`${base}/login`);
}

function PartnerLoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setUser, setToken } = usePartnerAuthStore();

  const loginMutation = useMutation({
    mutationFn: partnerAuthApi.login,
    onSuccess: (data) => {
      setToken(data.token);
      setUser(data.user);
      toast({
        title: 'Login Successful',
        description: `Welcome back, ${data.user.firstName || data.user.email}!`,
      });
      navigate({ to: '/partner/dashboard' });
    },
    onError: (error: any) => {
      toast({
        title: 'Login Failed',
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md border-slate-200/80 shadow-xl shadow-slate-200/60">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl tracking-tight">Partner Login</CardTitle>
          <CardDescription className="text-base">
            Sign in to your partner account to manage your services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-1 shadow-inner">
            <button
              type="button"
              aria-label="Open Operations Portal — staff and admin sign-in"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'default' }),
                'flex h-auto w-full cursor-pointer flex-row items-stretch justify-start gap-0 rounded-lg border border-transparent bg-white p-3 text-left shadow-sm outline-none transition-all hover:border-indigo-200 hover:bg-indigo-50/80 hover:text-inherit hover:shadow-md focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2'
              )}
              onClick={goToOperationsPortalLogin}
            >
              <span className="flex w-full items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
                  <LayoutDashboard className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block font-semibold text-slate-900">Operations Portal</span>
                  <span className="block text-xs leading-snug text-slate-500">
                    Staff & admin — partners, suppliers, logistics
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
              </span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs font-medium uppercase tracking-wide">
              <span className="bg-card px-3 text-slate-400">Or partner account</span>
            </div>
          </div>

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
                  error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                  placeholder="you@company.com"
                  required
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
                  error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                  placeholder="Enter your password"
                  required
                />
              )}
            </form.Field>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="link"
                className="px-0"
                onClick={() => navigate({ to: '/partner/forgot-password' })}
              >
                Forgot password?
              </Button>
              <Button
                type="button"
                variant="link"
                className="px-0"
                onClick={() => navigate({ to: '/partner/resend-verification' })}
              >
                Verify email
              </Button>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold shadow-md shadow-slate-900/10"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Logging in...' : 'Sign in as partner'}
            </Button>

            <div className="text-center text-sm text-muted-foreground pt-4">
              Don't have an account?{' '}
              <Button
                type="button"
                variant="link"
                className="px-0 h-auto"
                onClick={() => navigate({ to: '/partner/register' })}
              >
                Register here
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
