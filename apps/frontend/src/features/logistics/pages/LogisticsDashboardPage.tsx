import { SummaryCard } from '@/components/ui/summary-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Package, CheckCircle2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export function LogisticsDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logistics Dashboard</h1>
          <p className="text-muted-foreground">Manage shipments and logistics operations</p>
        </div>
        <Link to="/logistics/shipments">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            View All Shipments
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          title="Active Shipments"
          value={0}
          icon={Truck}
          iconColor="text-blue-600"
        />
        <SummaryCard
          title="Delivered"
          value={0}
          icon={CheckCircle2}
          iconColor="text-green-600"
        />
        <SummaryCard
          title="In Transit"
          value={0}
          icon={Package}
          iconColor="text-yellow-600"
        />
        <SummaryCard
          title="SLA Compliance"
          value="100%"
          icon={TrendingUp}
          iconColor="text-green-600"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Shipments</CardTitle>
            <CardDescription>Latest shipment requests</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No shipments yet.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fleet Status</CardTitle>
            <CardDescription>Vehicle and driver availability</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Manage Fleet
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

