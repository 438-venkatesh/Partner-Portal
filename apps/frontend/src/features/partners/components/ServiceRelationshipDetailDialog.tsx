import { ServiceRelationship } from '@/lib/api/services';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, CheckCircle2, Building2, Users, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface ServiceRelationshipDetailDialogProps {
  relationship: ServiceRelationship | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceRelationshipDetailDialog({
  relationship,
  open,
  onOpenChange,
}: ServiceRelationshipDetailDialogProps) {
  if (!relationship) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Service Relationship Details</DialogTitle>
          <DialogDescription>
            {relationship.service?.serviceName || 'Service Relationship'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Status</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Service</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{relationship.service?.serviceName}</p>
                <p className="text-sm text-muted-foreground">
                  {relationship.service?.serviceCategory}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="approvals">Approvals</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Relationship Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tenant ID</p>
                    <p className="font-medium">{relationship.tenantId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Requested By</p>
                    <p className="font-medium capitalize">{relationship.requestedBy.replace('_', ' ')}</p>
                  </div>
                  {relationship.startDate && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Start Date</p>
                        <p className="font-medium">
                          {format(new Date(relationship.startDate), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  )}
                  {relationship.endDate && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">End Date</p>
                        <p className="font-medium">
                          {format(new Date(relationship.endDate), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  )}
                  {relationship.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="text-sm">{relationship.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="services">
              <Card>
                <CardHeader>
                  <CardTitle>Requested Services</CardTitle>
                  <CardDescription>
                    Services requested for this relationship
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {relationship.requestedServices.map((service, idx) => (
                      <Badge key={idx} variant="secondary">
                        {service}
                      </Badge>
                    ))}
                  </div>
                  {relationship.approvedServices && relationship.approvedServices.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Approved Services</p>
                      <div className="flex flex-wrap gap-2">
                        {relationship.approvedServices.map((service, idx) => (
                          <Badge key={idx} variant="default">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissions">
              <Card>
                <CardHeader>
                  <CardTitle>Permissions</CardTitle>
                  <CardDescription>Application and module permissions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {relationship.applications && relationship.applications.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Applications</p>
                      <div className="flex flex-wrap gap-2">
                        {relationship.applications.map((app, idx) => (
                          <Badge key={idx} variant="outline">
                            {app}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {relationship.modules && Object.keys(relationship.modules).length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Modules</p>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                        {JSON.stringify(relationship.modules, null, 2)}
                      </pre>
                    </div>
                  )}
                  {relationship.permissions && Object.keys(relationship.permissions).length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Permissions</p>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                        {JSON.stringify(relationship.permissions, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approvals">
              <Card>
                <CardHeader>
                  <CardTitle>Approval Status</CardTitle>
                  <CardDescription>Three-party approval workflow</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Tenant Admin</span>
                    </div>
                    {relationship.approvedByTenantAdmin ? (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm">
                          Approved {relationship.tenantApprovedAt && format(new Date(relationship.tenantApprovedAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Partner Admin</span>
                    </div>
                    {relationship.approvedByPartnerAdmin ? (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm">
                          Approved {relationship.partnerApprovedAt && format(new Date(relationship.partnerApprovedAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Platform Admin</span>
                    </div>
                    {relationship.approvedByPlatformAdmin ? (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm">
                          Approved {relationship.platformApprovedAt && format(new Date(relationship.platformApprovedAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}









