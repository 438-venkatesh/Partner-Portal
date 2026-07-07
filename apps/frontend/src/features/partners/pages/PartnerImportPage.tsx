import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { partnerApi } from '@/lib/api/partners';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/lib/hooks/use-toast';
import { UploadCloud, Download } from 'lucide-react';

const TEMPLATE_CSV =
  'partnerName,displayName,partnerType,businessType,tier,website,description\n' +
  'Acme Resellers Inc.,Acme,reseller,b2b,gold,https://acme.example.com,Regional hardware reseller\n';

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'partner-import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function PartnerImportPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: (file: File) => partnerApi.importCsv(file),
    onSuccess: (report) => {
      toast({
        title: 'Import finished',
        description: `${report.succeeded} of ${report.total} partner(s) created.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Import failed',
        description: error.response?.data?.message || 'Could not process the file',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Bulk import partners</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV to onboard many partners at once. Each row goes through the same
          validation as creating one partner by hand.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download CSV template
          </Button>

          <div
            className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed p-8 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) {
                setFileName(file.name);
                importMutation.mutate(file);
              }
            }}
          >
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Drag a CSV here, or</p>
            <Button onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}>
              {importMutation.isPending ? 'Importing…' : 'Choose file'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setFileName(file.name);
                  importMutation.mutate(file);
                }
              }}
            />
            {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}
          </div>

          {importMutation.data && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Badge variant="success">{importMutation.data.succeeded} created</Badge>
                {importMutation.data.failed > 0 && (
                  <Badge variant="destructive">{importMutation.data.failed} failed</Badge>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="p-2">Row</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importMutation.data.rows.map((r) => (
                      <tr key={r.row} className="border-b last:border-0">
                        <td className="p-2">{r.row}</td>
                        <td className="p-2">
                          <Badge variant={r.status === 'created' ? 'success' : 'destructive'}>
                            {r.status}
                          </Badge>
                        </td>
                        <td className="p-2 text-muted-foreground">{r.error || r.partnerId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
