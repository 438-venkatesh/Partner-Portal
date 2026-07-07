import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { partnerAuthApi } from '@/lib/api/partnerAuth';
import { useToast } from '@/lib/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-field';
import { Mail } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});

export const Route = createFileRoute('/partner/resend-verification')({
  component: ResendVerificationPage,
});

function ResendVerificationPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: partnerAuthApi.resendVerification,
    onSuccess: (data) => {
      toast({
        title: 'Verification link ready',
        description: data.message,
      });
      if (data.emailVerificationToken) {
        navigate({
          to: '/partner/verify-email',
          search: { token: data.emailVerificationToken },
        });
      }
    },
    onError: (error: { message?: string }) => {
      toast({
        title: 'Request failed',
        description: error.message || 'Could not process request',
        variant: 'destructive',
      });
    },
  });

  const form = useForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value }) => {
      const parsed = schema.safeParse(value);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message || 'Invalid email');
      }
      await mutation.mutateAsync(parsed.data.email);
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Mail className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Resend verification</CardTitle>
          <CardDescription>
            Enter the email you registered with. We will issue a new verification link (in
            development the app opens the link for you).
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
                  error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                  placeholder="you@company.com"
                  required
                />
              )}
            </form.Field>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Sending…' : 'Continue'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate({ to: '/partner/login' })}
            >
              Back to login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
