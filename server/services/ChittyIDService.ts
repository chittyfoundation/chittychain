import { neonStorage as storage } from '../neon-storage.js';
import type { IStorage } from '../storage.js';

export interface ChittyIDComponents {
  prefix: string;
  timestamp: string;
  vertical: string;
  nodeId: string;
  sequence: string;
  checksum: string;
}

export interface ChittyIDRecord {
  id: string;
  chittyId: string;
  vertical: string;
  nodeId: string;
  jurisdiction: string;
  timestamp: number;
  generatedAt: Date;
  isValid: boolean;
  metadata?: Record<string, any>;
}

export class ChittyIDService {
  private static readonly PREFIX = 'CHTTY';
  private static readonly VERTICALS = ['user', 'evidence', 'case', 'property', 'contract', 'audit'];
  private static sequence = 0;

  static generateChittyID(vertical: string = 'user', nodeId: string = '1', jurisdiction: string = 'USA'): string {
    if (!this.VERTICALS.includes(vertical)) {
      throw new Error(`Invalid vertical: ${vertical}. Must be one of: ${this.VERTICALS.join(', ')}`);
    }

    const timestamp = Date.now().toString(36).toUpperCase();
    const sequence = (++this.sequence).toString(36).padStart(4, '0').toUpperCase();
    
    const components = [this.PREFIX, timestamp, vertical.toUpperCase(), nodeId, sequence].join('-');
    const checksum = this.generateChecksum(components);
    
    return `${components}-${checksum}`;
  }

  static validateChittyID(chittyId: string): boolean {
    try {
      const parts = chittyId.split('-');
      if (parts.length !== 6) return false;
      
      const [prefix, timestamp, vertical, nodeId, sequence, checksum] = parts;
      
      if (prefix !== this.PREFIX) return false;
      if (!this.VERTICALS.includes(vertical.toLowerCase())) return false;
      
      const expectedChecksum = this.generateChecksum([prefix, timestamp, vertical, nodeId, sequence].join('-'));
      return checksum === expectedChecksum;
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
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substr(0, 4).toUpperCase();
  }

  // Database operations using audit logs for storage
  static async storeChittyID(record: Omit<ChittyIDRecord, 'id' | 'generatedAt'>): Promise<ChittyIDRecord> {
    const id = Math.random().toString(36).substr(2, 9);
    const fullRecord: ChittyIDRecord = {
      ...record,
      id,
      generatedAt: new Date()
    };

    // Store as audit log
    try {
      await storage.createAuditLog({
        id: id,
        action: 'chittyid_generated',
        details: JSON.stringify(fullRecord),
        timestamp: new Date(),
        userId: null,
        metadata: {
          chittyId: record.chittyId,
          vertical: record.vertical,
          nodeId: record.nodeId
        }
      });
    } catch (error) {
      console.error('Failed to store ChittyID:', error);
    }

    return fullRecord;
  }

  static async getChittyID(chittyId: string): Promise<ChittyIDRecord | null> {
    try {
      const auditLogs = await storage.getAllAuditLogs();
      const chittyIdLog = auditLogs.find(log => 
        log.action === 'chittyid_generated' && 
        log.metadata?.chittyId === chittyId
      );
      
      if (chittyIdLog) {
        return JSON.parse(chittyIdLog.details) as ChittyIDRecord;
      }
      return null;
    } catch {
      return null;
    }
  }

  static async listChittyIDs(filters?: {
    vertical?: string;
    nodeId?: string;
    jurisdiction?: string;
    limit?: number;
  }): Promise<ChittyIDRecord[]> {
    try {
      const auditLogs = await storage.getAllAuditLogs();
      let records = auditLogs
        .filter(log => log.action === 'chittyid_generated')
        .map(log => {
          try {
            return JSON.parse(log.details) as ChittyIDRecord;
          } catch {
            return null;
          }
        })
        .filter(record => record !== null);
      
      if (filters) {
        if (filters.vertical) {
          records = records.filter(r => r.vertical === filters.vertical);
        }
        if (filters.nodeId) {
          records = records.filter(r => r.nodeId === filters.nodeId);
        }
        if (filters.jurisdiction) {
          records = records.filter(r => r.jurisdiction === filters.jurisdiction);
        }
        if (filters.limit) {
          records = records.slice(0, filters.limit);
        }
      }

      return records.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }

  static async getStats(): Promise<{
    total: number;
    byVertical: Record<string, number>;
    byNode: Record<string, number>;
    recentCount: number;
  }> {
    try {
      const records = await this.listChittyIDs();
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);

      const byVertical: Record<string, number> = {};
      const byNode: Record<string, number> = {};
      let recentCount = 0;

      records.forEach(record => {
        byVertical[record.vertical] = (byVertical[record.vertical] || 0) + 1;
        byNode[record.nodeId] = (byNode[record.nodeId] || 0) + 1;
        
        if (record.timestamp > oneDayAgo) {
          recentCount++;
        }
      });

      return {
        total: records.length,
        byVertical,
        byNode,
        recentCount
      };
    } catch {
      return {
        total: 0,
        byVertical: {},
        byNode: {},
        recentCount: 0
      };
    }
  }

  // Bulk operations
  static async bulkGenerate(options: {
    count: number;
    vertical: string;
    nodeId: string;
    jurisdiction: string;
  }): Promise<ChittyIDRecord[]> {
    const { count, vertical, nodeId, jurisdiction } = options;
    
    if (count > 100) {
      throw new Error('Maximum bulk generation limit is 100 IDs');
    }

    const records: ChittyIDRecord[] = [];
    
    for (let i = 0; i < count; i++) {
      const chittyId = this.generateChittyID(vertical, nodeId, jurisdiction);
      const timestamp = this.getTimestamp(chittyId);
      
      const record = await this.storeChittyID({
        chittyId,
        vertical,
        nodeId,
        jurisdiction,
        timestamp: timestamp || Date.now(),
        isValid: true,
        metadata: {
          bulkGenerated: true,
          batchIndex: i
        }
      });
      
      records.push(record);
    }

    return records;
  }

  // Health check and system status
  static async healthCheck(): Promise<{
    status: 'ok' | 'degraded' | 'error';
    version: string;
    uptime: number;
    lastGenerated?: Date;
    totalGenerated: number;
  }> {
    try {
      const stats = await this.getStats();
      const records = await this.listChittyIDs({ limit: 1 });
      const lastRecord = records[0];

      return {
        status: 'ok',
        version: '2.0.0',
        uptime: process.uptime(),
        lastGenerated: lastRecord?.generatedAt,
        totalGenerated: stats.total
      };
    } catch {
      return {
        status: 'error',
        version: '2.0.0',
        uptime: process.uptime(),
        totalGenerated: 0
      };
    }
  }
}