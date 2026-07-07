import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { partnerAuthApi } from '@/lib/api/partnerAuth';
import { usePartnerAuthStore } from '@/lib/stores/partnerAuthStore';
import { useToast } from '@/lib/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput, FormTextarea } from '@/components/ui/form-field';
import { Lock, User, Building2, CreditCard, KeyRound, Webhook } from 'lucide-react';
import {
  SubscriptionSettingsPanel,
  ApiKeysSettingsPanel,
  WebhooksSettingsPanel,
} from '@/features/partner-settings/PartnerBillingIntegrationsPanels';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

function OrganizationSettingsTab() {
  const { user, setUser } = usePartnerAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['partner-organization'],
    queryFn: () => partnerAuthApi.getOrganization(),
  });

  const org = data?.organization;

  const [displayName, setDisplayName] = React.useState('');
  const [website, setWebsite] = React.useState('');
  const [description, setDescription] = React.useState('');

  React.useEffect(() => {
    if (!org) return;
    setDisplayName(org.displayName ?? '');
    setWebsite(org.website ?? '');
    setDescription(org.description ?? '');
  }, [org]);

  const saveMutation = useMutation({
    mutationFn: () =>
      partnerAuthApi.updateOrganization({
        displayName: displayName.trim() || undefined,
        website: website.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: (res) => {
      toast({ title: 'Saved', description: 'Organization profile updated.' });
      queryClient.invalidateQueries({ queryKey: ['partner-organization'] });
      if (user) {
        setUser({
          ...user,
          partnerName: res.organization.partnerName,
        });
      }
    },
    onError: (e: any) => {
      toast({
        title: 'Save failed',
        description: e?.message ?? 'Could not update',
        variant: 'destructive',
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
        <CardDescription>
          Update how your company appears in the portal. Legal name and code are managed by the platform team.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-xl">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Could not load organization.</p>}
        {org && (
          <>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Legal name</span>{' '}
                <span className="font-medium">{org.partnerName}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Code</span>{' '}
                <span className="font-mono text-xs">{org.partnerCode}</span>
              </p>
            </div>
            <FormInput
              label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Shown in headers and emails"
            />
            <FormInput
              label="Website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
            <FormTextarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
            <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? 'Saving…' : 'Save organization'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/partner/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = usePartnerAuthStore();
  const { toast } = useToast();
  const isPartnerAdmin = user?.role === 'admin';

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return partnerAuthApi.changePassword(data.currentPassword, data.newPassword);
    },
    onSuccess: () => {
      toast({
        title: 'Password Changed',
        description: 'Your password has been changed successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Password Change Failed',
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      });
    },
  });

  const passwordForm = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      const result = changePasswordSchema.safeParse(value);
      if (!result.success) {
        throw new Error(result.error.errors[0]?.message || 'Validation failed');
      }
      await changePasswordMutation.mutateAsync({
        currentPassword: result.data.currentPassword,
        newPassword: result.data.newPassword,
      });
      passwordForm.reset();
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your partner organization and account settings
        </p>
      </div>

      <Tabs defaultValue="account" className="space-y-4">
        <TabsList className="flex h-auto min-h-10 flex-wrap gap-1">
          <TabsTrigger value="account">
            <User className="h-4 w-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="organization">
            <Building2 className="h-4 w-4 mr-2" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="subscription">
            <CreditCard className="h-4 w-4 mr-2" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="api-keys">
            <KeyRound className="h-4 w-4 mr-2" />
            API keys
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="h-4 w-4 mr-2" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your personal account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : 'Not set'}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Partner Organization</label>
                <p className="text-sm text-muted-foreground mt-1">{user?.partnerName}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization" className="space-y-4">
          <OrganizationSettingsTab />
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <SubscriptionSettingsPanel />
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-4">
          <ApiKeysSettingsPanel canManage={isPartnerAdmin} />
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <WebhooksSettingsPanel canManage={isPartnerAdmin} />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your account password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  passwordForm.handleSubmit();
                }}
                className="space-y-4"
              >
                <passwordForm.Field
                  name="currentPassword"
                  validators={{
                    onChange: createValidator(z.string().min(1, 'Current password is required')),
                  }}
                >
                  {(field) => (
                    <FormInput
                      label="Current Password"
                      type="password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                      required
                    />
                  )}
                </passwordForm.Field>

                <passwordForm.Field
                  name="newPassword"
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
                        const confirmField = passwordForm.getFieldInfo('confirmPassword');
                        if (confirmField?.state.value) {
                          confirmField.validate('change');
                        }
                      }}
                      error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                      hint="At least 8 characters with uppercase, lowercase, and number"
                      required
                    />
                  )}
                </passwordForm.Field>

                <passwordForm.Field
                  name="confirmPassword"
                  validators={{
                    onChange: ({ value }) => {
                      const newPassword = passwordForm.state.values.newPassword;
                      if (!value) {
                        return 'Please confirm your password';
                      }
                      if (value !== newPassword) {
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
                </passwordForm.Field>

                <Button type="submit" disabled={changePasswordMutation.isPending}>
                  {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
