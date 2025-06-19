export interface ChittyChainConfig {
  rpcUrl: string;
  apiKey?: string;
  timeout?: number;
}

export interface EvidenceRecord {
  hash: string;
  caseId: string;
  documentType: string;
  ipfsHash: string;
  submittedBy: string;
  metadata: any;
}

export interface PropertyData {
  tokenId: number;
  propertyAddress: string;
  owner: string;
  conditionScore: number;
  metadata: any;
}

export interface CaseData {
  caseNumber: string;
  jurisdiction: string;
  title: string;
  plaintiffs: any[];
  defendants: any[];
  attorneys: any[];
}

export class ChittyChainSDK {
  private config: ChittyChainConfig;
  private baseUrl: string;

  constructor(config: ChittyChainConfig) {
    this.config = config;
    this.baseUrl = config.rpcUrl.replace(/\/ws$/, '').replace(/^wss?:/, 'http:');
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(this.config.timeout || 30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ChittyChain API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Blockchain methods
  async getBlockchainStatus() {
    return this.request('/api/blockchain/status');
  }

  async getChain() {
    return this.request('/api/blockchain/chain');
  }

  async getBlock(blockNumber: number) {
    return this.request(`/api/blockchain/block/${blockNumber}`);
  }

  async mineBlock(miner: string) {
    return this.request('/api/blockchain/mine', {
      method: 'POST',
      body: JSON.stringify({ miner }),
    });
  }

  async getRecentTransactions(limit: number = 10) {
    return this.request(`/api/blockchain/transactions/recent?limit=${limit}`);
  }

  // Evidence methods
  async recordEvidence(evidence: Omit<EvidenceRecord, 'hash'>) {
    return this.request('/api/evidence/submit', {
      method: 'POST',
      body: JSON.stringify(evidence),
    });
  }

  async verifyEvidence(evidenceId: string, verifiedBy: string, notes?: string) {
    return this.request(`/api/evidence/${evidenceId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ verifiedBy, notes }),
    });
  }

  async getEvidence(evidenceId: string) {
    return this.request(`/api/evidence/${evidenceId}`);
  }

  async getCaseEvidence(caseId: string) {
    return this.request(`/api/evidence/case/${caseId}`);
  }

  // Case management methods
  async createCase(caseData: CaseData & { createdBy: string }) {
    return this.request('/api/case/create', {
      method: 'POST',
      body: JSON.stringify(caseData),
    });
  }

  async getCase(caseNumber: string) {
    return this.request(`/api/case/${caseNumber}`);
  }

  async getAllCases() {
    return this.request('/api/cases');
  }

  // Property methods
  async mintProperty(propertyData: Omit<PropertyData, 'tokenId'>) {
    return this.request('/api/property/mint', {
      method: 'POST',
      body: JSON.stringify(propertyData),
    });
  }

  async getProperty(tokenId: number) {
    return this.request(`/api/property/${tokenId}`);
  }

  async getOwnerProperties(owner: string) {
    return this.request(`/api/property/owner/${owner}`);
  }

  // Smart contract methods
  async getContracts() {
    return this.request('/api/contracts');
  }

  // System methods
  async getStats() {
    return this.request('/api/stats');
  }

  async getAuditTrail() {
    return this.request('/api/audit/trail');
  }

  // Utility methods
  async healthCheck() {
    try {
      const status = await this.getBlockchainStatus();
      return {
        healthy: true,
        blockHeight: status.stats?.totalBlocks || 0,
        isValid: status.health?.isValid || false,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // WebSocket connection for real-time updates
  connectWebSocket(onMessage?: (message: any) => void, onError?: (error: Error) => void) {
    const wsProtocol = this.config.rpcUrl.startsWith('https') ? 'wss:' : 'ws:';
    const wsUrl = this.config.rpcUrl.replace(/^https?:/, wsProtocol);
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('ChittyChain WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        onMessage?.(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('ChittyChain WebSocket error:', error);
      onError?.(new Error('WebSocket connection error'));
    };

    ws.onclose = () => {
      console.log('ChittyChain WebSocket disconnected');
    };

    return ws;
  }
}

// Default export for easy importing
export default ChittyChainSDK;

// Factory function for creating SDK instance
export function createChittyChainSDK(config: ChittyChainConfig): ChittyChainSDK {
  return new ChittyChainSDK(config);
}
