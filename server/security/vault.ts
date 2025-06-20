import vault from 'node-vault';
import { env } from '../config/environment';
import crypto from 'crypto';

interface SecretData {
  value: string;
  metadata?: Record<string, any>;
  version?: number;
}

export class VaultService {
  private client: any;
  private isInitialized: boolean = false;
  private cache: Map<string, { value: string; expiry: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeVault();
  }

  private async initializeVault() {
    try {
      this.client = vault({
        endpoint: env.VAULT_ENDPOINT || 'http://localhost:8200',
        token: env.VAULT_TOKEN || 'dev-token'
      });

      // Test connection
      await this.client.health();
      this.isInitialized = true;
      console.log('✅ Connected to HashiCorp Vault');
    } catch (error) {
      console.error('❌ Vault connection failed:', error);
      this.isInitialized = false;
    }
  }

  // Store secret with automatic encryption
  async storeSecret(path: string, data: SecretData): Promise<void> {
    try {
      const encryptedData = {
        ...data,
        value: this.encrypt(data.value),
        timestamp: new Date().toISOString(),
        rotationDue: this.calculateRotationDate()
      };

      if (this.isInitialized) {
        await this.client.write(`secret/data/${path}`, { data: encryptedData });
      } else {
        // Fallback to environment variables in dev
        process.env[`VAULT_${path.toUpperCase()}`] = JSON.stringify(encryptedData);
      }

      // Clear cache
      this.cache.delete(path);
    } catch (error) {
      throw new Error(`Failed to store secret: ${error}`);
    }
  }

  // Retrieve secret with caching
  async getSecret(path: string): Promise<string | null> {
    try {
      // Check cache first
      const cached = this.cache.get(path);
      if (cached && cached.expiry > Date.now()) {
        return cached.value;
      }

      let secretData: any;

      if (this.isInitialized) {
        const response = await this.client.read(`secret/data/${path}`);
        secretData = response.data.data;
      } else {
        // Fallback to environment variables
        const envData = process.env[`VAULT_${path.toUpperCase()}`];
        if (envData) {
          secretData = JSON.parse(envData);
        } else {
          return null;
        }
      }

      if (secretData) {
        const decrypted = this.decrypt(secretData.value);
        
        // Cache the result
        this.cache.set(path, {
          value: decrypted,
          expiry: Date.now() + this.CACHE_TTL
        });

        return decrypted;
      }

      return null;
    } catch (error) {
      console.error(`Failed to retrieve secret: ${error}`);
      return null;
    }
  }

  // Rotate secrets automatically
  async rotateSecret(path: string, newValue: string): Promise<void> {
    try {
      // Get current version
      const current = await this.getSecret(path);
      
      // Store new version
      await this.storeSecret(path, {
        value: newValue,
        metadata: {
          previousValue: current,
          rotatedAt: new Date().toISOString(),
          rotatedBy: 'system'
        }
      });

      // Audit log
      console.log(`Secret rotated: ${path}`);
    } catch (error) {
      throw new Error(`Failed to rotate secret: ${error}`);
    }
  }

  // Dynamic secrets for database
  async getDatabaseCredentials(database: string): Promise<{
    username: string;
    password: string;
    ttl: number;
  } | null> {
    try {
      if (this.isInitialized) {
        const response = await this.client.read(`database/creds/${database}`);
        return {
          username: response.data.username,
          password: response.data.password,
          ttl: response.lease_duration
        };
      }

      // Fallback for development
      return {
        username: 'dev_user',
        password: 'dev_password',
        ttl: 3600
      };
    } catch (error) {
      console.error('Failed to get database credentials:', error);
      return null;
    }
  }

  // Encrypt data using Vault's transit engine
  async encryptData(plaintext: string): Promise<string> {
    try {
      if (this.isInitialized) {
        const response = await this.client.write('transit/encrypt/chittychain', {
          plaintext: Buffer.from(plaintext).toString('base64')
        });
        return response.data.ciphertext;
      }

      // Fallback encryption
      return this.encrypt(plaintext);
    } catch (error) {
      throw new Error(`Encryption failed: ${error}`);
    }
  }

  // Decrypt data using Vault's transit engine
  async decryptData(ciphertext: string): Promise<string> {
    try {
      if (this.isInitialized) {
        const response = await this.client.write('transit/decrypt/chittychain', {
          ciphertext
        });
        return Buffer.from(response.data.plaintext, 'base64').toString();
      }

      // Fallback decryption
      return this.decrypt(ciphertext);
    } catch (error) {
      throw new Error(`Decryption failed: ${error}`);
    }
  }

  // Generate secure tokens
  async generateToken(policies: string[], ttl: string = '24h'): Promise<string> {
    try {
      if (this.isInitialized) {
        const response = await this.client.tokenCreate({
          policies,
          ttl,
          renewable: true
        });
        return response.auth.client_token;
      }

      // Fallback token generation
      return crypto.randomBytes(32).toString('hex');
    } catch (error) {
      throw new Error(`Token generation failed: ${error}`);
    }
  }

  // PKI certificate generation
  async generateCertificate(commonName: string): Promise<{
    certificate: string;
    privateKey: string;
    serialNumber: string;
  } | null> {
    try {
      if (this.isInitialized) {
        const response = await this.client.write('pki/issue/chittychain', {
          common_name: commonName,
          ttl: '365d'
        });

        return {
          certificate: response.data.certificate,
          privateKey: response.data.private_key,
          serialNumber: response.data.serial_number
        };
      }

      // Fallback - return null in development
      return null;
    } catch (error) {
      console.error('Certificate generation failed:', error);
      return null;
    }
  }

  // Private encryption methods
  private encrypt(text: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(env.ENCRYPTION_KEY, 'utf8');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedData: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(env.ENCRYPTION_KEY, 'utf8');
    
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private calculateRotationDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 90); // 90 days rotation
    return date.toISOString();
  }
}

// Export singleton instance
export const vaultService = new VaultService();