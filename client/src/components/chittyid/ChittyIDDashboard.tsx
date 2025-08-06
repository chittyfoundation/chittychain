import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Hash, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  RefreshCw, 
  Zap,
  Clock,
  Shield,
  Users,
  FileText,
  Home,
  Scale
} from 'lucide-react';
import { ChittyIDSystem, chittyIdApi, type ChittyIDGenerationRequest, type ChittyIDGenerationResult, type ChittyIDValidationResult } from '@/lib/chittyid';
import { useToast } from '@/hooks/use-toast';

export function ChittyIDDashboard() {
  const [generatedId, setGeneratedId] = useState<ChittyIDGenerationResult | null>(null);
  const [validationResult, setValidationResult] = useState<ChittyIDValidationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [generationOptions, setGenerationOptions] = useState<ChittyIDGenerationRequest>({
    vertical: 'user',
    nodeId: '1',
    jurisdiction: 'USA'
  });
  const [validationInput, setValidationInput] = useState('');
  
  const { toast } = useToast();

  const verticalIcons = {
    user: <Users className="h-4 w-4" />,
    evidence: <Shield className="h-4 w-4" />,
    case: <Scale className="h-4 w-4" />,
    property: <Home className="h-4 w-4" />,
    contract: <FileText className="h-4 w-4" />,
    audit: <CheckCircle className="h-4 w-4" />
  };

  const verticalColors = {
    user: 'bg-blue-100 text-blue-800',
    evidence: 'bg-red-100 text-red-800',
    case: 'bg-purple-100 text-purple-800',
    property: 'bg-green-100 text-green-800',
    contract: 'bg-yellow-100 text-yellow-800',
    audit: 'bg-gray-100 text-gray-800'
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await chittyIdApi.generateId(generationOptions);
      setGeneratedId(result);
      toast({
        title: "ChittyID Generated",
        description: `Successfully generated ID: ${result.chittyId}`,
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleValidate = async () => {
    if (!validationInput.trim()) return;
    
    setIsValidating(true);
    try {
      const result = await chittyIdApi.validateId(validationInput.trim());
      setValidationResult(result);
      toast({
        title: result.valid ? "Valid ChittyID" : "Invalid ChittyID",
        description: result.valid ? "The ChittyID is properly formatted and valid" : "The ChittyID format is invalid",
        variant: result.valid ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: "Validation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: `ChittyID copied: ${text}`,
    });
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ChittyID System</h1>
          <p className="text-muted-foreground">
            Universal identifier system for blockchain legal evidence management
          </p>
        </div>
        <Badge variant="outline" className="text-green-600">
          <Zap className="h-3 w-3 mr-1" />
          Active
        </Badge>
      </div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Generate ID</TabsTrigger>
          <TabsTrigger value="validate">Validate ID</TabsTrigger>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Hash className="h-5 w-5" />
                <span>Generate ChittyID</span>
              </CardTitle>
              <CardDescription>Create a new unique identifier for legal evidence management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="vertical">Vertical</Label>
                  <Select 
                    value={generationOptions.vertical} 
                    onValueChange={(value: any) => setGenerationOptions({...generationOptions, vertical: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vertical" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="evidence">Evidence</SelectItem>
                      <SelectItem value="case">Case</SelectItem>
                      <SelectItem value="property">Property</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="audit">Audit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="nodeId">Node ID</Label>
                  <Input
                    id="nodeId"
                    value={generationOptions.nodeId}
                    onChange={(e) => setGenerationOptions({...generationOptions, nodeId: e.target.value})}
                    placeholder="1"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="jurisdiction">Jurisdiction</Label>
                  <Input
                    id="jurisdiction"
                    value={generationOptions.jurisdiction}
                    onChange={(e) => setGenerationOptions({...generationOptions, jurisdiction: e.target.value})}
                    placeholder="USA"
                  />
                </div>
              </div>

              <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {isGenerating ? 'Generating...' : 'Generate ChittyID'}
              </Button>

              {generatedId && (
                <Alert>
                  <Hash className="h-4 w-4" />
                  <AlertTitle>Generated ChittyID</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <code className="font-mono text-sm">{generatedId.chittyId}</code>
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard(generatedId.chittyId)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          {generatedId.vertical && verticalIcons[generatedId.vertical as keyof typeof verticalIcons]}
                          <Badge className={generatedId.vertical ? verticalColors[generatedId.vertical as keyof typeof verticalColors] : ''}>
                            {generatedId.vertical}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimestamp(generatedId.timestamp)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span>Valid</span>
                        </div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validate Tab */}
        <TabsContent value="validate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Validate ChittyID</span>
              </CardTitle>
              <CardDescription>Verify the format and authenticity of a ChittyID</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter ChittyID to validate (e.g., CHTTY-...)"
                  value={validationInput}
                  onChange={(e) => setValidationInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                />
                <Button onClick={handleValidate} disabled={isValidating || !validationInput.trim()}>
                  {isValidating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {validationResult && (
                <Alert>
                  {validationResult.valid ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertTitle>
                    {validationResult.valid ? 'Valid ChittyID' : 'Invalid ChittyID'}
                  </AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-2">
                      <div className="bg-gray-50 p-2 rounded">
                        <code className="font-mono text-sm">{validationResult.chittyId}</code>
                      </div>
                      {validationResult.valid && validationResult.details && (
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              {validationResult.vertical && verticalIcons[validationResult.vertical as keyof typeof verticalIcons]}
                              <Badge className={validationResult.vertical ? verticalColors[validationResult.vertical as keyof typeof verticalColors] : ''}>
                                {validationResult.vertical}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatTimestamp(validationResult.timestamp)}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>Node ID: {validationResult.details.nodeId}</div>
                            <div>Sequence: {validationResult.details.sequence}</div>
                            <div>Checksum: {validationResult.details.checksum}</div>
                            <div>Prefix: {validationResult.details.prefix}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">Online</div>
                  <div className="text-sm text-muted-foreground">ChittyID v2.0.0</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Supported Verticals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(verticalIcons).map(([vertical, icon]) => (
                    <div key={vertical} className="flex items-center space-x-2">
                      {icon}
                      <span className="text-sm capitalize">{vertical}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Integration Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">ChittyChain</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">ChittyChainLedger</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">ChittyTrust</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>ChittyID Format Specification</CardTitle>
              <CardDescription>Understanding the ChittyID structure</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-mono text-sm">
                    CHTTY-{'{'}timestamp{'}'}-{'{'}vertical{'}'}-{'{'}nodeId{'}'}-{'{'}sequence{'}'}-{'{'}checksum{'}'}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">Components</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li><strong>CHTTY:</strong> Fixed prefix identifier</li>
                      <li><strong>Timestamp:</strong> Base36 encoded generation time</li>
                      <li><strong>Vertical:</strong> Category (user, evidence, case, etc.)</li>
                      <li><strong>Node ID:</strong> Generating node identifier</li>
                      <li><strong>Sequence:</strong> Random sequence for uniqueness</li>
                      <li><strong>Checksum:</strong> Validation hash</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Features</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Cryptographically secure validation</li>
                      <li>• Timestamp-based chronological ordering</li>
                      <li>• Multi-vertical categorization support</li>
                      <li>• Distributed generation capability</li>
                      <li>• Collision resistance through randomization</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}