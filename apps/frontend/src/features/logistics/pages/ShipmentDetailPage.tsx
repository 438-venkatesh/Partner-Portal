import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import { logisticsApi } from '@/lib/api/logistics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShipmentAcceptanceForm } from '../components/ShipmentAcceptanceForm';
import {
  ArrowLeft,
  Download,
  Check,
  Package,
  MapPin,
  Calendar,
  Truck,
  User,
  Clock,
  Navigation,
} from 'lucide-react';
import { format } from 'date-fns';

const formatAddress = (address: any) => {
  if (!address) return 'N/A';
  return `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`;
};

interface Shipment {
  shipmentId: string;
  shipmentNumber: string;
  tenantId: string;
  logisticsId: string;
  poId?: string;
  shipmentType: string;
  status: string;
  pickupDate: string;
  pickupTime?: string;
  pickupAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    contactName?: string;
    contactPhone?: string;
  };
  deliveryDate: string;
  deliveryTime?: string;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    contactName?: string;
    contactPhone?: string;
  };
  items: Array<{
    itemId: string;
    productCode: string;
    productName: string;
    quantity: number;
    weight?: number;
    volume?: number;
    description?: string;
  }>;
  totalWeight?: number;
  totalVolume?: number;
  packageCount?: number;
  trackingUrl?: string;
  carrierReference?: string;
  assignedDriver?: string;
  vehicleNumber?: string;
  actualDeliveryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface TrackingEvent {
  eventId: string;
  shipmentId: string;
  eventType: string;
  eventTimestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  status?: string;
  description?: string;
}

export function ShipmentDetailPage() {
  const { shipmentId } = useParams({ from: '/logistics/shipments/$shipmentId' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);

  const { data: shipment, isLoading, error } = useQuery({
    queryKey: ['shipments', shipmentId],
    queryFn: () => logisticsApi.getShipmentById(shipmentId),
  });

  // Mock tracking events - in production, this would come from the API
  const trackingEvents: TrackingEvent[] = shipment
    ? [
        {
          eventId: '1',
          shipmentId,
          eventType: 'created',
          eventTimestamp: shipment.createdAt,
          description: 'Shipment created',
        },
        ...(shipment.status !== 'pending'
          ? [
              {
                eventId: '2',
                shipmentId,
                eventType: 'picked_up',
                eventTimestamp: shipment.pickupDate,
                location: {
                  latitude: 0,
                  longitude: 0,
                  address: formatAddress(shipment.pickupAddress),
                },
                description: 'Shipment picked up',
              },
            ]
          : []),
        ...(shipment.status === 'delivered' && shipment.actualDeliveryDate
          ? [
              {
                eventId: '3',
                shipmentId,
                eventType: 'delivered',
                eventTimestamp: shipment.actualDeliveryDate,
                location: {
                  latitude: 0,
                  longitude: 0,
                  address: formatAddress(shipment.deliveryAddress),
                },
                description: 'Shipment delivered',
              },
            ]
          : []),
      ]
    : [];

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return <Package className="h-4 w-4" />;
      case 'picked_up':
        return <Truck className="h-4 w-4" />;
      case 'in_transit':
        return <Navigation className="h-4 w-4" />;
      case 'delivered':
        return <Check className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-10 rounded bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="text-center py-8 text-destructive">
        Failed to load shipment details.
      </div>
    );
  }

  const canAccept = shipment.status === 'pending';

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: '/logistics/shipments' })}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{shipment.shipmentNumber}</h1>
              <p className="text-muted-foreground">Shipment Details</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <StatusBadge status={shipment.status as any} />
            {canAccept && (
              <Button onClick={() => setAcceptDialogOpen(true)}>
                <Check className="mr-2 h-4 w-4" />
                Accept Shipment
              </Button>
            )}
            {shipment.trackingUrl && (
              <Button variant="outline" onClick={() => window.open(shipment.trackingUrl, '_blank')}>
                <Navigation className="mr-2 h-4 w-4" />
                Track
              </Button>
            )}
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Schedule Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Pickup Date</p>
                <p className="font-medium">
                  {format(new Date(shipment.pickupDate), 'MMM dd, yyyy')}
                  {shipment.pickupTime && ` at ${shipment.pickupTime}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivery Date</p>
                <p className="font-medium">
                  {format(new Date(shipment.deliveryDate), 'MMM dd, yyyy')}
                  {shipment.deliveryTime && ` at ${shipment.deliveryTime}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Shipment Type</p>
                <Badge variant="outline" className="capitalize">{shipment.shipmentType}</Badge>
              </div>
              {shipment.assignedDriver && (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Driver</p>
                    <p className="font-medium">{shipment.assignedDriver}</p>
                  </div>
                </div>
              )}
              {shipment.vehicleNumber && (
                <div className="flex items-center space-x-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Vehicle</p>
                    <p className="font-medium">{shipment.vehicleNumber}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Shipment Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {shipment.totalWeight && (
                <div>
                  <p className="text-sm text-muted-foreground">Total Weight</p>
                  <p className="font-medium">{shipment.totalWeight} kg</p>
                </div>
              )}
              {shipment.totalVolume && (
                <div>
                  <p className="text-sm text-muted-foreground">Total Volume</p>
                  <p className="font-medium">{shipment.totalVolume} m³</p>
                </div>
              )}
              {shipment.packageCount && (
                <div>
                  <p className="text-sm text-muted-foreground">Package Count</p>
                  <p className="font-medium">{shipment.packageCount} packages</p>
                </div>
              )}
              {shipment.carrierReference && (
                <div>
                  <p className="text-sm text-muted-foreground">Carrier Reference</p>
                  <p className="font-medium">{shipment.carrierReference}</p>
                </div>
              )}
              {shipment.actualDeliveryDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Actual Delivery</p>
                  <p className="font-medium">
                    {format(new Date(shipment.actualDeliveryDate), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="items" className="space-y-4">
          <TabsList>
            <TabsTrigger value="items">
              <Package className="mr-2 h-4 w-4" />
              Items
            </TabsTrigger>
            <TabsTrigger value="addresses">
              <MapPin className="mr-2 h-4 w-4" />
              Addresses
            </TabsTrigger>
            <TabsTrigger value="tracking">
              <Navigation className="mr-2 h-4 w-4" />
              Tracking
            </TabsTrigger>
            {shipment.notes && <TabsTrigger value="notes">Notes</TabsTrigger>}
          </TabsList>

          <TabsContent value="items">
            <Card>
              <CardHeader>
                <CardTitle>Shipment Items</CardTitle>
                <CardDescription>
                  {shipment.items.length} item{shipment.items.length !== 1 ? 's' : ''} in this shipment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Code</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                      <TableHead className="text-right">Volume</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipment.items.map((item: any) => (
                      <TableRow key={item.itemId}>
                        <TableCell className="font-medium">{item.productCode}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            {item.description && (
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {item.weight ? `${item.weight} kg` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.volume ? `${item.volume} m³` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="addresses">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Pickup Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm whitespace-pre-line">{formatAddress(shipment.pickupAddress)}</p>
                  {shipment.pickupAddress.contactName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Contact</p>
                      <p className="text-sm font-medium">{shipment.pickupAddress.contactName}</p>
                      {shipment.pickupAddress.contactPhone && (
                        <p className="text-sm">{shipment.pickupAddress.contactPhone}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm whitespace-pre-line">{formatAddress(shipment.deliveryAddress)}</p>
                  {shipment.deliveryAddress.contactName && (
                    <div>
                      <p className="text-sm text-muted-foreground">Contact</p>
                      <p className="text-sm font-medium">{shipment.deliveryAddress.contactName}</p>
                      {shipment.deliveryAddress.contactPhone && (
                        <p className="text-sm">{shipment.deliveryAddress.contactPhone}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tracking">
            <Card>
              <CardHeader>
                <CardTitle>Tracking Events</CardTitle>
                <CardDescription>Shipment tracking history</CardDescription>
              </CardHeader>
              <CardContent>
                {trackingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No tracking events available yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {trackingEvents.map((event) => (
                      <div
                        key={event.eventId}
                        className="flex items-start space-x-4 pb-4 border-b last:border-0"
                      >
                        <div className="flex-shrink-0 mt-1">
                          {getEventIcon(event.eventType)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium capitalize">
                              {event.eventType.replace('_', ' ')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(event.eventTimestamp), 'MMM dd, yyyy HH:mm')}
                            </p>
                          </div>
                          {event.location?.address && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <MapPin className="inline h-3 w-3 mr-1" />
                              {event.location.address}
                            </p>
                          )}
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {shipment.notes && (
            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-line">{shipment.notes}</p>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <ShipmentAcceptanceForm
        shipmentId={shipmentId}
        open={acceptDialogOpen}
        onOpenChange={setAcceptDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['shipments', shipmentId] });
        }}
      />
    </>
  );
}


