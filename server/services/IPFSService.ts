import crypto from 'crypto';
import { create } from 'ipfs-http-client';
import { env } from '../config/environment';
import type { IPFSHTTPClient } from 'ipfs-http-client';

export interface IPFSFile {
  hash: string;
  size: number;
  uploadedAt: Date;
  contentType?: string;
}

export class IPFSService {
  private client: IPFSHTTPClient | null = null;
  private isConnected: boolean = false;
  private fallbackStore: Map<string, { buffer: Buffer; metadata: IPFSFile }> = new Map();

  constructor() {
    this.initializeClient();
  }

  private async initializeClient() {
    try {
      const url = `${env.IPFS_PROTOCOL}://${env.IPFS_HOST}:${env.IPFS_PORT}`;
      this.client = create({ url });
      
      // Test connection
      try {
        await this.client.version();
        this.isConnected = true;
        console.log('✅ Connected to IPFS node');
      } catch (error) {
        console.warn('⚠️  IPFS node not available, using fallback storage');
        this.isConnected = false;
      }
    } catch (error) {
      console.error('Failed to initialize IPFS client:', error);
      this.isConnected = false;
    }
  }

  public async addFile(buffer: Buffer, contentType?: string): Promise<string> {
    try {
      let hash: string;
      
      if (this.isConnected && this.client) {
        // Use real IPFS
        try {
          const result = await this.client.add(buffer, {
            pin: true,
            wrapWithDirectory: false
          });
          hash = result.cid.toString();
        } catch (ipfsError) {
          console.warn('IPFS add failed, falling back to mock:', ipfsError);
          this.isConnected = false;
          // Fall through to mock implementation
          hash = 'Qm' + crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 44);
        }
      } else {
        // Use mock IPFS hash
        hash = 'Qm' + crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 44);
      }
      
      const metadata: IPFSFile = {
        hash,
        size: buffer.length,
        uploadedAt: new Date(),
        contentType,
      };

      // Always store in fallback for reliability
      this.fallbackStore.set(hash, { buffer, metadata });
      
      return hash;
    } catch (error) {
      throw new Error(`Failed to add file to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getFile(hash: string): Promise<{ buffer: Buffer; metadata: IPFSFile } | null> {
    try {
      // First check fallback store
      const fallbackFile = this.fallbackStore.get(hash);
      if (fallbackFile) {
        return fallbackFile;
      }

      // Try to get from IPFS if connected
      if (this.isConnected && this.client) {
        try {
          const chunks: Uint8Array[] = [];
          for await (const chunk of this.client.cat(hash)) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);
          
          const metadata: IPFSFile = {
            hash,
            size: buffer.length,
            uploadedAt: new Date(),
          };
          
          return { buffer, metadata };
        } catch (ipfsError) {
          console.warn('IPFS get failed:', ipfsError);
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting file:', error);
      return null;
    }
  }

  public async pinFile(hash: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.pin.add(hash);
      } catch (error) {
        console.warn('Failed to pin file:', error);
        // Continue even if pinning fails
      }
    }
    
    // Ensure it exists in fallback
    if (!this.fallbackStore.has(hash)) {
      throw new Error('File not found');
    }
  }

  public async unpinFile(hash: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.pin.rm(hash);
      } catch (error) {
        console.warn('Failed to unpin file:', error);
        // Continue even if unpinning fails
      }
    }
    
    // Keep in fallback store for now
    if (!this.fallbackStore.has(hash)) {
      throw new Error('File not found');
    }
  }

  public async getFileStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    averageFileSize: number;
  }> {
    const files = Array.from(this.fallbackStore.values());
    const totalFiles = files.length;
    const totalSize = files.reduce((sum, file) => sum + file.metadata.size, 0);
    const averageFileSize = totalFiles > 0 ? Math.floor(totalSize / totalFiles) : 0;

    return {
      totalFiles,
      totalSize,
      averageFileSize,
    };
  }

  public async verifyFileIntegrity(hash: string, buffer: Buffer): Promise<boolean> {
    try {
      const file = this.fallbackStore.get(hash);
      if (!file) {
        return false;
      }

      // Compare the provided buffer with the stored buffer
      return Buffer.compare(file.buffer, buffer) === 0;
    } catch (error) {
      return false;
    }
  }

  public listFiles(): IPFSFile[] {
    return Array.from(this.fallbackStore.values()).map(file => file.metadata);
  }

  public async deleteFile(hash: string): Promise<void> {
    if (!this.fallbackStore.has(hash)) {
      throw new Error('File not found');
    }
    
    // Try to unpin from IPFS first
    if (this.isConnected && this.client) {
      try {
        await this.client.pin.rm(hash);
      } catch (error) {
        // Ignore unpin errors
      }
    }
    
    this.fallbackStore.delete(hash);
  }

  public async checkNetworkStatus(): Promise<{
    connected: boolean;
    peersCount: number;
    nodeId: string;
  }> {
    if (this.isConnected && this.client) {
      try {
        const [id, peers] = await Promise.all([
          this.client.id(),
          this.client.swarm.peers()
        ]);
        
        return {
          connected: true,
          peersCount: peers.length,
          nodeId: id.id.toString(),
        };
      } catch (error) {
        this.isConnected = false;
      }
    }
    
    // Return mock data if not connected
    return {
      connected: false,
      peersCount: 0,
      nodeId: 'offline-' + crypto.randomBytes(16).toString('hex'),
    };
  }
}
