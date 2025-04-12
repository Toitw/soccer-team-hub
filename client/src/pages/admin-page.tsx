import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Loader2, ShieldAlert } from "lucide-react";
import UsersPanel from "@/components/admin/users-panel";
import TeamsPanel from "@/components/admin/teams-panel";
import { Link } from "wouter";

export default function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("users");

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect if not authenticated or not a superuser
  if (!isAuthenticated || (user && user.role !== "superuser")) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground mb-4">
          You don't have permission to access the admin panel.
        </p>
        <Link href="/" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        Manage teams, users, and system settings from this central admin dashboard.
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="users">Users Management</TabsTrigger>
          <TabsTrigger value="teams">Teams Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <UsersPanel />
        </TabsContent>
        
        <TabsContent value="teams" className="space-y-4">
          <TeamsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}