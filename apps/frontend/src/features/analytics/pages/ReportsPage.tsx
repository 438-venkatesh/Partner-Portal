import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormInput, FormSelect } from '@/components/ui/form-field';
import { SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/lib/hooks/use-toast';
import { Download } from 'lucide-react';

export function ReportsPage() {
  const { toast } = useToast();
  const [entityKey, setEntityKey] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  const { data: entities, isLoading } = useQuery({ queryKey: ['report-entities'], queryFn: reportsApi.listEntities });
  const entity = entities?.find((e) => e.key === entityKey);

  const downloadMutation = useMutation({
    mutationFn: () =>
      reportsApi.downloadCsv(entityKey, {
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        columns: selectedColumns.length ? selectedColumns : undefined,
      }),
    onSuccess: () => toast({ title: 'Report downloaded' }),
    onError: () => toast({ title: 'Error', description: 'Could not export this report.', variant: 'destructive' }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report builder</CardTitle>
        <CardDescription>Pick an entity, choose columns and filters, and export to CSV.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-xl">
        {isLoading ? (
          <Skeleton className="h-48" />
        ) : (
          <>
            <FormSelect
              label="Entity"
              placeholder="Select what to export"
              value={entityKey}
              onValueChange={(v) => {
                setEntityKey(v);
                setSelectedColumns([]);
              }}
            >
              {(entities ?? []).map((e) => (
                <SelectItem key={e.key} value={e.key}>
                  {e.label}
                </SelectItem>
              ))}
            </FormSelect>

            {entity && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Columns</span>
                <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                  {entity.columns.map((col) => (
                    <label key={col} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedColumns.length === 0 || selectedColumns.includes(col)}
                        onCheckedChange={(checked) => {
                          setSelectedColumns((prev) => {
                            const base = prev.length === 0 ? [...entity.columns] : prev;
                            return checked ? [...new Set([...base, col])] : base.filter((c) => c !== col);
                          });
                        }}
                      />
                      {col}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <FormInput label="Status filter" placeholder="optional" value={status} onChange={(e) => setStatus(e.target.value)} />
              <FormInput label="From date" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <FormInput label="To date" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            <Button disabled={!entityKey || downloadMutation.isPending} onClick={() => downloadMutation.mutate()}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
