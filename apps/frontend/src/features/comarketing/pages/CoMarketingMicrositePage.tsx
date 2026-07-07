import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { comarketingApi } from '@/lib/api/comarketing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput, FormTextarea } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2 } from 'lucide-react';

export function CoMarketingMicrositePage({ slug }: { slug: string }) {
  const [form, setForm] = useState({ customerName: '', contactEmail: '', contactPhone: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['co-marketing-page', slug],
    queryFn: () => comarketingApi.getPublicPage(slug),
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      const refCode = new URLSearchParams(window.location.search).get('ref') ?? undefined;
      return comarketingApi.submitPageLead(slug, {
        customerName: form.customerName,
        contactEmail: form.contactEmail || undefined,
        contactPhone: form.contactPhone || undefined,
        notes: form.notes || undefined,
        referralCode: refCode,
      });
    },
    onSuccess: () => setSubmitted(true),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Page not found</h1>
      </div>
    );
  }

  const { page, partner, asset } = data;
  const brandName = partner?.displayName || partner?.partnerName || 'Our partner';

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex items-center gap-3">
        {partner?.logoUrl && <img src={partner.logoUrl} alt={brandName} className="h-10 w-10 rounded object-contain" />}
        <span className="text-sm font-medium text-muted-foreground">Presented by {brandName}</span>
      </div>

      <h1 className="text-3xl font-semibold">{page.headline}</h1>
      {page.description && <p className="mt-4 text-muted-foreground">{page.description}</p>}

      {asset && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">{asset.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {asset.description && <p className="mb-3 text-sm text-muted-foreground">{asset.description}</p>}
            <a href={asset.fileUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">
              View resource →
            </a>
          </CardContent>
        </Card>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{page.ctaLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <p>Thanks — {brandName} will be in touch shortly.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <FormInput
                label="Your name"
                required
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              />
              <FormInput label="Email" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
              <FormInput label="Phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
              <FormTextarea label="What are you looking for?" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              <Button
                disabled={!form.customerName.trim() || submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
              >
                {page.ctaLabel}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
