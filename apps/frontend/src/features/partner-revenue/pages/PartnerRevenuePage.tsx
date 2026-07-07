import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PartnerDealsPage } from './PartnerDealsPage';
import { PartnerLeadsPage } from './PartnerLeadsPage';
import { PartnerCommissionsPage } from './PartnerCommissionsPage';
import { PartnerMdfPage } from './PartnerMdfPage';

export function PartnerRevenuePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Deals &amp; revenue</h1>
        <p className="text-muted-foreground">Register deals, track leads, and see what you've earned.</p>
      </div>

      <Tabs defaultValue="deals">
        <TabsList>
          <TabsTrigger value="deals">My deals</TabsTrigger>
          <TabsTrigger value="leads">My leads</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="mdf">MDF</TabsTrigger>
        </TabsList>
        <TabsContent value="deals" className="mt-4">
          <PartnerDealsPage />
        </TabsContent>
        <TabsContent value="leads" className="mt-4">
          <PartnerLeadsPage />
        </TabsContent>
        <TabsContent value="commissions" className="mt-4">
          <PartnerCommissionsPage />
        </TabsContent>
        <TabsContent value="mdf" className="mt-4">
          <PartnerMdfPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
