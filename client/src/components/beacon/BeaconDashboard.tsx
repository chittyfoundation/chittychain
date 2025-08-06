import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Activity, Server, Monitor, Globe, Clock, GitBranch, Bot, AlertCircle } from "lucide-react";

interface BeaconRecord {
  id: string;
  name: string;
  version: string;
  platform: string;
  environment: string;
  has_claude_code: boolean;
  has_git: boolean;
  event: 'startup' | 'heartbeat' | 'shutdown' | 'custom';
  timestamp: string;
  uptime?: number;
  git?: {
    branch: string;
    commit: string;
    remote: string;
  };
  replit?: {
    id: string;
    slug: string;
    owner: string;
    url: string;
  };
  last_seen: string;
}

interface BeaconStats {
  total_beacons: number;
  active_apps: number;
  platforms: Record<string, number>;
  recent_activity: number;
}

export function BeaconDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/beacon/stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/beacon/history'],
    refetchInterval: 30000,
  });

  const { data: healthData } = useQuery({
    queryKey: ['/api/beacon/health'],
    refetchInterval: 60000, // Check health every minute
  });

  const beaconStats = stats as BeaconStats | undefined;
  const beacons = (historyData as { beacons: BeaconRecord[] } | undefined)?.beacons || [];
  const healthInfo = healthData as any;
  const isHealthy = healthInfo?.status === 'ok' && healthInfo?.enabled;

  const formatUptime = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'replit': return '🔴';
      case 'github-actions': return '🐙';
      case 'vercel': return '▲';
      case 'netlify': return '🟢';
      case 'heroku': return '🟣';
      case 'aws-lambda': return '🟠';
      default: return '🖥️';
    }
  };

  const getEventColor = (event: string) => {
    switch (event) {
      case 'startup': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'heartbeat': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'shutdown': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'custom': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (statsLoading || historyLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            ChittyBeacon Tracking
          </h2>
          <p className="text-muted-foreground">
            Real-time app monitoring and platform detection across the ChittyChain ecosystem
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isHealthy ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              <Activity className="w-3 h-3 mr-1" />
              Active
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="w-3 h-3 mr-1" />
              Inactive
            </Badge>
          )}
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{beaconStats?.total_beacons || 0}</p>
                <p className="text-sm text-muted-foreground">Total Beacons</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{beaconStats?.active_apps || 0}</p>
                <p className="text-sm text-muted-foreground">Active Apps</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{Object.keys(beaconStats?.platforms || {}).length}</p>
                <p className="text-sm text-muted-foreground">Platforms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{beaconStats?.recent_activity || 0}</p>
                <p className="text-sm text-muted-foreground">Recent Activity (1h)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Distribution */}
      {beaconStats?.platforms && Object.keys(beaconStats.platforms).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Platform Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(beaconStats.platforms).map(([platform, count]) => (
                <div key={platform} className="flex items-center gap-2">
                  <span className="text-xl">{getPlatformIcon(platform)}</span>
                  <div>
                    <p className="font-medium capitalize">{platform.replace('-', ' ')}</p>
                    <p className="text-sm text-muted-foreground">{count} beacons</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Beacon Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Beacon Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {beacons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No beacon activity detected yet</p>
              <p className="text-sm">Apps will appear here once they start sending tracking data</p>
            </div>
          ) : (
            beacons.slice(0, 10).map((beacon, index) => (
              <div key={`${beacon.id}-${index}`} className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getPlatformIcon(beacon.platform)}</span>
                    <div>
                      <p className="font-medium">{beacon.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>v{beacon.version}</span>
                        <span>•</span>
                        <span>{beacon.platform}</span>
                        {beacon.has_claude_code && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Bot className="w-3 h-3" />
                              <span>Claude</span>
                            </div>
                          </>
                        )}
                        {beacon.has_git && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <GitBranch className="w-3 h-3" />
                              <span>Git</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge className={getEventColor(beacon.event)}>
                    {beacon.event}
                  </Badge>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{new Date(beacon.timestamp).toLocaleTimeString()}</p>
                    {beacon.uptime && (
                      <p>Uptime: {formatUptime(beacon.uptime)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* App Details */}
      {healthInfo?.app && (
        <Card>
          <CardHeader>
            <CardTitle>Current App Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">App Details</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Name:</span> {healthInfo.app.name}</p>
                  <p><span className="font-medium">Version:</span> {healthInfo.app.version}</p>
                  <p><span className="font-medium">Platform:</span> {healthInfo.app.platform}</p>
                  <p><span className="font-medium">Environment:</span> {healthInfo.app.environment}</p>
                  <p><span className="font-medium">Node Version:</span> {healthInfo.app.node_version}</p>
                </div>
              </div>
              
              {healthInfo.app.git && (
                <div>
                  <h4 className="font-semibold mb-2">Git Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Branch:</span> {healthInfo.app.git.branch}</p>
                    <p><span className="font-medium">Commit:</span> {healthInfo.app.git.commit}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}