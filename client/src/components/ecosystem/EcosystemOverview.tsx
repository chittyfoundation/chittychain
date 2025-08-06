import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Shield, Scale, CheckCircle, AlertCircle, Link as LinkIcon } from 'lucide-react';

interface EcosystemComponent {
  name: string;
  description: string;
  status: 'active' | 'development' | 'planned' | 'inactive';
  url?: string;
  features: string[];
  integrations: string[];
}

const ecosystemComponents: EcosystemComponent[] = [
  {
    name: 'ChittyChain',
    description: 'Main blockchain platform with AI-powered evidence analysis',
    status: 'active',
    features: [
      'AI Evidence Analysis',
      'Pattern Detection', 
      'Legal Compliance',
      'Blockchain Core',
      'Smart Contracts'
    ],
    integrations: ['ChittyTrust', 'ChittyVerify', 'ChittyChainLedger', 'ChittyID']
  },
  {
    name: 'ChittyID',
    description: 'Universal identifier system for blockchain legal evidence management',
    status: 'active',
    features: [
      'Unique ID Generation',
      'Multi-Vertical Support',
      'Checksum Validation',
      'Timestamp Integration',
      'Bulk Operations'
    ],
    integrations: ['ChittyChain', 'ChittyChainLedger', 'ChittyTrust']
  },
  {
    name: 'ChittyChainLedger',
    description: 'Core ledger and blockchain infrastructure',
    status: 'active',
    url: 'https://replit.com/@nvshtty/ChittyChainLedger',
    features: [
      'Distributed Ledger',
      'Transaction Processing',
      'Block Validation',
      'Consensus Mechanism'
    ],
    integrations: ['ChittyChain', 'ChittyTrust']
  },
  {
    name: 'ChittyTrust',
    description: 'Trust mechanisms and reputation system',
    status: 'active',
    url: 'https://replit.com/@nvshtty/ChittyTrust',
    features: [
      'Reputation Scoring',
      'Trust Metrics',
      'Identity Verification',
      'Fraud Detection'
    ],
    integrations: ['ChittyChain', 'ChittyVerify']
  },
  {
    name: 'ChittyVerify',
    description: 'Verification and validation services',
    status: 'development',
    url: 'https://replit.com/@nvshtty/ChittyVerify',
    features: [
      'Document Validation',
      'Digital Signatures',
      'Certificate Authority',
      'Authenticity Checks'
    ],
    integrations: ['ChittyChain', 'ChittyTrust']
  },
  {
    name: 'ChittyResolution',
    description: 'Dispute resolution and mediation platform',
    status: 'planned',
    url: 'https://replit.com/@nvshtty/ChittyResolution',
    features: [
      'Dispute Mediation',
      'Arbitration Tools',
      'Settlement Tracking',
      'Compliance Monitoring'
    ],
    integrations: ['ChittyChain', 'ChittyTrust']
  }
];

export function EcosystemOverview() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'development':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'planned':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'development':
        return <AlertCircle className="h-4 w-4" />;
      case 'planned':
        return <AlertCircle className="h-4 w-4" />;
      case 'inactive':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">ChittyChain Ecosystem</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          A comprehensive suite of blockchain-based legal technology platforms designed for 
          secure evidence management, trust verification, and dispute resolution.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {ecosystemComponents.map((component) => (
          <Card key={component.name} className="flex flex-col h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{component.name}</CardTitle>
                <Badge className={getStatusColor(component.status)}>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(component.status)}
                    <span className="capitalize">{component.status}</span>
                  </div>
                </Badge>
              </div>
              <CardDescription>{component.description}</CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 space-y-4">
              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Key Features
                </h4>
                <div className="space-y-1">
                  {component.features.map((feature, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground flex items-center">
                      <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Integrations
                </h4>
                <div className="flex flex-wrap gap-1">
                  {component.integrations.map((integration, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {integration}
                    </Badge>
                  ))}
                </div>
              </div>

              {component.url && (
                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => window.open(component.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Platform
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Scale className="h-5 w-5 mr-2" />
            Ecosystem Integration Architecture
          </CardTitle>
          <CardDescription>How the ChittyChain platforms work together</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">Data Flow</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Evidence submitted through ChittyChain main platform</li>
                  <li>• Transactions recorded in ChittyChainLedger</li>
                  <li>• Trust scores calculated by ChittyTrust</li>
                  <li>• Documents validated through ChittyVerify</li>
                  <li>• Disputes resolved via ChittyResolution</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Cross-Platform Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Unified authentication and identity management</li>
                  <li>• Shared reputation and trust scoring</li>
                  <li>• Synchronized blockchain state across platforms</li>
                  <li>• Integrated compliance and audit trails</li>
                  <li>• Cross-platform analytics and reporting</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}