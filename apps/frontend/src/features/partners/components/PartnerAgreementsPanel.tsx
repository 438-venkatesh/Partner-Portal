import { Fragment, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  partnerApi,
  type CreatePartnerAgreementInput,
  type PartnerAgreement,
  type UpdatePartnerAgreementInput,
} from '@/lib/api/partners';
import { tenantsApi } from '@/lib/api/tenants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormInput, FormTextarea } from '@/components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/lib/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

type AgreementStatus = 'draft' | 'pending_signature' | 'signed' | 'expired' | 'terminated' | 'cancelled';

const ALLOWED_STATUS_TRANSITIONS: Record<AgreementStatus, AgreementStatus[]> = {
  draft: ['pending_signature', 'cancelled'],
  pending_signature: ['signed', 'cancelled', 'expired'],
  signed: ['terminated', 'cancelled', 'expired'],
  expired: [],
  terminated: [],
  cancelled: [],
};

function canTransition(from: string, to: AgreementStatus): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[from as AgreementStatus] ?? [];
  return allowed.includes(to);
}

function nextTransitionLabel(from: string): string {
  const next = ALLOWED_STATUS_TRANSITIONS[from as AgreementStatus] ?? [];
  if (next.length === 0) return 'No further transitions';
  if (next.length === 1) return `Next: ${next[0].replace(/_/g, ' ')}`;
  return `Next: ${next.map((s) => s.replace(/_/g, ' ')).join(' / ')}`;
}

export function PartnerAgreementsPanel({ partnerId }: { partnerId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreatePartnerAgreementInput>({
    agreementType: 'supplier',
    agreementNumber: '',
    title: '',
    description: '',
    tenantId: undefined,
    documentUrl: '',
    startDate: '',
    endDate: '',
    notes: '',
  });
  const [editForm, setEditForm] = useState<UpdatePartnerAgreementInput>({});

  const { data: tenantsPayload } = useQuery({
    queryKey: ['tenants', 'list'],
    queryFn: () => tenantsApi.list(),
  });
  const tenants = tenantsPayload?.tenants ?? [];

  const { data, isLoading, error } = useQuery({
    queryKey: ['partners', partnerId, 'agreements'],
    queryFn: () => partnerApi.getAgreements(partnerId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      partnerApi.createAgreement(partnerId, {
        agreementType: form.agreementType.trim(),
        agreementNumber: form.agreementNumber.trim(),
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        tenantId: form.tenantId || undefined,
        documentUrl: form.documentUrl?.trim() || undefined,
        startDate: form.startDate?.trim() || undefined,
        endDate: form.endDate?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Agreement created', description: 'Draft agreement was added and can now be edited.' });
      queryClient.invalidateQueries({ queryKey: ['partners', partnerId, 'agreements'] });
      setForm((f) => ({
        ...f,
        agreementNumber: '',
        title: '',
        description: '',
        tenantId: undefined,
        documentUrl: '',
        startDate: '',
        endDate: '',
        notes: '',
      }));
    },
    onError: (e: any) => {
      toast({
        title: 'Create failed',
        description: e?.message ?? 'Could not create agreement',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ agreementId, payload }: { agreementId: string; payload: UpdatePartnerAgreementInput }) =>
      partnerApi.updateAgreement(partnerId, agreementId, payload),
    onSuccess: () => {
      toast({ title: 'Agreement updated' });
      queryClient.invalidateQueries({ queryKey: ['partners', partnerId, 'agreements'] });
      setEditingId(null);
      setEditForm({});
    },
    onError: (e: any) => {
      toast({
        title: 'Update failed',
        description: e?.response?.data?.message ?? e?.message ?? 'Could not update agreement',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (agreementId: string) => partnerApi.deleteAgreement(partnerId, agreementId),
    onSuccess: () => {
      toast({ title: 'Agreement deleted' });
      queryClient.invalidateQueries({ queryKey: ['partners', partnerId, 'agreements'] });
    },
    onError: (e: any) => {
      toast({
        title: 'Delete failed',
        description: e?.response?.data?.message ?? e?.message ?? 'Could not delete agreement',
        variant: 'destructive',
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ agreementId, status }: { agreementId: string; status: UpdatePartnerAgreementInput['status'] }) =>
      partnerApi.updateAgreement(partnerId, agreementId, { status }),
    onSuccess: () => {
      toast({ title: 'Status updated' });
      queryClient.invalidateQueries({ queryKey: ['partners', partnerId, 'agreements'] });
    },
    onError: (e: any) => {
      toast({
        title: 'Status update failed',
        description: e?.response?.data?.message ?? e?.message ?? 'Could not update status',
        variant: 'destructive',
      });
    },
  });

  const rows = useMemo(() => data?.agreements ?? [], [data]);
  const startEdit = (a: PartnerAgreement) => {
    setEditingId(a.agreementId);
    setEditForm({
      agreementType: a.agreementType,
      agreementNumber: a.agreementNumber,
      title: a.title,
      description: a.description ?? '',
      tenantId: a.tenantId ?? null,
      documentUrl: a.documentUrl ?? '',
      startDate: a.startDate ?? '',
      endDate: a.endDate ?? '',
      notes: a.notes ?? '',
      status: (a.status as UpdatePartnerAgreementInput['status']) ?? 'draft',
    });
  };

  const saveEdit = (agreementId: string) => {
    updateMutation.mutate({ agreementId, payload: editForm });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create agreement draft</CardTitle>
          <CardDescription>
            Draft means an internal record not yet sent for signature. You can edit it, then move status to
            <code className="mx-1">pending_signature</code> when ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-xl">
          <FormInput
            label="Agreement type"
            required
            value={form.agreementType}
            onChange={(e) => setForm((f) => ({ ...f, agreementType: e.target.value }))}
            placeholder="e.g. supplier, msa, nda"
          />
          <FormInput
            label="Agreement number"
            required
            value={form.agreementNumber}
            onChange={(e) => setForm((f) => ({ ...f, agreementNumber: e.target.value }))}
            placeholder="Unique reference"
          />
          <FormInput
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Agreement title"
          />
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Tenant (optional)
            </label>
            <Select
              value={form.tenantId ?? '__none__'}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, tenantId: v === '__none__' ? undefined : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Link to tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.tenantId} value={t.tenantId}>
                    {t.tenantName} ({t.tenantCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FormTextarea
            label="Description (optional)"
            value={form.description ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
          />
          <FormInput
            label="Document URL (optional)"
            value={form.documentUrl ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, documentUrl: e.target.value }))}
            placeholder="https://..."
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormInput
              label="Start date (optional)"
              type="date"
              value={form.startDate ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
            <FormInput
              label="End date (optional)"
              type="date"
              value={form.endDate ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
          <FormTextarea
            label="Ops notes (optional)"
            value={form.notes ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
          />
          <Button
            type="button"
            disabled={
              createMutation.isPending ||
              !form.agreementType.trim() ||
              !form.agreementNumber.trim() ||
              !form.title.trim()
            }
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? 'Creating…' : 'Create draft'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agreements</CardTitle>
          <CardDescription>Full management: view, edit, status update, and delete (where allowed).</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertDescription>
              Strict transitions are enforced. Example: you cannot move directly from draft to signed.
              Move draft to pending signature first.
            </AlertDescription>
          </Alert>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && (
            <p className="text-sm text-destructive">Could not load agreements.</p>
          )}
          {!isLoading && !error && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No agreements yet.</p>
          )}
          {!isLoading && !error && rows.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="whitespace-nowrap">Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((a) => {
                    const isEditing = editingId === a.agreementId;
                    const isExpanded = expandedId === a.agreementId;
                    return (
                      <Fragment key={a.agreementId}>
                        <TableRow key={a.agreementId}>
                          <TableCell className="font-mono text-sm">{a.agreementNumber}</TableCell>
                          <TableCell className="max-w-xs truncate">{a.title}</TableCell>
                          <TableCell>{a.agreementType}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{a.status}</Badge>
                              <Badge variant="secondary" className="font-normal">
                                {nextTransitionLabel(a.status)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(a.updatedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedId(isExpanded ? null : a.agreementId)}
                              >
                                {isExpanded ? 'Hide' : 'View'}
                              </Button>
                              {!isEditing ? (
                                <Button variant="outline" size="sm" onClick={() => startEdit(a)}>
                                  Edit
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                                  Cancel
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={deleteMutation.isPending || a.status === 'signed'}
                                onClick={() => {
                                  if (window.confirm(`Delete agreement ${a.agreementNumber}?`)) {
                                    deleteMutation.mutate(a.agreementId);
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {(isExpanded || isEditing) && (
                          <TableRow key={`${a.agreementId}-details`}>
                            <TableCell colSpan={6}>
                              <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                  <FormInput
                                    label="Agreement type"
                                    value={String(isEditing ? editForm.agreementType ?? '' : a.agreementType)}
                                    disabled={!isEditing}
                                    onChange={(e) =>
                                      setEditForm((f) => ({ ...f, agreementType: e.target.value }))
                                    }
                                  />
                                  <FormInput
                                    label="Agreement number"
                                    value={String(isEditing ? editForm.agreementNumber ?? '' : a.agreementNumber)}
                                    disabled={!isEditing}
                                    onChange={(e) =>
                                      setEditForm((f) => ({ ...f, agreementNumber: e.target.value }))
                                    }
                                  />
                                  <FormInput
                                    label="Title"
                                    value={String(isEditing ? editForm.title ?? '' : a.title)}
                                    disabled={!isEditing}
                                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                                  />
                                  <FormInput
                                    label="Document URL"
                                    value={String(isEditing ? editForm.documentUrl ?? '' : a.documentUrl ?? '')}
                                    disabled={!isEditing}
                                    onChange={(e) =>
                                      setEditForm((f) => ({ ...f, documentUrl: e.target.value }))
                                    }
                                  />
                                  <FormInput
                                    label="Start date"
                                    type="date"
                                    value={String(isEditing ? editForm.startDate ?? '' : a.startDate ?? '')}
                                    disabled={!isEditing}
                                    onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))}
                                  />
                                  <FormInput
                                    label="End date"
                                    type="date"
                                    value={String(isEditing ? editForm.endDate ?? '' : a.endDate ?? '')}
                                    disabled={!isEditing}
                                    onChange={(e) => setEditForm((f) => ({ ...f, endDate: e.target.value }))}
                                  />
                                </div>
                                <FormTextarea
                                  label="Description"
                                  value={String(isEditing ? editForm.description ?? '' : a.description ?? '')}
                                  disabled={!isEditing}
                                  rows={2}
                                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                                />
                                <FormTextarea
                                  label="Ops notes"
                                  value={String(isEditing ? editForm.notes ?? '' : a.notes ?? '')}
                                  disabled={!isEditing}
                                  rows={2}
                                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                                />
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm text-muted-foreground">Status:</span>
                                  {(
                                    ['draft', 'pending_signature', 'signed', 'expired', 'terminated', 'cancelled'] as const
                                  ).map((status) => {
                                    const transitionAllowed = canTransition(a.status, status);
                                    return (
                                    <Button
                                      key={status}
                                      variant={a.status === status ? 'default' : 'outline'}
                                      size="sm"
                                      disabled={statusMutation.isPending || !transitionAllowed}
                                      title={
                                        transitionAllowed
                                          ? undefined
                                          : `Not allowed from ${a.status.replace(/_/g, ' ')}`
                                      }
                                      onClick={() => statusMutation.mutate({ agreementId: a.agreementId, status })}
                                    >
                                      {status.replace(/_/g, ' ')}
                                    </Button>
                                    );
                                  })}
                                </div>
                                {isEditing && (
                                  <div className="flex justify-end">
                                    <Button
                                      size="sm"
                                      disabled={updateMutation.isPending}
                                      onClick={() => saveEdit(a.agreementId)}
                                    >
                                      {updateMutation.isPending ? 'Saving…' : 'Save changes'}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
