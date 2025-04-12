import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Trophy, UserCheck, UserCog } from 'lucide-react';

interface AdminStatsPanelProps {
  stats?: {
    totalTeams: number;
    totalUsers: number;
    usersByRole: {
      superuser: number;
      admin: number;
      coach: number;
      player: number;
    };
  };
}

export default function AdminStatsPanel({ stats }: AdminStatsPanelProps) {
  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No stats available</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalTeams}</div>
          <p className="text-xs text-muted-foreground">
            Active teams in the system
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
          <p className="text-xs text-muted-foreground">
            Registered accounts
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Administrators</CardTitle>
          <UserCog className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.usersByRole.admin + stats.usersByRole.superuser}</div>
          <p className="text-xs text-muted-foreground">
            Admin users ({stats.usersByRole.superuser} superusers)
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Coaches & Players</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.usersByRole.coach + stats.usersByRole.player}</div>
          <p className="text-xs text-muted-foreground">
            {stats.usersByRole.coach} coaches, {stats.usersByRole.player} players
          </p>
        </CardContent>
      </Card>
      
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">User Distribution</p>
                <ul className="text-sm">
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Superusers:</span>
                    <span>{stats.usersByRole.superuser}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Admins:</span>
                    <span>{stats.usersByRole.admin}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Coaches:</span>
                    <span>{stats.usersByRole.coach}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Players:</span>
                    <span>{stats.usersByRole.player}</span>
                  </li>
                </ul>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium">System Statistics</p>
                <ul className="text-sm">
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Teams:</span>
                    <span>{stats.totalTeams}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Users:</span>
                    <span>{stats.totalUsers}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-muted-foreground">Avg. Users per Team:</span>
                    <span>
                      {stats.totalTeams ? (stats.totalUsers / stats.totalTeams).toFixed(1) : 'N/A'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}