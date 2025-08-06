// ChittyID Core Integration
// Based on the ChittyID v2 specification for blockchain legal evidence management

export interface ChittyIDComponents {
  prefix: string;
  timestamp: string;
  vertical: string;
  nodeId: string;
  sequence: string;
  checksum: string;
}

export interface ChittyIDGenerationRequest {
  vertical?: 'user' | 'evidence' | 'case' | 'property' | 'contract' | 'audit';
  nodeId?: string;
  jurisdiction?: string;
}

export interface ChittyIDValidationResult {
  chittyId: string;
  valid: boolean;
  details?: ChittyIDComponents;
  timestamp?: number;
  vertical?: string;
}

export interface ChittyIDGenerationResult {
  chittyId: string;
  displayFormat: string;
  timestamp?: number;
  vertical?: string;
  valid: boolean;
}

// ChittyID format: CHTTY-{timestamp}-{vertical}-{nodeId}-{sequence}-{checksum}
export class ChittyIDSystem {
  private static readonly PREFIX = 'CHTTY';
  private static readonly VERTICALS = ['user', 'evidence', 'case', 'property', 'contract', 'audit'];
  
  static generateChittyID(options: ChittyIDGenerationRequest = {}): string {
    const {
      vertical = 'user',
      nodeId = '1',
      jurisdiction = 'USA'
    } = options;

    if (!this.VERTICALS.includes(vertical)) {
      throw new Error(`Invalid vertical: ${vertical}. Must be one of: ${this.VERTICALS.join(', ')}`);
    }

    const timestamp = Date.now().toString(36).toUpperCase();
    const sequence = Math.random().toString(36).substr(2, 4).toUpperCase();
    
    // Generate checksum based on components
    const components = [this.PREFIX, timestamp, vertical.toUpperCase(), nodeId, sequence].join('-');
    const checksum = this.generateChecksum(components);
    
    return `${components}-${checksum}`;
  }

  static validateChittyID(chittyId: string): boolean {
    try {
      const parts = chittyId.split('-');
      if (parts.length !== 6) return false;
      
      const [prefix, timestamp, vertical, nodeId, sequence, checksum] = parts;
      
      // Validate prefix
      if (prefix !== this.PREFIX) return false;
      
      // Validate vertical
      if (!this.VERTICALS.includes(vertical.toLowerCase())) return false;
      
      // Validate checksum
      const expectedChecksum = this.generateChecksum([prefix, timestamp, vertical, nodeId, sequence].join('-'));
      if (checksum !== expectedChecksum) return false;
      
      return true;
    } catch {
      return false;
    }
  }

  static parseChittyID(chittyId: string): ChittyIDComponents | null {
    if (!this.validateChittyID(chittyId)) return null;
    
    const [prefix, timestamp, vertical, nodeId, sequence, checksum] = chittyId.split('-');
    
    return {
      prefix,
      timestamp,
      vertical: vertical.toLowerCase(),
      nodeId,
      sequence,
      checksum
    };
  }

  static getTimestamp(chittyId: string): number | null {
    const components = this.parseChittyID(chittyId);
    if (!components) return null;
    
    try {
      return parseInt(components.timestamp, 36);
    } catch {
      return null;
    }
  }

  private static generateChecksum(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substr(0, 4).toUpperCase();
  }
}

// API integration functions for backend communication
export const chittyIdApi = {
  async generateId(options: ChittyIDGenerationRequest): Promise<ChittyIDGenerationResult> {
    try {
      const response = await fetch('/api/chittyid/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Fallback to client-side generation if API is unavailable
      console.warn('ChittyID API unavailable, using client-side generation:', error);
      const chittyId = ChittyIDSystem.generateChittyID(options);
      const components = ChittyIDSystem.parseChittyID(chittyId);
      const timestamp = ChittyIDSystem.getTimestamp(chittyId);
      
      return {
        chittyId,
        displayFormat: chittyId,
        timestamp: timestamp || undefined,
        vertical: components?.vertical,
        valid: true
      };
    }
  },

  async validateId(chittyId: string): Promise<ChittyIDValidationResult> {
    try {
      const response = await fetch('/api/chittyid/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chittyId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Fallback to client-side validation if API is unavailable
      console.warn('ChittyID API unavailable, using client-side validation:', error);
      const valid = ChittyIDSystem.validateChittyID(chittyId);
      const details = ChittyIDSystem.parseChittyID(chittyId);
      const timestamp = ChittyIDSystem.getTimestamp(chittyId);
      
      return {
        chittyId,
        valid,
        details: details || undefined,
        timestamp: timestamp || undefined,
        vertical: details?.vertical
      };
    }
  }
};