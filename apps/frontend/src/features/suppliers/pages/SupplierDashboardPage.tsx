import { SummaryCard } from '@/components/ui/summary-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, DollarSign, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export function SupplierDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Dashboard</h1>
          <p className="text-muted-foreground">Manage purchase orders and supplier operations</p>
        </div>
        <Link to="/suppliers/purchase-orders">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            View All Orders
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          title="Total Orders"
          value={0}
          icon={FileText}
          iconColor="text-blue-600"
        />
        <SummaryCard
          title="Pending"
          value={0}
          icon={Clock}
          iconColor="text-yellow-600"
        />
        <SummaryCard
          title="Completed"
          value={0}
          icon={CheckCircle2}
          iconColor="text-green-600"
        />
        <SummaryCard
          title="Revenue"
          value="$0"
          icon={DollarSign}
          iconColor="text-green-600"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Purchase Orders</CardTitle>
            <CardDescription>Latest purchase orders from clients</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No purchase orders yet.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Catalog</CardTitle>
            <CardDescription>Manage your product catalog</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/partner-operations" search={{ tab: 'catalog' }}>
                Supplier product catalog
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

