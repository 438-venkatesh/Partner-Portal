import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServiceCatalogAdminPage } from './ServiceCatalogAdminPage';
import { TrainingAdminPage } from './TrainingAdminPage';
import { PlaybooksAdminPage } from './PlaybooksAdminPage';
import { AssetsAdminPage } from './AssetsAdminPage';

export function EnablementAdminPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Partner enablement</h1>
        <p className="text-sm text-muted-foreground">
          Service catalog, training &amp; certification, sales playbooks, and the marketing asset library.
        </p>
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Service catalog</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
        </TabsList>
        <TabsContent value="catalog" className="mt-4">
          <ServiceCatalogAdminPage />
        </TabsContent>
        <TabsContent value="training" className="mt-4">
          <TrainingAdminPage />
        </TabsContent>
        <TabsContent value="playbooks" className="mt-4">
          <PlaybooksAdminPage />
        </TabsContent>
        <TabsContent value="assets" className="mt-4">
          <AssetsAdminPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
