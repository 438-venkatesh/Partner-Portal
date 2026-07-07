import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { directoryApi } from '@/lib/api/directory';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';

export function PartnerDirectoryPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['directory', search],
    queryFn: () => directoryApi.search({ search: search || undefined, limit: 24 }),
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold">Find a partner</h1>
        <p className="mt-2 text-muted-foreground">
          Browse our network of certified agencies, resellers, and integrators.
        </p>
      </div>

      <div className="relative mx-auto mb-8 max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : !data || data.partners.length === 0 ? (
        <p className="text-center text-muted-foreground">No partners match that search yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.partners.map((partner) => (
            <Card key={partner.partnerId}>
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                {partner.logoUrl ? (
                  <img
                    src={partner.logoUrl}
                    alt={`${partner.displayName || partner.partnerName} logo`}
                    className="h-10 w-10 rounded object-contain"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-sm font-semibold">
                    {(partner.displayName || partner.partnerName).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <CardTitle className="text-base">
                    {partner.displayName || partner.partnerName}
                  </CardTitle>
                  <div className="mt-1 flex gap-1.5">
                    <Badge variant="outline" className="capitalize">
                      {partner.partnerType.replace(/_/g, ' ')}
                    </Badge>
                    {partner.tier && (
                      <Badge variant="secondary" className="capitalize">
                        {partner.tier}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {partner.description && (
                  <p className="mb-3 text-sm text-muted-foreground line-clamp-3">
                    {partner.description}
                  </p>
                )}
                {partner.website && (
                  <a
                    href={partner.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Visit website →
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
