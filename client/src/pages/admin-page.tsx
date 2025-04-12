import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, LogOut } from "lucide-react";
import UsersPanel from "@/components/admin/users-panel";
import TeamsPanel from "@/components/admin/teams-panel";
import { Link } from "wouter";

export default function AdminPage() {
  const { user, isAuthenticated, isLoading, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("users");
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button 
          variant="outline" 
          className="flex items-center gap-2" 
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          Logout
        </Button>
      </div>
      <div className="mb-8">
        <p className="text-muted-foreground">
          Manage teams, users, and system settings from this central admin dashboard.
        </p>
        {user && (
          <p className="text-sm font-medium mt-2">
            Logged in as: <span className="text-primary">{user.fullName}</span> (Superuser)
          </p>
        )}
      </div>

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