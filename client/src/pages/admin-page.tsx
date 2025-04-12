import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
// We're importing default exports from the components
// Import with regular name as this doesn't use named exports
import TeamsPanel from '../components/admin/teams-panel';
import UsersPanel from '../components/admin/users-panel';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function AdminPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<string>('teams');

  // Redirect non-superusers
  if (!user || user.role !== 'superuser') {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Card className="w-[450px]">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              This page is restricted to superusers only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-muted-foreground">
              Manage teams, users and system settings
            </p>
          </div>
        </div>
        <Badge variant="destructive" className="text-md px-3 py-1">
          Superuser Access
        </Badge>
      </div>

      <Separator className="mb-6" />

      <Tabs 
        defaultValue="teams"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="teams">Teams Management</TabsTrigger>
          <TabsTrigger value="users">Users Management</TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-4">
          <TeamsPanel />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UsersPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}