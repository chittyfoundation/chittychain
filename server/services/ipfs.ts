import { create as ipfsHttpClient, IPFSHTTPClient } from 'ipfs-http-client';
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';
import { env } from '../config/environment';

export class IPFSService {
  private client: IPFSHTTPClient;
  private localStoragePath: string;

  constructor() {
    this.client = ipfsHttpClient({
      host: env.IPFS_HOST,
      port: env.IPFS_PORT,
      protocol: env.IPFS_PROTOCOL,
    });

    this.localStoragePath = join(process.cwd(), 'storage', 'ipfs');
    this.ensureStorageDirectory();
  }

  private ensureStorageDirectory() {
    if (!existsSync(this.localStoragePath)) {
      mkdirSync(this.localStoragePath, { recursive: true });
    }
  }

  /**
   * Add file to IPFS network
   */
  async addFile(buffer: Buffer, filename: string): Promise<{ hash: string; size: number }> {
    try {
      // Calculate SHA-256 hash for integrity verification
      const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
      
      // Add to IPFS
      const result = await this.client.add({
        path: filename,
        content: buffer,
      }, {
        cidVersion: 1,
        hashAlg: 'sha2-256',
        pin: true, // Pin to prevent garbage collection
      });

      // Store locally as backup
      await this.storeLocally(result.cid.toString(), buffer);

      return {
        hash: result.cid.toString(),
        size: result.size,
      };
    } catch (error) {
      console.error('IPFS add error:', error);
      
      // Fallback to local storage if IPFS fails
      const localHash = await this.storeLocallyOnly(buffer, filename);
      return {
        hash: `local:${localHash}`,
        size: buffer.length,
      };
    }
  }

  /**
   * Retrieve file from IPFS network
   */
  async getFile(hash: string): Promise<Buffer> {
    try {
      // Check if it's a local-only hash
      if (hash.startsWith('local:')) {
        return await this.getLocalFile(hash.replace('local:', ''));
      }

      // Try IPFS first
      const chunks: Uint8Array[] = [];
      for await (const chunk of this.client.cat(hash)) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      
      // Store locally as cache
      await this.storeLocally(hash, buffer);
      
      return buffer;
    } catch (error) {
      console.error('IPFS get error:', error);
      
      // Fallback to local storage
      return await this.getLocalFile(hash);
    }
  }

  /**
   * Pin file to ensure it stays in IPFS network
   */
  async pinFile(hash: string): Promise<void> {
    try {
      await this.client.pin.add(hash);
    } catch (error) {
      console.error('IPFS pin error:', error);
      // Continue without pinning if IPFS is unavailable
    }
  }

  /**
   * Unpin file from IPFS network
   */
  async unpinFile(hash: string): Promise<void> {
    try {
      await this.client.pin.rm(hash);
    } catch (error) {
      console.error('IPFS unpin error:', error);
      // Continue without unpinning if IPFS is unavailable
    }
  }

  /**
   * Check if IPFS node is accessible
   */
  async isOnline(): Promise<boolean> {
    try {
      await this.client.version();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get IPFS node information
   */
  async getNodeInfo() {
    try {
      const [version, id, peers] = await Promise.all([
        this.client.version(),
        this.client.id(),
        this.client.swarm.peers(),
      ]);

      return {
        version: version.version,
        id: id.id,
        peerCount: peers.length,
        online: true,
      };
    } catch (error) {
      return {
        version: 'unknown',
        id: 'unknown',
        peerCount: 0,
        online: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Store file locally as backup/cache
   */
  private async storeLocally(hash: string, buffer: Buffer): Promise<void> {
    const filePath = join(this.localStoragePath, hash);
    
    return new Promise((resolve, reject) => {
      const stream = createWriteStream(filePath);
      stream.on('finish', resolve);
      stream.on('error', reject);
      stream.write(buffer);
      stream.end();
    });
  }

  /**
   * Store file locally only (when IPFS is unavailable)
   */
  private async storeLocallyOnly(buffer: Buffer, filename: string): Promise<string> {
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    await this.storeLocally(hash, buffer);
    return hash;
  }

  /**
   * Retrieve file from local storage
   */
  private async getLocalFile(hash: string): Promise<Buffer> {
    const filePath = join(this.localStoragePath, hash);
    
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${hash}`);
    }

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = createReadStream(filePath);
      
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * Verify file integrity using hash
   */
  async verifyFile(hash: string, expectedSha256?: string): Promise<boolean> {
    try {
      const buffer = await this.getFile(hash);
      
      if (expectedSha256) {
        const actualHash = crypto.createHash('sha256').update(buffer).digest('hex');
        return actualHash === expectedSha256;
      }
      
      return true; // If no expected hash, just check if file exists
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(hash: string): Promise<{ size: number; exists: boolean; type: 'ipfs' | 'local' }> {
    try {
      if (hash.startsWith('local:')) {
        const actualHash = hash.replace('local:', '');
        const filePath = join(this.localStoragePath, actualHash);
        
        if (existsSync(filePath)) {
          const buffer = await this.getLocalFile(actualHash);
          return {
            size: buffer.length,
            exists: true,
            type: 'local',
          };
        }
        
        return { size: 0, exists: false, type: 'local' };
      }

      // Check IPFS
      const stat = await this.client.files.stat(`/ipfs/${hash}`);
      return {
        size: stat.size,
        exists: true,
        type: 'ipfs',
      };
    } catch (error) {
      // Check local storage as fallback
      const filePath = join(this.localStoragePath, hash);
      if (existsSync(filePath)) {
        const buffer = await this.getLocalFile(hash);
        return {
          size: buffer.length,
          exists: true,
          type: 'local',
        };
      }
      
      return { size: 0, exists: false, type: 'local' };
    }
  }

  /**
   * Cleanup old files (for maintenance)
   */
  async cleanup(olderThanDays: number = 30): Promise<{ removed: number; errors: number }> {
    // This would implement cleanup logic for old cached files
    // For now, return placeholder
    return { removed: 0, errors: 0 };
  }
}

// Export singleton instance
export const ipfsService = new IPFSService();