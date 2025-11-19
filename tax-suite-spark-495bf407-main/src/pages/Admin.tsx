import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AuditLogsTable } from "@/components/admin/AuditLogsTable";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { UsersTable } from "@/components/admin/UsersTable";
import { PermissionMatrix } from "@/components/admin/PermissionMatrix";
import { InviteUserDialog } from "@/components/admin/InviteUserDialog";
import { SendNotificationDialog } from "@/components/admin/SendNotificationDialog";
import { Shield, UserPlus, Bell } from "lucide-react";

const Admin = () => {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">
            System administration and audit logs
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="settings" disabled>
            System Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <AdminOverview />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <AuditLogsTable />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">User Management</h2>
              <p className="text-muted-foreground">
                Manage user roles and permissions
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowNotificationDialog(true)}>
                <Bell className="mr-2 h-4 w-4" />
                Send Notification
              </Button>
              <Button onClick={() => setShowInviteDialog(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite User
              </Button>
            </div>
          </div>
          <UsersTable />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <PermissionMatrix />
        </TabsContent>

        <TabsContent value="settings">
          <div className="text-center py-12 text-muted-foreground">
            System settings coming soon
          </div>
        </TabsContent>
      </Tabs>

      <InviteUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
      />
      
      <SendNotificationDialog
        open={showNotificationDialog}
        onOpenChange={setShowNotificationDialog}
      />
    </div>
  );
};

export default Admin;
