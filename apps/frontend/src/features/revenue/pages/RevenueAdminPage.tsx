import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DealsAdminPage } from './DealsAdminPage';
import { LeadsAdminPage } from './LeadsAdminPage';
import { CommissionsAdminPage } from './CommissionsAdminPage';
import { MdfAdminPage } from './MdfAdminPage';

export function RevenueAdminPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Deals &amp; revenue</h1>
        <p className="text-sm text-muted-foreground">
          Deal registration, lead routing, commissions, payouts, and market development funds.
        </p>
      </div>

      <Tabs defaultValue="deals">
        <TabsList>
          <TabsTrigger value="deals">Deal registration</TabsTrigger>
          <TabsTrigger value="leads">Leads &amp; routing</TabsTrigger>
          <TabsTrigger value="commissions">Commissions &amp; payouts</TabsTrigger>
          <TabsTrigger value="mdf">MDF</TabsTrigger>
        </TabsList>
        <TabsContent value="deals" className="mt-4">
          <DealsAdminPage />
        </TabsContent>
        <TabsContent value="leads" className="mt-4">
          <LeadsAdminPage />
        </TabsContent>
        <TabsContent value="commissions" className="mt-4">
          <CommissionsAdminPage />
        </TabsContent>
        <TabsContent value="mdf" className="mt-4">
          <MdfAdminPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
