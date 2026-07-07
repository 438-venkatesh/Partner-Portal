import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PartnerTrainingPage } from './PartnerTrainingPage';
import { PartnerPlaybooksPage } from './PartnerPlaybooksPage';
import { PartnerAssetsPage } from './PartnerAssetsPage';

export function PartnerEnablementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Enablement</h1>
        <p className="text-muted-foreground">Training &amp; certification, sales playbooks, and marketing assets.</p>
      </div>

      <Tabs defaultValue="training">
        <TabsList>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
        </TabsList>
        <TabsContent value="training" className="mt-4">
          <PartnerTrainingPage />
        </TabsContent>
        <TabsContent value="playbooks" className="mt-4">
          <PartnerPlaybooksPage />
        </TabsContent>
        <TabsContent value="assets" className="mt-4">
          <PartnerAssetsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
