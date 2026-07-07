import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerEmployeesApi, type Employee, type InviteEmployeeData } from '@/lib/api/partnerEmployees';
import { useToast } from '@/lib/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FormInput, FormField } from '@/components/ui/form-field';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { Users, UserPlus, Mail, Phone, Calendar, CheckCircle2, XCircle, Clock, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

const inviteEmployeeSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

export const Route = createFileRoute('/partner/employees')({
  component: EmployeesPage,
});

function EmployeesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['partner-employees'],
    queryFn: partnerEmployeesApi.getEmployees,
  });

  const inviteMutation = useMutation({
    mutationFn: partnerEmployeesApi.inviteEmployee,
    onSuccess: () => {
      toast({
        title: 'Invitation Sent',
        description: 'Employee invitation has been sent successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['partner-employees'] });
      setInviteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Invitation Failed',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    },
  });

  const resendInvitationMutation = useMutation({
    mutationFn: partnerEmployeesApi.resendInvitation,
    onSuccess: () => {
      toast({
        title: 'Invitation Resent',
        description: 'Invitation email has been resent successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Resend',
        description: error.message || 'Failed to resend invitation',
        variant: 'destructive',
      });
    },
  });

  const removeEmployeeMutation = useMutation({
    mutationFn: partnerEmployeesApi.removeEmployee,
    onSuccess: () => {
      toast({
        title: 'Employee Removed',
        description: 'Employee has been removed successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['partner-employees'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Remove',
        description: error.message || 'Failed to remove employee',
        variant: 'destructive',
      });
    },
  });

  const inviteForm = useForm({
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
    },
    onSubmit: async ({ value }) => {
      await inviteMutation.mutateAsync(value as InviteEmployeeData);
    },
  });

  const getStatusBadge = (status: string, emailVerified: boolean) => {
    if (status === 'active' && emailVerified) {
      return <Badge variant="default" className="bg-green-500">Active</Badge>;
    }
    if (status === 'pending_verification') {
      return <Badge variant="secondary">Pending Verification</Badge>;
    }
    if (status === 'suspended') {
      return <Badge variant="destructive">Suspended</Badge>;
    }
    if (status === 'inactive') {
      return <Badge variant="outline">Inactive</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">
            Manage your organization's employees and their access
          </p>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Employee</DialogTitle>
              <DialogDescription>
                Send an invitation to a new employee. They will receive an email with instructions to set up their account.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                inviteForm.handleSubmit();
              }}
              className="space-y-4"
            >
              <inviteForm.Field
                name="email"
                validators={{
                  onChange: ({ value }) => {
                    const result = z.string().email().safeParse(value);
                    return result.success ? undefined : 'Invalid email address';
                  },
                }}
              >
                {(field) => (
                  <FormInput
                    label="Email"
                    type="email"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    error={field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined}
                    placeholder="employee@company.com"
                    required
                  />
                )}
              </inviteForm.Field>

              <div className="grid grid-cols-2 gap-4">
                <inviteForm.Field name="firstName">
                  {(field) => (
                    <FormInput
                      label="First Name (Optional)"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="John"
                    />
                  )}
                </inviteForm.Field>

                <inviteForm.Field name="lastName">
                  {(field) => (
                    <FormInput
                      label="Last Name (Optional)"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Doe"
                    />
                  )}
                </inviteForm.Field>
              </div>

              <inviteForm.Field name="phone">
                {(field) => (
                  <FormInput
                    label="Phone (Optional)"
                    type="tel"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                )}
              </inviteForm.Field>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInviteDialogOpen(false)}
                  disabled={inviteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
          <CardDescription>
            Roles and permissions are assigned by platform/tenant admins from the wrapper application
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : data?.employees && data.employees.length > 0 ? (
            <div className="space-y-3">
              {data.employees.map((employee) => (
                <div
                  key={employee.accountId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">
                          {employee.firstName && employee.lastName
                            ? `${employee.firstName} ${employee.lastName}`
                            : employee.email}
                        </p>
                        {getStatusBadge(employee.status, employee.emailVerified)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center space-x-1">
                          <Mail className="h-3 w-3" />
                          <span>{employee.email}</span>
                        </div>
                        {employee.phone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{employee.phone}</span>
                          </div>
                        )}
                        {employee.lastLoginAt && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Last login: {format(new Date(employee.lastLoginAt), 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {employee.status === 'pending_verification' && (
                        <DropdownMenuItem
                          onClick={() => resendInvitationMutation.mutate(employee.accountId)}
                          disabled={resendInvitationMutation.isPending}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Resend Invitation
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => {
                          if (confirm('Are you sure you want to remove this employee?')) {
                            removeEmployeeMutation.mutate(employee.accountId);
                          }
                        }}
                        disabled={removeEmployeeMutation.isPending}
                        className="text-destructive"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Remove Employee
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Employees Yet</h3>
              <p className="mb-4">Start by inviting your first employee</p>
              <Button onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Employee
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
