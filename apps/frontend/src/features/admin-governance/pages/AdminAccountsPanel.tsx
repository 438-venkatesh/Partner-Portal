import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminAccountsApi, type StaffAccount } from '@/lib/api/adminGovernance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput, FormSelect } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/lib/hooks/use-toast';

const STAFF_KEY = ['admin-staff-accounts'];

export function AdminAccountsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'superadmin' | 'admin' | 'viewer'>('admin');

  const { data: staff, isLoading } = useQuery({ queryKey: STAFF_KEY, queryFn: adminAccountsApi.listStaff });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: STAFF_KEY });

  const registerMutation = useMutation({
    mutationFn: () => adminAccountsApi.register({ email, password, role }),
    onSuccess: () => {
      toast({ title: 'Staff account created' });
      setEmail('');
      setPassword('');
      invalidate();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ adminId, newRole }: { adminId: string; newRole: StaffAccount['role'] }) =>
      adminAccountsApi.updateRole(adminId, newRole),
    onSuccess: () => {
      toast({ title: 'Role updated' });
      invalidate();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const activeMutation = useMutation({
    mutationFn: ({ adminId, isActive }: { adminId: string; isActive: boolean }) =>
      adminAccountsApi.setActive(adminId, isActive),
    onSuccess: () => {
      toast({ title: 'Status updated' });
      invalidate();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create staff account</CardTitle>
          <CardDescription>Superadmin only. Grants access to the Operations Portal.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4 items-end">
          <FormInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <FormInput label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <FormSelect label="Role" value={role} onValueChange={(v) => setRole(v as any)}>
            <SelectItem value="viewer">Viewer</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="superadmin">Superadmin</SelectItem>
          </FormSelect>
          <Button
            disabled={!email || password.length < 8 || registerMutation.isPending}
            onClick={() => registerMutation.mutate()}
          >
            Create account
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operations staff</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(staff ?? []).map((s) => (
                  <TableRow key={s.adminId}>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>
                      <Select
                        value={s.role}
                        onValueChange={(v) => roleMutation.mutate({ adminId: s.adminId, newRole: v as any })}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="superadmin">Superadmin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.isActive ? 'default' : 'secondary'}>
                        {s.isActive ? 'Active' : 'Deactivated'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={s.isActive}
                        onCheckedChange={(checked) => activeMutation.mutate({ adminId: s.adminId, isActive: checked })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {(staff ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No staff accounts yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
