import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { partnerAuthApi } from '@/lib/api/partnerAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export const Route = createFileRoute('/partner/verify-email')({
  component: VerifyEmailPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: (search.token as string) || '',
    };
  },
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const { token } = useSearch({ from: '/partner/verify-email' });
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  const verifyMutation = useMutation({
    mutationFn: () => partnerAuthApi.verifyEmail(token),
    onSuccess: () => {
      setVerificationStatus('success');
    },
    onError: (error: any) => {
      setVerificationStatus('error');
      setErrorMessage(error.message || 'Verification failed');
    },
  });

  useEffect(() => {
    if (token) {
      verifyMutation.mutate();
    } else {
      setVerificationStatus('error');
      setErrorMessage('No verification token provided');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {verificationStatus === 'verifying' && (
            <div className="flex justify-center mb-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
          )}
          {verificationStatus === 'success' && (
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          )}
          {verificationStatus === 'error' && (
            <div className="flex justify-center mb-4">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
          )}
          <CardTitle className="text-2xl">
            {verificationStatus === 'verifying' && 'Verifying Email...'}
            {verificationStatus === 'success' && 'Email Verified!'}
            {verificationStatus === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {verificationStatus === 'verifying' && 'Please wait while we verify your email address'}
            {verificationStatus === 'success' && 'Your email has been successfully verified. You can now log in.'}
            {verificationStatus === 'error' && errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {verificationStatus === 'success' && (
            <Button
              className="w-full"
              onClick={() => navigate({ to: '/partner/login' })}
            >
              Go to Login
            </Button>
          )}
          {verificationStatus === 'error' && (
            <div className="space-y-2">
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => navigate({ to: '/partner/resend-verification' })}
              >
                Resend verification link
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => navigate({ to: '/partner/register' })}
              >
                Register Again
              </Button>
              <Button
                className="w-full"
                onClick={() => navigate({ to: '/partner/login' })}
              >
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
