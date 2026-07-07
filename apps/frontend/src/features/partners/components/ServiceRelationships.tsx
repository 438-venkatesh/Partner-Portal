import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { serviceApi, ServiceRelationship } from '@/lib/api/services';
import { useToast } from '@/lib/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FormTextarea, FormField } from '@/components/ui/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, Check, Calendar, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { ServiceRelationshipDetailDialog } from './ServiceRelationshipDetailDialog';

interface ServiceRelationshipsProps {
  partnerId: string;
  canCreate?: boolean;
  canApprove?: boolean;
}

export function ServiceRelationships({
  partnerId,
  canCreate = true,
  canApprove = false,
}: ServiceRelationshipsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<ServiceRelationship | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveBy, setApproveBy] = useState<'tenant_admin' | 'partner_admin' | 'platform_admin'>('platform_admin');
  const [approveNotes, setApproveNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['service-relationships', partnerId],
    queryFn: () => serviceApi.getPartnerRelationships(partnerId),
  });

  const approveMutation = useMutation({
    mutationFn: (data: {
      relationshipId: string;
      approvedBy: 'tenant_admin' | 'partner_admin' | 'platform_admin';
      notes?: string;
    }) => serviceApi.approveRelationship(data.relationshipId, { approvedBy: data.approvedBy, notes: data.notes }),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Service relationship approved successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['service-relationships', partnerId] });
      setApproveDialogOpen(false);
      setApproveNotes('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to approve relationship',
        variant: 'destructive',
      });
    },
  });

  const handleViewDetails = (relationship: ServiceRelationship) => {
    setSelectedRelationship(relationship);
    setDetailDialogOpen(true);
  };

  const handleApprove = (relationship: ServiceRelationship) => {
    setSelectedRelationship(relationship);
    setApproveDialogOpen(true);
  };

  const handleApproveSubmit = () => {
    if (!selectedRelationship) return;
    approveMutation.mutate({
      relationshipId: selectedRelationship.relationshipId,
      approvedBy: approveBy,
      notes: approveNotes || undefined,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Relationships</CardTitle>
          <CardDescription>Partner-tenant service relationships</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const relationships = data?.relationships || [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Service Relationships</CardTitle>
              <CardDescription>
                Partner–tenant–catalog links. New links start as <strong>pending</strong>; the partner portal only
                lists tenants when a link is <strong>active</strong> (use Approve as platform admin after tenant +
                partner approvals, or seed dev data).
              </CardDescription>
            </div>
            {canCreate && (
              <Button asChild>
                <Link to="/partners/$partnerId/relationships/new" params={{ partnerId }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Relationship
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {relationships.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No service relationships found.</p>
              {canCreate && (
                <Button variant="outline" className="mt-4" asChild>
                  <Link to="/partners/$partnerId/relationships/new" params={{ partnerId }}>
                    Create First Relationship
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested Services</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Approval Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relationships.map((relationship) => (
                  <TableRow key={relationship.relationshipId}>
                    <TableCell className="font-medium">
                      {relationship.service?.serviceName || 'Unknown Service'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm font-medium block truncate">
                            {relationship.tenant?.tenantName ?? 'Tenant'}
                          </span>
                          <span className="text-xs text-muted-foreground truncate block">
                            {relationship.tenant?.tenantCode ?? relationship.tenantId}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={
                          relationship.status === 'active'
                            ? 'active'
                            : relationship.status === 'suspended'
                            ? 'suspended'
                            : relationship.status === 'terminated'
                            ? 'suspended'
                            : 'pending'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {relationship.requestedServices.slice(0, 2).map((service, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                        {relationship.requestedServices.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{relationship.requestedServices.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {relationship.startDate ? (
                        <div className="flex items-center space-x-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{format(new Date(relationship.startDate), 'MMM dd, yyyy')}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not started</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {relationship.approvedByTenantAdmin && (
                          <Badge variant="outline" className="text-xs">Tenant ✓</Badge>
                        )}
                        {relationship.approvedByPartnerAdmin && (
                          <Badge variant="outline" className="text-xs">Partner ✓</Badge>
                        )}
                        {relationship.approvedByPlatformAdmin && (
                          <Badge variant="outline" className="text-xs">Platform ✓</Badge>
                        )}
                        {!relationship.approvedByTenantAdmin &&
                          !relationship.approvedByPartnerAdmin &&
                          !relationship.approvedByPlatformAdmin && (
                            <span className="text-xs text-muted-foreground">Pending</span>
                          )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(relationship)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canApprove && relationship.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleApprove(relationship)}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ServiceRelationshipDetailDialog
        relationship={selectedRelationship}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Service Relationship</DialogTitle>
            <DialogDescription>
              {selectedRelationship && (
                <>
                  Approve relationship for:{' '}
                  <strong>{selectedRelationship.service?.serviceName}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Approve As" required>
              <Select value={approveBy} onValueChange={(value: any) => setApproveBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                  <SelectItem value="partner_admin">Partner Admin</SelectItem>
                  <SelectItem value="platform_admin">Platform Admin</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormTextarea
              label="Notes (Optional)"
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
              placeholder="Add approval notes"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApproveSubmit}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}









