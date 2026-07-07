import { useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerEmployeesApi, type InviteEmployeeData } from '@/lib/api/partnerEmployees';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FormInput } from '@/components/ui/form-field';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Mail, UserPlus, Users } from 'lucide-react';
import { useToast } from '@/lib/hooks/use-toast';

interface Props {
  editable: boolean;
  submitted: boolean;
  onSubmit: () => void;
  submitting: boolean;
}

const MIN_PORTAL_USERS = 1;

export function ServiceUserSetupStagePanel({ editable, submitted, onSubmit, submitting }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteEmployeeData>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['partner-employees'],
    queryFn: partnerEmployeesApi.getEmployees,
  });

  const employees = data?.employees ?? [];
  const userCount = employees.length;
  const requirementMet = userCount >= MIN_PORTAL_USERS;
  const progress = Math.min(100, Math.round((userCount / MIN_PORTAL_USERS) * 100));

  const inviteMutation = useMutation({
    mutationFn: (payload: InviteEmployeeData) => partnerEmployeesApi.inviteEmployee(payload),
    onSuccess: () => {
      toast({ title: 'Invitation sent' });
      queryClient.invalidateQueries({ queryKey: ['partner-employees'] });
      setInviteOpen(false);
      setInviteForm({ email: '', firstName: '', lastName: '', phone: '' });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast({
        title: 'Invite failed',
        description: err?.response?.data?.message ?? 'Could not send invitation',
        variant: 'destructive',
      });
    },
  });

  const handleInvite = (e: FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email.trim()) return;
    inviteMutation.mutate({
      email: inviteForm.email.trim(),
      firstName: inviteForm.firstName?.trim() || undefined,
      lastName: inviteForm.lastName?.trim() || undefined,
      phone: inviteForm.phone?.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Portal users &amp; roles
          </CardTitle>
          <CardDescription>
            Invite team members who will use the partner portal. At least one portal user must exist
            before you submit this stage for review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                {userCount} portal user{userCount === 1 ? '' : 's'} configured
              </span>
              <span className="text-muted-foreground">
                {requirementMet ? 'Requirement met' : `Need at least ${MIN_PORTAL_USERS}`}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="flex flex-wrap gap-2">
            {editable && (
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-1" />
                    Invite employee
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite employee</DialogTitle>
                    <DialogDescription>
                      They will receive access to the partner portal under your organization.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleInvite} className="space-y-4">
                    <FormInput
                      label="Email"
                      type="email"
                      required
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="colleague@company.com"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <FormInput
                        label="First name"
                        value={inviteForm.firstName ?? ''}
                        onChange={(e) => setInviteForm((f) => ({ ...f, firstName: e.target.value }))}
                      />
                      <FormInput
                        label="Last name"
                        value={inviteForm.lastName ?? ''}
                        onChange={(e) => setInviteForm((f) => ({ ...f, lastName: e.target.value }))}
                      />
                    </div>
                    <FormInput
                      label="Phone"
                      type="tel"
                      value={inviteForm.phone ?? ''}
                      onChange={(e) => setInviteForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={inviteMutation.isPending}>
                        {inviteMutation.isPending ? 'Sending…' : 'Send invitation'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to="/partner/employees">Manage all employees</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void refetch()}>
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading team…</p>
          ) : employees.length === 0 ? (
            <Alert>
              <AlertDescription>
                No portal users found yet. Invite at least one employee to continue.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.accountId}>
                      <TableCell className="font-medium">
                        {employee.firstName && employee.lastName
                          ? `${employee.firstName} ${employee.lastName}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          {employee.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal capitalize">
                          {employee.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {editable && !submitted && (
            <Button
              className="w-full sm:w-auto"
              disabled={!requirementMet || submitting}
              onClick={() => onSubmit()}
            >
              {submitting ? 'Submitting…' : 'Submit user setup for review'}
            </Button>
          )}

          {submitted && (
            <Alert className="border-blue-100 bg-blue-50">
              <AlertDescription>
                User setup submitted for platform review. You can still invite employees from the{' '}
                <Link to="/partner/employees" className="text-primary underline">
                  Employees
                </Link>{' '}
                page.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
