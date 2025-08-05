import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Network, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  Users,
  FileText,
  Scale,
  ExternalLink
} from 'lucide-react';

interface PlatformStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  lastSync: string;
  dataPoints: number;
  integrationHealth: number;
}

interface CrossPlatformInsight {
  id: string;
  type: 'pattern' | 'anomaly' | 'correlation' | 'recommendation';
  title: string;
  description: string;
  platforms: string[];
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
}

export function CrossPlatformAnalysis() {
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);

  const platformStatuses: PlatformStatus[] = [
    {
      name: 'ChittyChainLedger',
      status: 'connected',
      lastSync: '2 minutes ago',
      dataPoints: 1247,
      integrationHealth: 0.95
    },
    {
      name: 'ChittyTrust',
      status: 'connected',
      lastSync: '5 minutes ago',
      dataPoints: 834,
      integrationHealth: 0.89
    },
    {
      name: 'ChittyVerify',
      status: 'syncing',
      lastSync: '15 minutes ago',
      dataPoints: 456,
      integrationHealth: 0.72
    },
    {
      name: 'ChittyResolution',
      status: 'disconnected',
      lastSync: '2 hours ago',
      dataPoints: 23,
      integrationHealth: 0.31
    }
  ];

  const crossPlatformInsights: CrossPlatformInsight[] = [
    {
      id: 'insight_001',
      type: 'correlation',
      title: 'Trust Score Correlation with Evidence Authenticity',
      description: 'Strong correlation (r=0.87) between ChittyTrust reputation scores and ChittyVerify authenticity ratings across 234 evidence items.',
      platforms: ['ChittyTrust', 'ChittyVerify'],
      confidence: 0.87,
      impact: 'high',
      actionable: true
    },
    {
      id: 'insight_002',
      type: 'pattern',
      title: 'Cross-Platform Evidence Clustering',
      description: 'Similar evidence patterns detected across ChittyChain and ChittyChainLedger, suggesting coordinated case building.',
      platforms: ['ChittyChain', 'ChittyChainLedger'],
      confidence: 0.74,
      impact: 'medium',
      actionable: true
    },
    {
      id: 'insight_003',
      type: 'anomaly',
      title: 'Trust Score Anomaly in Recent Submissions',
      description: 'Unusual trust score distribution in last 48 hours across multiple platforms may indicate coordinated activity.',
      platforms: ['ChittyTrust', 'ChittyChain', 'ChittyVerify'],
      confidence: 0.91,
      impact: 'critical',
      actionable: true
    },
    {
      id: 'insight_004',
      type: 'recommendation',
      title: 'Enhanced Cross-Platform Verification',
      description: 'Recommend implementing additional verification steps between ChittyVerify and ChittyTrust for high-value evidence.',
      platforms: ['ChittyVerify', 'ChittyTrust'],
      confidence: 0.83,
      impact: 'medium',
      actionable: true
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'syncing':
        return 'text-yellow-600';
      case 'disconnected':
        return 'text-gray-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'syncing':
        return 'bg-yellow-100 text-yellow-800';
      case 'disconnected':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern':
        return <TrendingUp className="h-4 w-4" />;
      case 'anomaly':
        return <AlertTriangle className="h-4 w-4" />;
      case 'correlation':
        return <Network className="h-4 w-4" />;
      case 'recommendation':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cross-Platform Analysis</h1>
          <p className="text-muted-foreground">
            AI-powered insights across the ChittyChain ecosystem
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-green-600">
            <Network className="h-3 w-3 mr-1" />
            {platformStatuses.filter(p => p.status === 'connected').length}/{platformStatuses.length} Connected
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="platforms" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="platforms">Platform Status</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="correlations">Correlations</TabsTrigger>
        </TabsList>

        {/* Platform Status Tab */}
        <TabsContent value="platforms" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {platformStatuses.map((platform) => (
              <Card key={platform.name}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{platform.name}</CardTitle>
                    <Badge className={getStatusBadge(platform.status)}>
                      {platform.status}
                    </Badge>
                  </div>
                  <CardDescription>Last sync: {platform.lastSync}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Integration Health</span>
                      <span className={`font-semibold ${getStatusColor(platform.status)}`}>
                        {(platform.integrationHealth * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress 
                      value={platform.integrationHealth * 100} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Data Points: {platform.dataPoints.toLocaleString()}</span>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Platform
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Alert>
            <Network className="h-4 w-4" />
            <AlertTitle>Ecosystem Health</AlertTitle>
            <AlertDescription>
              {platformStatuses.filter(p => p.status === 'connected').length} of {platformStatuses.length} platforms are fully operational. 
              Cross-platform analysis is {platformStatuses.filter(p => p.status === 'connected').length >= 2 ? 'active' : 'limited'}.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="space-y-4">
            {crossPlatformInsights.map((insight) => (
              <Card key={insight.id} className={selectedInsight === insight.id ? 'ring-2 ring-blue-500' : ''}>
                <CardHeader 
                  className="cursor-pointer" 
                  onClick={() => setSelectedInsight(selectedInsight === insight.id ? null : insight.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getInsightIcon(insight.type)}
                      <CardTitle className="text-lg">{insight.title}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getImpactBadge(insight.impact)}>
                        {insight.impact}
                      </Badge>
                      <span className="text-sm font-semibold text-green-600">
                        {(insight.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <CardDescription>{insight.description}</CardDescription>
                </CardHeader>
                
                {selectedInsight === insight.id && (
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Involved Platforms</h4>
                        <div className="flex flex-wrap gap-2">
                          {insight.platforms.map((platform, idx) => (
                            <Badge key={idx} variant="outline">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant={insight.type === 'anomaly' ? 'destructive' : 'default'}>
                            {insight.type}
                          </Badge>
                          {insight.actionable && (
                            <Badge variant="outline" className="text-green-600">
                              Actionable
                            </Badge>
                          )}
                        </div>
                        
                        {insight.actionable && (
                          <div className="space-x-2">
                            <Button size="sm" variant="outline">
                              Investigate
                            </Button>
                            <Button size="sm">
                              Take Action
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Correlations Tab */}
        <TabsContent value="correlations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Trust vs. Authenticity</span>
                </CardTitle>
                <CardDescription>Correlation between trust scores and verification</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Correlation Strength</span>
                    <span className="font-semibold text-green-600">r = 0.87</span>
                  </div>
                  <Progress value={87} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    Strong positive correlation between ChittyTrust scores and ChittyVerify authenticity ratings.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>User Behavior Patterns</span>
                </CardTitle>
                <CardDescription>Cross-platform user activity analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Pattern Consistency</span>
                    <span className="font-semibold text-blue-600">74%</span>
                  </div>
                  <Progress value={74} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    User behavior patterns are consistent across platforms, indicating genuine usage.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Scale className="h-5 w-5" />
                  <span>Case Resolution Efficiency</span>
                </CardTitle>
                <CardDescription>Resolution success vs. evidence quality</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Success Correlation</span>
                    <span className="font-semibold text-green-600">r = 0.92</span>
                  </div>
                  <Progress value={92} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    Higher evidence quality scores correlate strongly with successful case resolutions.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Security Incident Detection</span>
                </CardTitle>
                <CardDescription>Cross-platform anomaly detection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Detection Accuracy</span>
                    <span className="font-semibold text-orange-600">89%</span>
                  </div>
                  <Progress value={89} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    AI-powered anomaly detection successfully identifies 89% of security incidents across platforms.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}