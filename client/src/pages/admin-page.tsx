import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import AdminTeamsPanel from '@/components/admin/teams-panel';
import AdminUsersPanel from '@/components/admin/users-panel';
import AdminStatsPanel from '@/components/admin/stats-panel';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isAuthenticated, user } = useAuth();

  // Fetch admin stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/admin/stats'],
    enabled: isAuthenticated && user?.role === 'superuser'
  });

  // If not authenticated or not a superuser, show unauthorized message
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Unauthorized</CardTitle>
            <CardDescription>Please log in to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (user?.role !== 'superuser') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access the admin panel.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage teams, users, and configurations</p>
        </div>
      </div>

      <Separator className="my-6" />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {isLoadingStats ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <AdminStatsPanel stats={stats} />
          )}
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <AdminTeamsPanel />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <AdminUsersPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}