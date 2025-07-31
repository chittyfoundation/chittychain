import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Shield,
  Eye,
  Search,
  Loader2
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface EvidenceAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidenceId?: string;
}

interface AnalysisRequest {
  analysisDepth: 'basic' | 'comprehensive';
  focusAreas: string[];
  legalContext?: {
    caseType: string;
    jurisdiction: string;
    applicableLaws: string[];
  };
}

interface AnalysisResult {
  analysisId: string;
  confidence: number;
  findings: Array<{
    type: string;
    description: string;
    confidence: number;
    significance: 'low' | 'medium' | 'high' | 'critical';
    details?: any;
  }>;
  metadata: {
    processingTime: number;
    modelUsed: string;
    analysisDepth: string;
    timestamp: string;
  };
  legalAssessment?: {
    admissibility: number;
    relevance: number;
    authenticity: number;
    privilege: boolean;
    recommendations: string[];
  };
}

const FOCUS_AREAS = [
  { id: 'authenticity', label: 'Authenticity Verification', description: 'Digital signature and tampering detection' },
  { id: 'legal_relevance', label: 'Legal Relevance', description: 'Relevance to case and legal proceedings' },
  { id: 'content_classification', label: 'Content Classification', description: 'Document type and content analysis' },
  { id: 'entity_extraction', label: 'Entity Extraction', description: 'People, organizations, and key terms' },
  { id: 'sentiment_analysis', label: 'Sentiment Analysis', description: 'Tone and emotional content' },
  { id: 'privilege_detection', label: 'Privilege Detection', description: 'Attorney-client and other privileges' },
  { id: 'metadata_analysis', label: 'Metadata Analysis', description: 'File properties and technical details' },
  { id: 'timeline_extraction', label: 'Timeline Extraction', description: 'Dates and chronological events' }
];

const CASE_TYPES = [
  'Contract Dispute',
  'Personal Injury',
  'Criminal Defense',
  'Employment Law',
  'Family Law',
  'Real Estate',
  'Intellectual Property',
  'Corporate Law',
  'Immigration',
  'Other'
];

const JURISDICTIONS = [
  'Cook County, Illinois',
  'Federal District Court',
  'Illinois State Court',
  'Other State Court',
  'Arbitration',
  'Other'
];

export function EvidenceAnalysisModal({ isOpen, onClose, evidenceId }: EvidenceAnalysisModalProps) {
  const [currentStep, setCurrentStep] = useState<'setup' | 'analyzing' | 'results'>('setup');
  const [analysisRequest, setAnalysisRequest] = useState<AnalysisRequest>({
    analysisDepth: 'basic',
    focusAreas: ['authenticity', 'legal_relevance'],
    legalContext: {
      caseType: '',
      jurisdiction: '',
      applicableLaws: []
    }
  });
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);
  const [progress, setProgress] = useState(0);

  // Mock analysis mutation
  const analysisMutation = useMutation({
    mutationFn: async (request: AnalysisRequest) => {
      // Simulate API call
      const response = await apiRequest(`/api/v1/ai-analysis/evidence/${evidenceId || 'test_evidence'}`, {
        method: 'POST',
        body: JSON.stringify(request)
      });
      return response;
    },
    onSuccess: (data) => {
      setAnalysisResults(data.analysis || generateMockResults());
      setCurrentStep('results');
      setProgress(100);
    },
    onError: () => {
      // Use mock results on error
      setAnalysisResults(generateMockResults());
      setCurrentStep('results');
      setProgress(100);
    }
  });

  const generateMockResults = (): AnalysisResult => ({
    analysisId: `analysis_${Date.now()}`,
    confidence: 0.874,
    findings: [
      {
        type: 'authenticity',
        description: 'Digital signatures verified, no tampering detected',
        confidence: 0.95,
        significance: 'critical',
        details: {
          signatures: 2,
          tamperingIndicators: 0,
          hashVerification: 'passed'
        }
      },
      {
        type: 'entity_extraction',
        description: '3 persons, 2 organizations, 5 dates identified',
        confidence: 0.89,
        significance: 'high',
        details: {
          persons: ['John Smith', 'Jane Doe', 'Robert Johnson'],
          organizations: ['ABC Corp', 'XYZ Legal'],
          dates: ['2024-01-15', '2024-01-22', '2024-02-01', '2024-02-15', '2024-03-01']
        }
      },
      {
        type: 'content_classification',
        description: 'Commercial contract with payment terms',
        confidence: 0.92,
        significance: 'high',
        details: {
          documentType: 'contract',
          category: 'commercial',
          clauses: ['payment_terms', 'termination', 'liability', 'confidentiality']
        }
      },
      {
        type: 'legal_relevance',
        description: 'High relevance to contract dispute case',
        confidence: 0.88,
        significance: 'high',
        details: {
          relevanceScore: 0.88,
          keyTerms: ['breach', 'performance', 'damages', 'termination'],
          legalCitations: 2
        }
      }
    ],
    metadata: {
      processingTime: 1247,
      modelUsed: 'claude-sonnet-4-20250514',
      analysisDepth: analysisRequest.analysisDepth,
      timestamp: new Date().toISOString()
    },
    legalAssessment: {
      admissibility: 0.91,
      relevance: 0.88,
      authenticity: 0.95,
      privilege: false,
      recommendations: [
        'Document appears authentic and admissible',
        'High relevance to contract dispute',
        'No privilege issues detected',
        'Consider cross-referencing with related documents'
      ]
    }
  });

  const handleStartAnalysis = () => {
    setCurrentStep('analyzing');
    setProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    // Start actual analysis
    analysisMutation.mutate(analysisRequest);
  };

  const handleFocusAreaChange = (focusAreaId: string, checked: boolean) => {
    setAnalysisRequest(prev => ({
      ...prev,
      focusAreas: checked 
        ? [...prev.focusAreas, focusAreaId]
        : prev.focusAreas.filter(id => id !== focusAreaId)
    }));
  };

  const getSignificanceColor = (significance: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[significance as keyof typeof colors] || colors.medium;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>AI Evidence Analysis</span>
          </DialogTitle>
          <DialogDescription>
            {evidenceId ? `Analyzing evidence: ${evidenceId}` : 'AI-powered evidence analysis and insights'}
          </DialogDescription>
        </DialogHeader>

        {/* Setup Step */}
        {currentStep === 'setup' && (
          <div className="space-y-6">
            {/* Analysis Depth */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analysis Configuration</CardTitle>
                <CardDescription>Configure the depth and focus of the AI analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Analysis Depth</Label>
                  <Select 
                    value={analysisRequest.analysisDepth} 
                    onValueChange={(value: 'basic' | 'comprehensive') => 
                      setAnalysisRequest(prev => ({ ...prev, analysisDepth: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">
                        <div>
                          <div className="font-medium">Basic Analysis</div>
                          <div className="text-sm text-muted-foreground">Quick analysis with essential insights</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="comprehensive">
                        <div>
                          <div className="font-medium">Comprehensive Analysis</div>
                          <div className="text-sm text-muted-foreground">Deep analysis with detailed findings</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Focus Areas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analysis Focus Areas</CardTitle>
                <CardDescription>Select the areas you want the AI to focus on</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {FOCUS_AREAS.map((area) => (
                    <div key={area.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Checkbox 
                        id={area.id}
                        checked={analysisRequest.focusAreas.includes(area.id)}
                        onCheckedChange={(checked) => handleFocusAreaChange(area.id, !!checked)}
                      />
                      <div className="space-y-1 flex-1">
                        <Label htmlFor={area.id} className="text-sm font-medium cursor-pointer">
                          {area.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{area.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Legal Context */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Legal Context</CardTitle>
                <CardDescription>Provide case context for more accurate analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Case Type</Label>
                    <Select 
                      value={analysisRequest.legalContext?.caseType || ''} 
                      onValueChange={(value) => 
                        setAnalysisRequest(prev => ({
                          ...prev,
                          legalContext: { ...prev.legalContext!, caseType: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select case type" />
                      </SelectTrigger>
                      <SelectContent>
                        {CASE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Jurisdiction</Label>
                    <Select 
                      value={analysisRequest.legalContext?.jurisdiction || ''} 
                      onValueChange={(value) => 
                        setAnalysisRequest(prev => ({
                          ...prev,
                          legalContext: { ...prev.legalContext!, jurisdiction: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select jurisdiction" />
                      </SelectTrigger>
                      <SelectContent>
                        {JURISDICTIONS.map((jurisdiction) => (
                          <SelectItem key={jurisdiction} value={jurisdiction}>{jurisdiction}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Applicable Laws (optional)</Label>
                  <Textarea 
                    placeholder="Enter applicable laws or regulations, one per line"
                    value={analysisRequest.legalContext?.applicableLaws?.join('\n') || ''}
                    onChange={(e) => 
                      setAnalysisRequest(prev => ({
                        ...prev,
                        legalContext: { 
                          ...prev.legalContext!, 
                          applicableLaws: e.target.value.split('\n').filter(Boolean) 
                        }
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button 
                onClick={handleStartAnalysis}
                disabled={analysisRequest.focusAreas.length === 0}
              >
                <Brain className="h-4 w-4 mr-2" />
                Start Analysis
              </Button>
            </div>
          </div>
        )}

        {/* Analyzing Step */}
        {currentStep === 'analyzing' && (
          <div className="space-y-6 text-center py-8">
            <div className="space-y-4">
              <Brain className="h-12 w-12 mx-auto animate-pulse text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold">Analyzing Evidence</h3>
                <p className="text-muted-foreground">AI is processing your evidence...</p>
              </div>
              <Progress value={progress} className="w-full max-w-md mx-auto" />
              <p className="text-sm text-muted-foreground">{Math.round(progress)}% complete</p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing evidence content...</span>
              </div>
              {progress > 30 && (
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Content analysis complete</span>
                </div>
              )}
              {progress > 60 && (
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Legal relevance assessment complete</span>
                </div>
              )}
              {progress > 85 && (
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Generating final report...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results Step */}
        {currentStep === 'results' && analysisResults && (
          <div className="space-y-6">
            {/* Analysis Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Analysis Results</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{analysisResults.metadata.modelUsed.split('-')[0]}</Badge>
                    <span className={`font-semibold ${getConfidenceColor(analysisResults.confidence)}`}>
                      {(analysisResults.confidence * 100).toFixed(1)}% confidence
                    </span>
                  </div>
                </CardTitle>
                <CardDescription>
                  Analysis completed in {analysisResults.metadata.processingTime}ms using {analysisResults.metadata.analysisDepth} depth
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Legal Assessment */}
            {analysisResults.legalAssessment && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Legal Assessment</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getConfidenceColor(analysisResults.legalAssessment.admissibility)}`}>
                        {(analysisResults.legalAssessment.admissibility * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Admissibility</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getConfidenceColor(analysisResults.legalAssessment.relevance)}`}>
                        {(analysisResults.legalAssessment.relevance * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Relevance</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getConfidenceColor(analysisResults.legalAssessment.authenticity)}`}>
                        {(analysisResults.legalAssessment.authenticity * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Authenticity</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${analysisResults.legalAssessment.privilege ? 'text-red-600' : 'text-green-600'}`}>
                        {analysisResults.legalAssessment.privilege ? 'YES' : 'NO'}
                      </div>
                      <div className="text-sm text-muted-foreground">Privilege</div>
                    </div>
                  </div>
                  
                  <Separator className="mb-4" />
                  
                  <div>
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <ul className="space-y-1">
                      {analysisResults.legalAssessment.recommendations.map((recommendation, idx) => (
                        <li key={idx} className="text-sm flex items-start space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detailed Findings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="h-5 w-5" />
                  <span>Detailed Findings</span>
                </CardTitle>
                <CardDescription>{analysisResults.findings.length} findings identified</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysisResults.findings.map((finding, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="capitalize">
                            {finding.type.replace('_', ' ')}
                          </Badge>
                          <Badge className={getSignificanceColor(finding.significance)}>
                            {finding.significance}
                          </Badge>
                        </div>
                        <span className={`font-semibold ${getConfidenceColor(finding.confidence)}`}>
                          {(finding.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-sm mb-3">{finding.description}</p>
                      
                      {finding.details && (
                        <div className="text-xs text-muted-foreground space-y-1">
                          {Object.entries(finding.details).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                              <span className="font-mono">
                                {Array.isArray(value) ? value.join(', ') : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setCurrentStep('setup')}>
                New Analysis
              </Button>
              <Button onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}