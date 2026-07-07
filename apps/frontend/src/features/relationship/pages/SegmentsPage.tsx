import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { segmentsApi, type SegmentCriteria } from '@/lib/api/segments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/lib/hooks/use-toast';
import { Plus, Trash2, Users } from 'lucide-react';

function parseList(value: string): string[] | undefined {
  const items = value.split(',').map((v) => v.trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function SegmentMemberCount({ segmentId }: { segmentId: string }) {
  const { data } = useQuery({
    queryKey: ['partner-segments', segmentId, 'members'],
    queryFn: () => segmentsApi.getMembers(segmentId),
  });
  return (
    <div className="flex items-center gap-1 pt-1">
      <Users className="h-3.5 w-3.5" />
      <span>{data ? `${data.total} partner(s)` : 'Loading…'}</span>
    </div>
  );
}

export function SegmentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [partnerTypes, setPartnerTypes] = useState('');
  const [tiers, setTiers] = useState('');
  const [tags, setTags] = useState('');
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const { data: segments, isLoading } = useQuery({ queryKey: ['partner-segments'], queryFn: segmentsApi.list });

  const currentCriteria = (): SegmentCriteria => ({
    partnerTypes: parseList(partnerTypes),
    tiers: parseList(tiers),
    tags: parseList(tags),
  });

  const previewMutation = useMutation({
    mutationFn: () => segmentsApi.preview(currentCriteria()),
    onSuccess: (result) => setPreviewCount(result.total),
  });

  const createMutation = useMutation({
    mutationFn: () => segmentsApi.create({ name, criteria: currentCriteria() }),
    onSuccess: () => {
      toast({ title: 'Segment saved' });
      queryClient.invalidateQueries({ queryKey: ['partner-segments'] });
      setCreating(false);
      setName('');
      setPartnerTypes('');
      setTiers('');
      setTags('');
      setPreviewCount(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: segmentsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partner-segments'] }),
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Partner segments</h1>
          <p className="text-sm text-muted-foreground">
            Saved filters over the partner list — membership is computed live, not stored.
          </p>
        </div>
        <Button onClick={() => setCreating((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          New segment
        </Button>
      </div>

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle>New segment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormInput label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="grid grid-cols-3 gap-4">
              <FormInput
                label="Partner types (comma-separated)"
                placeholder="reseller, agency"
                value={partnerTypes}
                onChange={(e) => setPartnerTypes(e.target.value)}
              />
              <FormInput
                label="Tiers (comma-separated)"
                placeholder="gold, platinum"
                value={tiers}
                onChange={(e) => setTiers(e.target.value)}
              />
              <FormInput
                label="Tags (comma-separated)"
                placeholder="strategic"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => previewMutation.mutate()}>
                Preview
              </Button>
              {previewCount !== null && (
                <span className="text-sm text-muted-foreground">{previewCount} matching partner(s)</span>
              )}
              <Button
                disabled={!name.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Save segment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Skeleton className="h-32" />
      ) : (segments ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No segments saved yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(segments ?? []).map((segment) => (
            <Card key={segment.segmentId}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{segment.name}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(segment.segmentId)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {segment.criteria.partnerTypes && <p>Types: {segment.criteria.partnerTypes.join(', ')}</p>}
                {segment.criteria.tiers && <p>Tiers: {segment.criteria.tiers.join(', ')}</p>}
                {segment.criteria.tags && <p>Tags: {segment.criteria.tags.join(', ')}</p>}
                <SegmentMemberCount segmentId={segment.segmentId} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
