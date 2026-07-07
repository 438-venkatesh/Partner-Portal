import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import { supplierApi } from '@/lib/api/suppliers';
import { useToast } from '@/lib/hooks/use-toast';
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
import { POAcknowledgmentForm } from '../components/POAcknowledgmentForm';
import { ArrowLeft, Download, Check, X, Package, MapPin, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface PurchaseOrder {
  poId: string;
  poNumber: string;
  tenantId: string;
  supplierId: string;
  status: string;
  poDate: string;
  deliveryDate: string;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  items: Array<{
    itemId: string;
    productCode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    description?: string;
  }>;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  paymentTerms?: string;
  incoterms?: string;
  notes?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export function PurchaseOrderDetailPage() {
  const { poId } = useParams({ from: '/suppliers/purchase-orders/$poId' });
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [acknowledgeDialogOpen, setAcknowledgeDialogOpen] = useState(false);

  const { data: po, isLoading, error } = useQuery({
    queryKey: ['purchase-orders', poId],
    queryFn: () => supplierApi.getPurchaseOrderById(poId),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: po?.currency || 'USD',
    }).format(amount);
  };

  const formatAddress = (address: any) => {
    if (!address) return 'N/A';
    return `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`;
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

  if (error || !po) {
    return (
      <div className="text-center py-8 text-destructive">
        Failed to load purchase order details.
      </div>
    );
  }

  const canAcknowledge = po.status === 'sent';
  const canUpdateStatus = ['acknowledged', 'confirmed', 'partial'].includes(po.status);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: '/suppliers/purchase-orders' })}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{po.poNumber}</h1>
              <p className="text-muted-foreground">Purchase Order Details</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <StatusBadge status={po.status as any} />
            {canAcknowledge && (
              <Button onClick={() => setAcknowledgeDialogOpen(true)}>
                <Check className="mr-2 h-4 w-4" />
                Acknowledge
              </Button>
            )}
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Order Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">PO Date</p>
                <p className="font-medium">
                  {format(new Date(po.poDate), 'MMM dd, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivery Date</p>
                <p className="font-medium">
                  {format(new Date(po.deliveryDate), 'MMM dd, yyyy')}
                </p>
              </div>
              {po.paymentTerms && (
                <div>
                  <p className="text-sm text-muted-foreground">Payment Terms</p>
                  <p className="font-medium">{po.paymentTerms}</p>
                </div>
              )}
              {po.incoterms && (
                <div>
                  <p className="text-sm text-muted-foreground">Incoterms</p>
                  <Badge variant="outline">{po.incoterms}</Badge>
                </div>
              )}
              {po.acknowledgedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Acknowledged</p>
                  <p className="font-medium">
                    {format(new Date(po.acknowledgedAt), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Financial Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(po.subtotal)}</span>
              </div>
              {po.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tax</span>
                  <span className="font-medium">{formatCurrency(po.taxAmount)}</span>
                </div>
              )}
              {po.shippingAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Shipping</span>
                  <span className="font-medium">{formatCurrency(po.shippingAmount)}</span>
                </div>
              )}
              {po.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="text-sm">Discount</span>
                  <span className="font-medium">-{formatCurrency(po.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-4 border-t">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-lg font-bold">{formatCurrency(po.totalAmount)}</span>
              </div>
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
            {po.notes && (
              <TabsTrigger value="notes">Notes</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="items">
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
                <CardDescription>
                  {po.items.length} item{po.items.length !== 1 ? 's' : ''} in this order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Code</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {po.items.map((item) => (
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
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.totalPrice)}
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
                  <CardTitle>Delivery Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-line">
                    {formatAddress(po.deliveryAddress)}
                  </p>
                </CardContent>
              </Card>
              {po.billingAddress && (
                <Card>
                  <CardHeader>
                    <CardTitle>Billing Address</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-line">
                      {formatAddress(po.billingAddress)}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {po.notes && (
            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-line">{po.notes}</p>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <POAcknowledgmentForm
        poId={poId}
        open={acknowledgeDialogOpen}
        onOpenChange={setAcknowledgeDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['purchase-orders', poId] });
        }}
      />
    </>
  );
}

