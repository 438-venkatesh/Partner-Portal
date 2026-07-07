import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { comarketingApi } from '@/lib/api/comarketing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormInput, FormTextarea, FormSelect } from '@/components/ui/form-field';
import { SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/lib/hooks/use-toast';
import { Copy, Plus, Trash2 } from 'lucide-react';

function copyToClipboard(text: string, toast: (opts: { title: string }) => void) {
  navigator.clipboard.writeText(text).then(() => toast({ title: 'Link copied' }));
}

function PagesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ assetId: '', slug: '', headline: '', description: '', ctaLabel: '' });

  const { data: pages, isLoading } = useQuery({ queryKey: ['my-comarketing-pages'], queryFn: comarketingApi.listMyPages });
  const { data: eligibleAssets } = useQuery({ queryKey: ['comarketing-eligible-assets'], queryFn: comarketingApi.listEligibleAssets });

  const createMutation = useMutation({
    mutationFn: () =>
      comarketingApi.createPage({
        assetId: form.assetId || undefined,
        slug: form.slug,
        headline: form.headline,
        description: form.description || undefined,
        ctaLabel: form.ctaLabel || undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Page created' });
      queryClient.invalidateQueries({ queryKey: ['my-comarketing-pages'] });
      setCreating(false);
      setForm({ assetId: '', slug: '', headline: '', description: '', ctaLabel: '' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.response?.data?.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (pageId: string) => comarketingApi.deletePage(pageId),
    onSuccess: () => {
      toast({ title: 'Page deleted' });
      queryClient.invalidateQueries({ queryKey: ['my-comarketing-pages'] });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>My co-marketing pages</CardTitle>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New page
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {creating && (
          <div className="space-y-3 rounded-md border p-3">
            <FormInput
              label="URL slug"
              hint="Lowercase letters, numbers, hyphens only"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
            <FormInput label="Headline" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
            <FormTextarea
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
            <FormInput
              label="Call-to-action label"
              placeholder="Request a consultation"
              value={form.ctaLabel}
              onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
            />
            <FormSelect
              label="Co-branded asset (optional)"
              placeholder="None"
              value={form.assetId}
              onValueChange={(v) => setForm({ ...form, assetId: v })}
            >
              {(eligibleAssets ?? []).map((asset) => (
                <SelectItem key={asset.assetId} value={asset.assetId}>
                  {asset.title}
                </SelectItem>
              ))}
            </FormSelect>
            <div className="flex gap-2">
              <Button
                disabled={!form.slug.trim() || !form.headline.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Create
              </Button>
              <Button variant="outline" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : (pages ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No pages yet — create one to start capturing co-branded leads.</p>
        ) : (
          (pages ?? []).map((page) => (
            <div key={page.pageId} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium">{page.headline}</p>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(page.pageId)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                <span className="font-mono text-xs">{window.location.origin}/co/{page.slug}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(`${window.location.origin}/co/${page.slug}`, toast)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="mt-2 flex gap-2">
                <Badge variant="outline">{page.viewCount} views</Badge>
                <Badge variant="outline">{page.leadCount} leads</Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function LinksPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ campaignName: '', utmSource: '', utmMedium: '', utmCampaign: '', pageId: '', targetUrl: '' });

  const { data: links, isLoading } = useQuery({ queryKey: ['my-referral-links'], queryFn: comarketingApi.listMyLinks });
  const { data: pages } = useQuery({ queryKey: ['my-comarketing-pages'], queryFn: comarketingApi.listMyPages });

  const createMutation = useMutation({
    mutationFn: () =>
      comarketingApi.createLink({
        campaignName: form.campaignName,
        utmSource: form.utmSource || undefined,
        utmMedium: form.utmMedium || undefined,
        utmCampaign: form.utmCampaign || undefined,
        pageId: form.pageId || undefined,
        targetUrl: form.pageId ? undefined : form.targetUrl || undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Link created' });
      queryClient.invalidateQueries({ queryKey: ['my-referral-links'] });
      setCreating(false);
      setForm({ campaignName: '', utmSource: '', utmMedium: '', utmCampaign: '', pageId: '', targetUrl: '' });
    },
    onError: (error: any) => toast({ title: 'Error', description: error.response?.data?.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (linkId: string) => comarketingApi.deleteLink(linkId),
    onSuccess: () => {
      toast({ title: 'Link deleted' });
      queryClient.invalidateQueries({ queryKey: ['my-referral-links'] });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Referral &amp; campaign links</CardTitle>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New link
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {creating && (
          <div className="space-y-3 rounded-md border p-3">
            <FormInput label="Campaign name" value={form.campaignName} onChange={(e) => setForm({ ...form, campaignName: e.target.value })} />
            <div className="grid grid-cols-3 gap-3">
              <FormInput label="UTM source" value={form.utmSource} onChange={(e) => setForm({ ...form, utmSource: e.target.value })} />
              <FormInput label="UTM medium" value={form.utmMedium} onChange={(e) => setForm({ ...form, utmMedium: e.target.value })} />
              <FormInput label="UTM campaign" value={form.utmCampaign} onChange={(e) => setForm({ ...form, utmCampaign: e.target.value })} />
            </div>
            <FormSelect
              label="Send visitors to one of my pages"
              placeholder="Or use an external URL below"
              value={form.pageId}
              onValueChange={(v) => setForm({ ...form, pageId: v })}
            >
              {(pages ?? []).map((page) => (
                <SelectItem key={page.pageId} value={page.pageId}>
                  {page.headline}
                </SelectItem>
              ))}
            </FormSelect>
            {!form.pageId && (
              <FormInput
                label="External target URL"
                placeholder="https://example.com"
                value={form.targetUrl}
                onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
              />
            )}
            <div className="flex gap-2">
              <Button
                disabled={!form.campaignName.trim() || (!form.pageId && !form.targetUrl.trim()) || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Create
              </Button>
              <Button variant="outline" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : (links ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No referral links yet.</p>
        ) : (
          (links ?? []).map((link) => (
            <div key={link.linkId} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium">{link.campaignName}</p>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(link.linkId)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                <span className="font-mono text-xs">
                  {window.location.origin}/api/co-marketing/r/{link.code}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(`${window.location.origin}/api/co-marketing/r/${link.code}`, toast)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="mt-2 flex gap-2">
                <Badge variant="outline">{link.clickCount} clicks</Badge>
                <Badge variant="outline">{link.leadCount} leads</Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function PartnerComarketingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Co-marketing</h1>
        <p className="text-muted-foreground">Build co-branded landing pages and share trackable referral links.</p>
      </div>

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages">My pages</TabsTrigger>
          <TabsTrigger value="links">Referral links</TabsTrigger>
        </TabsList>
        <TabsContent value="pages" className="mt-4">
          <PagesPanel />
        </TabsContent>
        <TabsContent value="links" className="mt-4">
          <LinksPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
