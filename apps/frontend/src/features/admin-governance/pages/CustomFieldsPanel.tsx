import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customFieldsApi, type CustomFieldDefinition } from '@/lib/api/adminGovernance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput, FormSelect } from '@/components/ui/form-field';
import { SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/lib/hooks/use-toast';
import { Trash2 } from 'lucide-react';

const FIELDS_KEY = ['custom-field-definitions', 'partner'];

export function CustomFieldsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [fieldKey, setFieldKey] = useState('');
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldDefinition['fieldType']>('text');
  const [optionsRaw, setOptionsRaw] = useState('');

  const { data: fields, isLoading } = useQuery({ queryKey: FIELDS_KEY, queryFn: () => customFieldsApi.list('partner') });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: FIELDS_KEY });

  const createMutation = useMutation({
    mutationFn: () =>
      customFieldsApi.create({
        fieldKey,
        label,
        fieldType,
        options: fieldType === 'select' ? optionsRaw.split(',').map((o) => o.trim()).filter(Boolean) : undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Custom field created' });
      setFieldKey('');
      setLabel('');
      setOptionsRaw('');
      invalidate();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ fieldId, isActive }: { fieldId: string; isActive: boolean }) =>
      customFieldsApi.update(fieldId, { isActive }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (fieldId: string) => customFieldsApi.remove(fieldId),
    onSuccess: () => {
      toast({ title: 'Field deleted' });
      invalidate();
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add a custom field for partners</CardTitle>
          <CardDescription>
            Values are stored on the partner record's own metadata and rendered consistently using this
            registry instead of a raw JSON blob.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5 items-end">
          <FormInput
            label="Field key"
            placeholder="e.g. crm_id"
            value={fieldKey}
            onChange={(e) => setFieldKey(e.target.value)}
          />
          <FormInput label="Label" placeholder="e.g. CRM ID" value={label} onChange={(e) => setLabel(e.target.value)} />
          <FormSelect label="Type" value={fieldType} onValueChange={(v) => setFieldType(v as any)}>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="boolean">Boolean</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="select">Select</SelectItem>
          </FormSelect>
          {fieldType === 'select' && (
            <FormInput
              label="Options (comma-separated)"
              value={optionsRaw}
              onChange={(e) => setOptionsRaw(e.target.value)}
            />
          )}
          <Button
            disabled={!fieldKey || !label || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Add field
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Defined fields</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(fields ?? []).map((f) => (
                  <TableRow key={f.fieldId}>
                    <TableCell className="font-mono text-sm">{f.fieldKey}</TableCell>
                    <TableCell>{f.label}</TableCell>
                    <TableCell>{f.fieldType}</TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={f.isActive}
                        onCheckedChange={(checked) => toggleMutation.mutate({ fieldId: f.fieldId, isActive: checked })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(f.fieldId)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(fields ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      No custom fields defined yet.
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
