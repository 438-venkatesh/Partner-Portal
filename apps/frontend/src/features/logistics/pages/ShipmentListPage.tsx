import { useQuery } from '@tanstack/react-query';
import { logisticsApi } from '@/lib/api/logistics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Eye, Check, X, MapPin } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface Shipment {
  shipmentId: string;
  shipmentNumber: string;
  tenantId: string;
  status: string;
  pickupDate: Date;
  deliveryDate: Date;
  pickupAddress: any;
  deliveryAddress: any;
  trackingUrl?: string;
}

export function ShipmentListPage() {
  // In a real app, you'd get logisticsId from auth context
  const logisticsId = "logistics-123";
  
  const { data, error } = useQuery({
    queryKey: ['shipments', logisticsId],
    queryFn: () => logisticsApi.getShipments(logisticsId),
  });

  const columns: ColumnDef<Shipment>[] = [
  {
    accessorKey: "shipmentNumber",
    header: "Shipment #",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("shipmentNumber")}</div>
    ),
  },
  {
    accessorKey: "pickupDate",
    header: "Pickup Date",
    cell: ({ row }) => {
      const date = row.getValue("pickupDate") as Date;
      return new Date(date).toLocaleDateString();
    },
  },
  {
    accessorKey: "deliveryDate",
    header: "Delivery Date",
    cell: ({ row }) => {
      const date = row.getValue("deliveryDate") as Date;
      return new Date(date).toLocaleDateString();
    },
  },
  {
    accessorKey: "pickupAddress",
    header: "Pickup Location",
    cell: ({ row }) => {
      const address = row.getValue("pickupAddress") as any;
      return address?.city || "-";
    },
  },
  {
    accessorKey: "deliveryAddress",
    header: "Delivery Location",
    cell: ({ row }) => {
      const address = row.getValue("deliveryAddress") as any;
      return address?.city || "-";
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return <StatusBadge status={status as any} />;
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const shipment = row.original;
      return (
        <div className="flex items-center space-x-2">
          <Link to="/logistics/shipments/$shipmentId" params={{ shipmentId: shipment.shipmentId }}>
            <Button variant="ghost" size="icon">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {shipment.trackingUrl && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(shipment.trackingUrl, '_blank')}
            >
              <MapPin className="h-4 w-4" />
            </Button>
          )}
          {shipment.status === "pending" && (
            <>
              <Button variant="ghost" size="icon" className="text-green-600">
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-red-600">
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      );
    },
  },
];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shipments</h1>
        <p className="text-muted-foreground">View and manage shipment requests</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shipments</CardTitle>
          <CardDescription>All shipment requests from clients</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load shipments.
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={data?.shipments || []}
              searchPlaceholder="Search shipments..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

