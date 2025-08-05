import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Brain, 
  Search, 
  Calendar, 
  Link, 
  FileText, 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  Users,
  Clock,
  TrendingUp,
  Network
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

interface AICapabilities {
  models: {
    text: { primary: string; backup: string; capabilities: string[] };
    image: { primary: string; backup: string; capabilities: string[] };
    audio: { primary: string; capabilities: string[] };
  };
  analysisTypes: string[];
  patternTypes: string[];
  legalFeatures: string[];
  maxEvidenceItems: number;
  apiKeysConfigured: {
    anthropic: boolean;
    openai: boolean;
  };
}

interface EvidenceAnalysisResult {
  analysisId: string;
  evidenceId: string;
  confidence: number;
  findings: Array<{
    type: string;
    description: string;
    confidence: number;
    significance: 'low' | 'medium' | 'high' | 'critical';
  }>;
  metadata: {
    processingTime: number;
    modelUsed: string;
    analysisDepth: string;
  };
}

interface PatternDetectionResult {
  patterns: Array<{
    type: string;
    confidence: number;
    description: string;
    evidenceIds: string[];
    legalSignificance: string;
  }>;
  clusters: Array<{
    id: string;
    name: string;
    evidenceItems: string[];
    significance: string;
  }>;
  anomalies: Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    recommendation: string;
  }>;
}

export function AIAnalysisDashboard() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [recentAnalyses, setRecentAnalyses] = useState<EvidenceAnalysisResult[]>([]);
  const [patternResults, setPatternResults] = useState<PatternDetectionResult | null>(null);

  // Fetch AI capabilities
  const { data: capabilities, isLoading: capabilitiesLoading } = useQuery<AICapabilities>({
    queryKey: ['/api/v1/ai-analysis/capabilities'],
    retry: false,
  });

  // Mock recent analyses for demonstration
  useEffect(() => {
    const mockAnalyses: EvidenceAnalysisResult[] = [
      {
        analysisId: 'analysis_001',
        evidenceId: 'evidence_001',
        confidence: 0.923,
        findings: [
          {
            type: 'entity_extraction',
            description: '3 persons, 2 organizations identified',
            confidence: 0.95,
            significance: 'high'
          },
          {
            type: 'document_classification',
            description: 'Legal contract (commercial agreement)',
            confidence: 0.97,
            significance: 'high'
          },
          {
            type: 'authenticity_check',
            description: 'Digital signatures verified, no tampering detected',
            confidence: 0.89,
            significance: 'critical'
          }
        ],
        metadata: {
          processingTime: 1247,
          modelUsed: 'claude-sonnet-4-20250514',
          analysisDepth: 'comprehensive'
        }
      },
      {
        analysisId: 'analysis_002',
        evidenceId: 'evidence_002',
        confidence: 0.847,
        findings: [
          {
            type: 'sentiment_analysis',
            description: 'Neutral tone, professional language',
            confidence: 0.82,
            significance: 'medium'
          },
          {
            type: 'legal_privilege',
            description: 'No attorney-client privilege detected',
            confidence: 0.91,
            significance: 'high'
          }
        ],
        metadata: {
          processingTime: 892,
          modelUsed: 'gpt-4o',
          analysisDepth: 'basic'
        }
      }
    ];

    const mockPatterns: PatternDetectionResult = {
      patterns: [
        {
          type: 'temporal',
          confidence: 0.921,
          description: 'Regular communication pattern every Tuesday at 2 PM',
          evidenceIds: ['evidence_001', 'evidence_002', 'evidence_004'],
          legalSignificance: 'Establishes routine business relationship'
        },
        {
          type: 'content',
          confidence: 0.875,
          description: 'Identical contract clauses in multiple documents',
          evidenceIds: ['evidence_001', 'evidence_003', 'evidence_005'],
          legalSignificance: 'Template usage or potential copy-paste'
        }
      ],
      clusters: [
        {
          id: 'cluster_a',
          name: 'Contract Documents',
          evidenceItems: ['evidence_001', 'evidence_003', 'evidence_005'],
          significance: 'High - Core contract dispute materials'
        },
        {
          id: 'cluster_b',
          name: 'Communications',
          evidenceItems: ['evidence_002', 'evidence_004'],
          significance: 'Medium - Supporting correspondence'
        }
      ],
      anomalies: [
        {
          id: 'anomaly_001',
          type: 'metadata_inconsistency',
          severity: 'medium',
          description: 'File creation time predates referenced events',
          recommendation: 'Verify document authenticity and creation timeline'
        }
      ]
    };

    setRecentAnalyses(mockAnalyses);
    setPatternResults(mockPatterns);
  }, []);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSignificanceBadge = (significance: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[significance as keyof typeof colors] || colors.medium;
  };

  if (capabilitiesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Brain className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading AI Analysis System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Evidence Analysis</h1>
          <p className="text-muted-foreground">
            Advanced AI-powered analysis for legal evidence processing
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {capabilities?.apiKeysConfigured.anthropic && (
            <Badge variant="outline" className="text-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Claude
            </Badge>
          )}
          {capabilities?.apiKeysConfigured.openai && (
            <Badge variant="outline" className="text-blue-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              GPT
            </Badge>
          )}
        </div>
      </div>

      {/* System Status Alert */}
      {capabilities && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>System Status</AlertTitle>
          <AlertDescription>
            AI analysis system is operational with {capabilities.analysisTypes.length} analysis types 
            and support for up to {capabilities.maxEvidenceItems} evidence items per analysis.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analysis">Evidence Analysis</TabsTrigger>
          <TabsTrigger value="patterns">Pattern Detection</TabsTrigger>
          <TabsTrigger value="crossplatform">Cross-Platform</TabsTrigger>
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">247</div>
                <p className="text-xs text-muted-foreground">
                  +23 from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Patterns Found</CardTitle>
                <Search className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">42</div>
                <p className="text-xs text-muted-foreground">
                  Across 15 cases
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">87.4%</div>
                <p className="text-xs text-muted-foreground">
                  +2.1% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Anomalies</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">
                  Requires review
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Analyses */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Evidence Analyses</CardTitle>
              <CardDescription>Latest AI analysis results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAnalyses.map((analysis) => (
                  <div key={analysis.analysisId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">{analysis.evidenceId}</span>
                        <Badge className={getSignificanceBadge('high')}>
                          {analysis.metadata.analysisDepth}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-semibold ${getConfidenceColor(analysis.confidence)}`}>
                          {(analysis.confidence * 100).toFixed(1)}%
                        </span>
                        <Badge variant="outline">{analysis.metadata.modelUsed.split('-')[0]}</Badge>
                      </div>
                    </div>
                    <div className="grid gap-2 text-sm">
                      {analysis.findings.map((finding, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span>{finding.description}</span>
                          <Badge className={getSignificanceBadge(finding.significance)}>
                            {finding.significance}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Processed in {analysis.metadata.processingTime}ms
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evidence Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Analysis Types</span>
                </CardTitle>
                <CardDescription>Available AI analysis capabilities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {capabilities?.analysisTypes.map((type) => (
                    <div key={type} className="flex items-center justify-between p-2 rounded border">
                      <span className="capitalize">{type.replace('_', ' ')}</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Legal Features</span>
                </CardTitle>
                <CardDescription>Legal compliance and analysis features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {capabilities?.legalFeatures.map((feature) => (
                    <div key={feature} className="flex items-center justify-between p-2 rounded border">
                      <span>{feature}</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Actions */}
          <Card>
            <CardHeader>
              <CardTitle>New Analysis</CardTitle>
              <CardDescription>Start a new evidence analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  Analyze Evidence
                </Button>
                <Button variant="outline">
                  <Search className="h-4 w-4 mr-2" />
                  Batch Analysis
                </Button>
                <Button variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Generate Timeline
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pattern Detection Tab */}
        <TabsContent value="patterns" className="space-y-4">
          {patternResults && (
            <>
              {/* Detected Patterns */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Search className="h-5 w-5" />
                    <span>Detected Patterns</span>
                  </CardTitle>
                  <CardDescription>{patternResults.patterns.length} patterns found</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {patternResults.patterns.map((pattern, idx) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="capitalize">
                              {pattern.type}
                            </Badge>
                            <span className="font-medium">Pattern {idx + 1}</span>
                          </div>
                          <span className={`font-semibold ${getConfidenceColor(pattern.confidence)}`}>
                            {(pattern.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-sm mb-2">{pattern.description}</p>
                        <div className="text-xs text-muted-foreground">
                          <strong>Legal Significance:</strong> {pattern.legalSignificance}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          <strong>Evidence:</strong> {pattern.evidenceIds.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Evidence Clusters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Evidence Clusters</span>
                  </CardTitle>
                  <CardDescription>{patternResults.clusters.length} clusters identified</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patternResults.clusters.map((cluster) => (
                      <div key={cluster.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{cluster.name}</h4>
                          <Badge variant="outline">
                            {cluster.evidenceItems.length} items
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{cluster.significance}</p>
                        <div className="mt-2 text-xs">
                          Items: {cluster.evidenceItems.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Anomalies */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Detected Anomalies</span>
                  </CardTitle>
                  <CardDescription>{patternResults.anomalies.length} anomalies require attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patternResults.anomalies.map((anomaly) => (
                      <Alert key={anomaly.id}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle className="flex items-center space-x-2">
                          <span>{anomaly.type.replace('_', ' ').toUpperCase()}</span>
                          <Badge 
                            variant={anomaly.severity === 'high' ? 'destructive' : 'secondary'}
                          >
                            {anomaly.severity}
                          </Badge>
                        </AlertTitle>
                        <AlertDescription>
                          <p className="mb-2">{anomaly.description}</p>
                          <p className="text-sm"><strong>Recommendation:</strong> {anomaly.recommendation}</p>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Cross-Platform Analysis Tab */}
        <TabsContent value="crossplatform" className="space-y-4">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Network className="h-5 w-5" />
                  <span>Ecosystem Integration</span>
                </CardTitle>
                <CardDescription>AI analysis across ChittyChain platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Cross-Platform Analysis</h3>
                  <p className="text-muted-foreground mb-4">
                    Analyze evidence patterns and correlations across the ChittyChain ecosystem
                  </p>
                  <Button>
                    <Network className="h-4 w-4 mr-2" />
                    Open Full Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Platform Connections</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">ChittyChainLedger</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">ChittyTrust</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">ChittyVerify</span>
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">ChittyResolution</span>
                      <AlertTriangle className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Data Synchronization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">98.5%</div>
                    <div className="text-sm text-muted-foreground">Sync Success Rate</div>
                    <Progress value={98.5} className="mt-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Cross-Platform Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">247</div>
                    <div className="text-sm text-muted-foreground">Active Correlations</div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Across 4 platforms
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Capabilities Tab */}
        <TabsContent value="capabilities" className="space-y-4">
          {capabilities && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Text Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Text Analysis</span>
                  </CardTitle>
                  <CardDescription>
                    Primary: {capabilities.models.text.primary}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {capabilities.models.text.capabilities.map((capability) => (
                      <div key={capability} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{capability}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Image Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="h-5 w-5" />
                    <span>Image Analysis</span>
                  </CardTitle>
                  <CardDescription>
                    Primary: {capabilities.models.image.primary}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {capabilities.models.image.capabilities.map((capability) => (
                      <div key={capability} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{capability}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Audio Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Audio Analysis</span>
                  </CardTitle>
                  <CardDescription>
                    Primary: {capabilities.models.audio.primary}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {capabilities.models.audio.capabilities.map((capability) => (
                      <div key={capability} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{capability}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Pattern Types */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Link className="h-5 w-5" />
                    <span>Pattern Types</span>
                  </CardTitle>
                  <CardDescription>Available pattern detection types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {capabilities.patternTypes.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm capitalize">{type}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}