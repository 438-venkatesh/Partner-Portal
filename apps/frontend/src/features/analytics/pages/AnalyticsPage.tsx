import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminAnalyticsDashboardPage } from './AdminAnalyticsDashboardPage';
import { ReportsPage } from './ReportsPage';

export function AnalyticsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Cross-partner revenue, funnel, and MDF ROI — live-updating as deals resolve and payouts
          are made. Export any entity to CSV under Reports.
        </p>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4">
          <AdminAnalyticsDashboardPage />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <ReportsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
