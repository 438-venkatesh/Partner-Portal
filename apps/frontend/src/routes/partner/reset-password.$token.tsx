import React from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { partnerAuthApi } from '@/lib/api/partnerAuth';
import { useToast } from '@/lib/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-field';
import { Lock, CheckCircle2, ArrowLeft } from 'lucide-react';

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const Route = createFileRoute('/partner/reset-password/$token')({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { token } = Route.useParams();
  const [success, setSuccess] = React.useState(false);

  const resetPasswordMutation = useMutation({
    mutationFn: (password: string) => partnerAuthApi.resetPassword(token, password),
    onSuccess: () => {
      setSuccess(true);
      toast({
        title: 'Password Reset Successful',
        description: 'Your password has been reset. You can now login with your new password.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Reset Failed',
        description: error.message || 'Failed to reset password. The link may have expired.',
        variant: 'destructive',
      });
    },
  });

  const form = useForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      const result = resetPasswordSchema.safeParse(value);
      if (!result.success) {
        throw new Error(result.error.errors[0]?.message || 'Validation failed');
      }
      await resetPasswordMutation.mutateAsync(result.data.password);
    },
  });

  const createValidator = <T extends z.ZodTypeAny>(schema: T) => {
    return ({ value }: { value: unknown }) => {
      const result = schema.safeParse(value);
      if (result.success) {
        return undefined;
      }
      return result.error.errors[0]?.message || 'Invalid value';
    };
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Password Reset Successful</CardTitle>
            <CardDescription>
              Your password has been reset successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => navigate({ to: '/partner/login' })}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Lock className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Enter your new password below
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
            <form.Field
              name="password"
              validators={{
                onChange: createValidator(
                  z.string()
                    .min(8, 'Password must be at least 8 characters')
                    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
                    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
                    .regex(/[0-9]/, 'Password must contain at least one number')
                ),
              }}
            >
              {(field) => (
                <FormInput
                  label="New Password"
                  type="password"
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    // Also validate confirmPassword if it has a value
                    const confirmField = form.getFieldInfo('confirmPassword');
                    if (confirmField?.state.value) {
                      confirmField.validate('change');
                    }
                  }}
                  error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                  hint="At least 8 characters with uppercase, lowercase, and number"
                  required
                />
              )}
            </form.Field>

            <form.Field
              name="confirmPassword"
              validators={{
                onChange: ({ value }) => {
                  const password = form.state.values.password;
                  if (!value) {
                    return 'Please confirm your password';
                  }
                  if (value !== password) {
                    return "Passwords don't match";
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <FormInput
                  label="Confirm New Password"
                  type="password"
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    field.validate('change');
                  }}
                  error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                  required
                />
              )}
            </form.Field>

            <Button type="submit" className="w-full" disabled={resetPasswordMutation.isPending}>
              {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
            </Button>

            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => navigate({ to: '/partner/login' })}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}









