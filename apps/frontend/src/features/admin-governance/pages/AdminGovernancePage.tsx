import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminAccountsPanel } from './AdminAccountsPanel';
import { AuditLogPanel } from './AuditLogPanel';
import { CustomFieldsPanel } from './CustomFieldsPanel';
import { BulkActionsPanel } from './BulkActionsPanel';
import { AutoSuspendRulesPanel } from './AutoSuspendRulesPanel';

export function AdminGovernancePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Admin & platform governance</h1>
        <p className="text-sm text-muted-foreground">
          Staff accounts, platform-wide audit trail, custom fields, bulk actions, and automation rules.
        </p>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Staff accounts</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
          <TabsTrigger value="custom-fields">Custom fields</TabsTrigger>
          <TabsTrigger value="bulk">Bulk actions</TabsTrigger>
          <TabsTrigger value="automation">Automation rules</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts">
          <AdminAccountsPanel />
        </TabsContent>
        <TabsContent value="audit">
          <AuditLogPanel />
        </TabsContent>
        <TabsContent value="custom-fields">
          <CustomFieldsPanel />
        </TabsContent>
        <TabsContent value="bulk">
          <BulkActionsPanel />
        </TabsContent>
        <TabsContent value="automation">
          <AutoSuspendRulesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
