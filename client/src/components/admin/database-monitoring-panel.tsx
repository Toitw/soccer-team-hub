import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  Database, 
  AlertCircle, 
  CheckCircle2, 
  Server,
  FileJson,
  Clock,
  HardDrive
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

type DatabaseHealthResponse = {
  status: 'connected' | 'error';
  message: string;
  timestamp: string;
  stats?: {
    connectionPool?: {
      totalCount: number;
      idleCount: number;
      waitingCount: number;
    };
    database?: {
      database_name: string;
      database_size: string;
      active_connections: number;
    };
  };
  performance?: {
    responseTimeMs: number;
    status: 'good' | 'fair' | 'slow';
  };
  schema?: {
    tablesExist: boolean;
    totalTables: number;
    missingTables: string[] | null;
  };
  error?: string;
};

export default function DatabaseMonitoringPanel() {
  const { toast } = useToast();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch database health information
  const { 
    data: dbHealth, 
    isLoading, 
    refetch, 
    error,
    isError
  } = useQuery<DatabaseHealthResponse>({
    queryKey: ['/api/admin/database/health'],
    queryFn: () => apiRequest('/api/admin/database/health'),
    refetchInterval: 30000, // Auto refetch every 30 seconds
  });
  
  // Set last refresh time when data is refreshed
  useEffect(() => {
    if (dbHealth) {
      setLastRefresh(new Date());
    }
  }, [dbHealth]);

  // Handle manual refresh
  const handleRefresh = () => {
    refetch();
    toast({
      titleKey: 'toasts.refreshing',
      descriptionKey: 'toasts.refreshingDesc',
    });
  };

  // Calculate connection pool usage percentage
  const getConnectionPoolUsage = () => {
    if (!dbHealth?.stats?.connectionPool) return 0;
    const { totalCount, idleCount, waitingCount } = dbHealth.stats.connectionPool;
    const usedConnections = totalCount - idleCount;
    return Math.round((usedConnections / totalCount) * 100);
  };

  // Color for performance status
  const getPerformanceColor = () => {
    if (!dbHealth?.performance) return 'text-gray-500';
    
    switch (dbHealth.performance.status) {
      case 'good': return 'text-green-500';
      case 'fair': return 'text-yellow-500';
      case 'slow': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  // Get status badge type based on database status
  const getStatusBadge = () => {
    if (!dbHealth) return { variant: 'outline' as const, text: 'Unknown' };
    
    if (dbHealth.status === 'connected') {
      return { variant: 'default' as const, text: 'Healthy' };
    } else {
      return { variant: 'destructive' as const, text: 'Error' };
    }
  };

  // Error or loading state
  if (isError) {
    return (
      <div className="space-y-4">
        <Card className="border-destructive">
          <CardHeader className="bg-destructive/10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl flex items-center gap-2">
                <AlertCircle className="text-destructive h-6 w-6" />
                Database Monitoring Error
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error fetching database health</AlertTitle>
              <AlertDescription>
                {error instanceof Error 
                  ? error.message 
                  : 'Unable to connect to the database monitoring service'
                }
              </AlertDescription>
            </Alert>
            <p className="mt-4 text-sm text-muted-foreground">
              This could indicate issues with database connectivity or 
              insufficient permissions to access the monitoring endpoint.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Database Monitoring</CardTitle>
            </div>
            <CardDescription>
              Loading database health and performance metrics...
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 text-center py-10">
            <RefreshCw className="h-10 w-10 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Fetching database statistics...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Database className="h-6 w-6" />
              Database Monitoring
            </CardTitle>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
          <CardDescription>
            Monitor database health, performance, and schema status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Status Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
                {dbHealth?.status === 'connected' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant={getStatusBadge().variant}>
                    {getStatusBadge().text}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Last updated {formatDistanceToNow(lastRefresh)} ago
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {dbHealth?.message || 'No status message available'}
                </p>
              </CardContent>
            </Card>

            {/* Connection Pool Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Connection Pool</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dbHealth?.stats?.connectionPool 
                    ? `${dbHealth.stats.connectionPool.totalCount - dbHealth.stats.connectionPool.idleCount}/${dbHealth.stats.connectionPool.totalCount}`
                    : 'N/A'
                  }
                </div>
                <div className="mt-2">
                  <Progress value={getConnectionPoolUsage()} className="h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {dbHealth?.stats?.connectionPool 
                      ? `${dbHealth.stats.connectionPool.waitingCount} queued, ${dbHealth.stats.connectionPool.idleCount} idle`
                      : 'Connection pool information unavailable'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Performance Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Query Performance</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getPerformanceColor()}`}>
                  {dbHealth?.performance 
                    ? `${dbHealth.performance.responseTimeMs} ms`
                    : 'N/A'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  {dbHealth?.performance 
                    ? `Performance is ${dbHealth.performance.status}`
                    : 'Performance metrics unavailable'
                  }
                </p>
              </CardContent>
            </Card>

            {/* Database Size Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database Size</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dbHealth?.stats?.database?.database_size || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dbHealth?.stats?.database
                    ? `${dbHealth.stats.database.active_connections} active connections`
                    : 'Size information unavailable'
                  }
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              Schema Status
            </h3>
            {dbHealth?.schema ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium">Schema Validation</span>
                    {dbHealth.schema.tablesExist ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        All Required Tables Present
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        Missing Tables
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Total tables: <span className="font-medium">{dbHealth.schema.totalTables}</span>
                      </p>
                    </div>
                    
                    {dbHealth.schema.missingTables && dbHealth.schema.missingTables.length > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        <AlertTitle>Missing Tables Detected</AlertTitle>
                        <AlertDescription>
                          The following tables are missing from the schema:
                          <ul className="list-disc pl-5 mt-2 space-y-1">
                            {dbHealth.schema.missingTables.map(table => (
                              <li key={table} className="text-sm">{table}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-4">
                  <p className="text-muted-foreground text-center">
                    Schema information unavailable
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <div className="flex justify-between items-center w-full text-xs text-muted-foreground">
            <span>Database: {dbHealth?.stats?.database?.database_name || 'Unknown'}</span>
            <span>Last refreshed: {new Date(lastRefresh).toLocaleTimeString()}</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}