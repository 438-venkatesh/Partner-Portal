import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { onboardingApi, OnboardingStage, SupplierOnboardingStage } from '@/lib/api/onboarding';
import { formatPartnerTypeLabel } from '@/lib/formatPartnerType';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClipboardList, ExternalLink, FileSearch } from 'lucide-react';

const SUPPLIER_STAGE_LABELS: Record<string, string> = {
  supplier_registration: 'Registration',
  catalog_setup: 'Catalog',
  supplier_documentation: 'Documents',
  supplier_verification: 'Platform verification',
  supplier_agreement: 'Agreement',
  payment_setup: 'Payment',
  supplier_portal_access: 'Training',
  supplier_activation: 'Activation',
};

const SERVICE_STAGE_LABELS: Record<string, string> = {
  registration: 'Registration',
  service_selection: 'Service selection',
  initial_review: 'Initial review',
  documentation: 'Documentation',
  verification: 'Verification',
  agreement: 'Agreement',
  app_access: 'App access',
  user_setup: 'User setup',
  training: 'Training',
  testing: 'Testing',
  go_live: 'Go live',
};

export type AdminReviewQueueTarget =
  | {
      track: 'supplier';
      supplierId: string;
      partnerId: string;
      stage: SupplierOnboardingStage;
      partnerName: string;
      partnerType?: string;
      submittedAt?: string;
      awaitingOpsReview?: boolean;
    }
  | {
      track: 'service';
      partnerId: string;
      stage: OnboardingStage;
      partnerName: string;
      partnerType?: string;
      submittedAt?: string;
      awaitingOpsReview?: boolean;
    };

interface Props {
  onReview: (item: AdminReviewQueueTarget) => void;
}

export function AdminPartnerReviewQueue({ onReview }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-onboarding-review-queue'],
    queryFn: async () => {
      const [supplier, service] = await Promise.all([
        onboardingApi.getSupplierReviewQueue(),
        onboardingApi.getPartnerReviewQueue(),
      ]);

      const items: AdminReviewQueueTarget[] = [
        ...supplier.queue.map((item) => ({
          track: 'supplier' as const,
          supplierId: item.supplierId,
          partnerId: item.partnerId,
          stage: item.stage as SupplierOnboardingStage,
          partnerName: item.partnerName,
          partnerType: item.partnerType,
          submittedAt: item.submittedAt,
          awaitingOpsReview: item.awaitingOpsReview,
        })),
        ...service.queue.map((item) => ({
          track: 'service' as const,
          partnerId: item.partnerId,
          stage: item.stage as OnboardingStage,
          partnerName: item.partnerName,
          partnerType: item.partnerType,
          submittedAt: item.submittedAt,
          awaitingOpsReview: item.awaitingOpsReview,
        })),
      ];

      items.sort((a, b) => {
        const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return tb - ta;
      });

      return items;
    },
    refetchInterval: 30_000,
  });

  const queue = data ?? [];

  const trackLabel = (item: AdminReviewQueueTarget) => {
    if (item.partnerType) return formatPartnerTypeLabel(item.partnerType);
    return item.track === 'supplier' ? 'Supplier' : 'Service partner';
  };

  return (
    <Card className="border shadow-sm overflow-hidden">
      <div className="border-b bg-muted/30 px-5 py-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Pending partner submissions</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Agency, reseller, supplier, and other partner onboarding stages waiting for operations
            review.
          </p>
        </div>
      </div>

      <CardContent className="p-0">
        {isLoading && (
          <div className="p-5 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        )}

        {error && <p className="text-sm text-destructive p-5">Could not load review queue.</p>}

        {!isLoading && !error && queue.length === 0 && (
          <div className="py-16 text-center px-5">
            <FileSearch className="h-9 w-9 mx-auto text-muted-foreground/35 mb-2" />
            <p className="text-sm font-medium">Queue is empty</p>
            <p className="text-sm text-muted-foreground mt-1">
              New submissions will appear here when any partner submits a stage for review.
            </p>
          </div>
        )}

        {queue.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Partner</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Onboarding</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right pr-5">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((item) => {
                const key =
                  item.track === 'supplier'
                    ? `supplier-${item.supplierId}-${item.stage}`
                    : `service-${item.partnerId}-${item.stage}`;
                const stageLabel =
                  item.track === 'supplier'
                    ? (SUPPLIER_STAGE_LABELS[item.stage] ?? item.stage.replace(/_/g, ' '))
                    : (SERVICE_STAGE_LABELS[item.stage] ?? item.stage.replace(/_/g, ' '));
                const onboardingTrack =
                  item.track === 'supplier' ? 'Supplier onboarding' : 'Service onboarding';

                return (
                  <TableRow key={key}>
                    <TableCell className="pl-5 font-medium">{item.partnerName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {trackLabel(item)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{onboardingTrack}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {stageLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {item.awaitingOpsReview
                        ? 'Ready for ops review'
                        : item.submittedAt
                          ? format(new Date(item.submittedAt), 'MMM d, yyyy · h:mm a')
                          : '—'}
                    </TableCell>
                    <TableCell className="text-right pr-5">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="h-8" onClick={() => onReview(item)}>
                          Review
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8" asChild>
                          <Link to="/partners/$partnerId" params={{ partnerId: item.partnerId }}>
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                            Partner
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
