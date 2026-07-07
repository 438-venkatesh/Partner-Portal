import { useQuery } from '@tanstack/react-query';
import { comarketingApi } from '@/lib/api/comarketing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function PagesPanel() {
  const { data: pages, isLoading } = useQuery({ queryKey: ['comarketing-all-pages'], queryFn: comarketingApi.listAllPages });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Co-marketing pages</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : (pages ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No partner has published a co-marketing page yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Headline</th>
                <th className="p-2">Partner</th>
                <th className="p-2">Slug</th>
                <th className="p-2">Views</th>
                <th className="p-2">Leads</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(pages ?? []).map(({ page, partnerName }) => (
                <tr key={page.pageId} className="border-b last:border-0">
                  <td className="p-2">{page.headline}</td>
                  <td className="p-2">{partnerName}</td>
                  <td className="p-2 font-mono text-xs">/co/{page.slug}</td>
                  <td className="p-2">{page.viewCount}</td>
                  <td className="p-2">{page.leadCount}</td>
                  <td className="p-2">
                    <Badge variant={page.isActive ? 'success' : 'outline'}>{page.isActive ? 'Active' : 'Inactive'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function LinksPanel() {
  const { data: links, isLoading } = useQuery({ queryKey: ['comarketing-all-links'], queryFn: comarketingApi.listAllLinks });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Referral &amp; campaign links</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : (links ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No partner has created a referral link yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2">Campaign</th>
                <th className="p-2">Partner</th>
                <th className="p-2">UTM source/medium</th>
                <th className="p-2">Clicks</th>
                <th className="p-2">Leads</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(links ?? []).map(({ link, partnerName }) => (
                <tr key={link.linkId} className="border-b last:border-0">
                  <td className="p-2">{link.campaignName}</td>
                  <td className="p-2">{partnerName}</td>
                  <td className="p-2 text-muted-foreground">
                    {[link.utmSource, link.utmMedium].filter(Boolean).join(' / ') || '—'}
                  </td>
                  <td className="p-2">{link.clickCount}</td>
                  <td className="p-2">{link.leadCount}</td>
                  <td className="p-2">
                    <Badge variant={link.isActive ? 'success' : 'outline'}>{link.isActive ? 'Active' : 'Inactive'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

export function ComarketingAdminPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Co-marketing &amp; lead management</h1>
        <p className="text-sm text-muted-foreground">
          Oversight of partner-authored co-branded pages and referral/campaign links. Mark which marketing assets are
          co-brandable from Enablement → Assets. Lead distribution rules and incentive challenges live under Deals &amp;
          revenue.
        </p>
      </div>

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages">Co-marketing pages</TabsTrigger>
          <TabsTrigger value="links">Referral &amp; campaign links</TabsTrigger>
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
