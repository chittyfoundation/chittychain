/**
 * ChittyBeacon Service - Integrated app tracking for ChittyChain ecosystem
 * Based on @chittycorp/app-beacon functionality
 */

import { createServer } from 'http';
import { neonStorage as storage } from '../neon-storage.js';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { hostname, type, release, uptime } from 'os';

export interface BeaconData {
  id: string;
  name: string;
  version: string;
  platform: string;
  environment: string;
  hostname: string;
  node_version: string;
  os: string;
  has_claude_code: boolean;
  has_git: boolean;
  started_at: string;
  pid: number;
  event: 'startup' | 'heartbeat' | 'shutdown' | 'custom';
  timestamp: string;
  uptime?: number;
  git?: {
    branch: string;
    commit: string;
    remote: string;
  };
  replit?: {
    id: string;
    slug: string;
    owner: string;
    url: string;
  };
  github?: {
    repository: string;
    workflow: string;
    run_id: string;
    actor: string;
  };
  vercel?: {
    url: string;
    env: string;
    region: string;
  };
  metadata?: Record<string, any>;
}

export interface BeaconRecord extends BeaconData {
  recordId: string;
  last_seen: string;
  created_at: Date;
}

export class ChittyBeaconService {
  private static instance: ChittyBeaconService;
  private config = {
    endpoint: process.env.BEACON_ENDPOINT || 'internal',
    interval: parseInt(process.env.BEACON_INTERVAL || '300000'), // 5 minutes
    enabled: process.env.BEACON_DISABLED !== 'true',
    silent: process.env.BEACON_VERBOSE !== 'true'
  };
  private appInfo: BeaconData | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  static getInstance(): ChittyBeaconService {
    if (!ChittyBeaconService.instance) {
      ChittyBeaconService.instance = new ChittyBeaconService();
    }
    return ChittyBeaconService.instance;
  }

  private generateAppId(): string {
    if (process.env.REPL_ID) return `replit-${process.env.REPL_ID}`;
    if (process.env.GITHUB_REPOSITORY) return `github-${process.env.GITHUB_REPOSITORY.replace('/', '-')}`;
    if (process.env.VERCEL_URL) return `vercel-${process.env.VERCEL_URL}`;
    if (process.env.HEROKU_APP_NAME) return `heroku-${process.env.HEROKU_APP_NAME}`;

    try {
      const pkg = JSON.parse(readFileSync(process.cwd() + '/package.json', 'utf8'));
      return `npm-${pkg.name}`;
    } catch (e) {
      return `host-${hostname()}`;
    }
  }

  private detectAppName(): string {
    return process.env.REPL_SLUG ||
           process.env.GITHUB_REPOSITORY ||
           process.env.VERCEL_URL ||
           process.env.HEROKU_APP_NAME ||
           process.env.npm_package_name ||
           (() => {
             try {
               const pkg = JSON.parse(readFileSync(process.cwd() + '/package.json', 'utf8'));
               return pkg.name;
             } catch (e) {
               return 'chittychain-app';
             }
           })();
  }

  private detectVersion(): string {
    try {
      const pkg = JSON.parse(readFileSync(process.cwd() + '/package.json', 'utf8'));
      return pkg.version;
    } catch (e) {
      return '1.0.0';
    }
  }

  private detectPlatform(): string {
    if (process.env.REPL_ID) return 'replit';
    if (process.env.GITHUB_ACTIONS) return 'github-actions';
    if (process.env.VERCEL) return 'vercel';
    if (process.env.NETLIFY) return 'netlify';
    if (process.env.RENDER) return 'render';
    if (process.env.HEROKU_APP_NAME) return 'heroku';
    if (process.env.AWS_LAMBDA_FUNCTION_NAME) return 'aws-lambda';
    if (process.env.GOOGLE_CLOUD_PROJECT) return 'google-cloud';
    if (process.env.WEBSITE_INSTANCE_ID) return 'azure';
    return 'unknown';
  }

  private detectClaudeCode(): boolean {
    return process.env.CLAUDE_CODE === 'true' ||
           existsSync('.claude') ||
           existsSync('claude.json') ||
           (() => {
             try {
               const pkg = JSON.parse(readFileSync(process.cwd() + '/package.json', 'utf8'));
               return !!(pkg.devDependencies?.['@anthropic-ai/sdk'] ||
                        pkg.dependencies?.['@anthropic-ai/sdk'] ||
                        pkg.devDependencies?.['@anthropic/claude'] ||
                        pkg.dependencies?.['@anthropic/claude']);
             } catch (e) {
               return false;
             }
           })();
  }

  public detectApp(): BeaconData {
    const app: BeaconData = {
      // Identity
      id: this.generateAppId(),
      name: this.detectAppName(),
      version: this.detectVersion(),

      // Platform
      platform: this.detectPlatform(),
      environment: process.env.NODE_ENV || 'production',

      // System
      hostname: hostname(),
      node_version: process.version,
      os: `${type()} ${release()}`,

      // Features
      has_claude_code: this.detectClaudeCode(),
      has_git: existsSync('.git'),

      // Metadata
      started_at: new Date().toISOString(),
      pid: process.pid,
      event: 'startup',
      timestamp: new Date().toISOString()
    };

    // Add git info if available
    if (app.has_git) {
      try {
        app.git = {
          branch: execSync('git branch --show-current', { encoding: 'utf8' }).trim(),
          commit: execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(),
          remote: execSync('git remote get-url origin', { encoding: 'utf8' }).trim()
        };
      } catch (e) {
        // Git commands failed, but that's okay
      }
    }

    // Platform-specific info
    if (process.env.REPL_ID) {
      app.replit = {
        id: process.env.REPL_ID,
        slug: process.env.REPL_SLUG || '',
        owner: process.env.REPL_OWNER || '',
        url: `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      };
    }

    if (process.env.GITHUB_REPOSITORY) {
      app.github = {
        repository: process.env.GITHUB_REPOSITORY,
        workflow: process.env.GITHUB_WORKFLOW || '',
        run_id: process.env.GITHUB_RUN_ID || '',
        actor: process.env.GITHUB_ACTOR || ''
      };
    }

    if (process.env.VERCEL) {
      app.vercel = {
        url: process.env.VERCEL_URL || '',
        env: process.env.VERCEL_ENV || '',
        region: process.env.VERCEL_REGION || ''
      };
    }

    return app;
  }

  private async storeBeacon(data: BeaconData): Promise<BeaconRecord> {
    const record: BeaconRecord = {
      ...data,
      recordId: Math.random().toString(36).substr(2, 9),
      last_seen: new Date().toISOString(),
      created_at: new Date()
    };

    // Store using generic storage interface
    try {
      await storage.createAuditLog({
        id: record.recordId,
        action: `beacon_${data.event}`,
        details: JSON.stringify(record),
        timestamp: new Date(),
        userId: null,
        metadata: {
          beacon: true,
          app_id: data.id,
          platform: data.platform
        }
      });
    } catch (error) {
      console.error('Failed to store beacon:', error);
    }

    return record;
  }

  public async sendBeacon(data: BeaconData): Promise<void> {
    if (!this.config.enabled) return;

    try {
      // Store locally
      await this.storeBeacon(data);

      if (!this.config.silent) {
        console.log(`[ChittyBeacon] ${data.event} from ${data.name} (${data.platform})`);
      }
    } catch (error) {
      if (!this.config.silent) {
        console.log(`[ChittyBeacon] Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  public async initialize(): Promise<void> {
    if (!this.config.enabled) {
      if (!this.config.silent) {
        console.log('[ChittyBeacon] Disabled');
      }
      return;
    }

    this.appInfo = this.detectApp();

    // Send initial beacon
    await this.sendBeacon({
      ...this.appInfo,
      event: 'startup',
      timestamp: new Date().toISOString()
    });

    // Send periodic heartbeats
    this.heartbeatInterval = setInterval(async () => {
      if (this.appInfo) {
        await this.sendBeacon({
          id: this.appInfo.id,
          name: this.appInfo.name,
          version: this.appInfo.version,
          platform: this.appInfo.platform,
          environment: this.appInfo.environment,
          hostname: this.appInfo.hostname,
          node_version: this.appInfo.node_version,
          os: this.appInfo.os,
          has_claude_code: this.appInfo.has_claude_code,
          has_git: this.appInfo.has_git,
          started_at: this.appInfo.started_at,
          pid: this.appInfo.pid,
          event: 'heartbeat',
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        });
      }
    }, this.config.interval);

    // Don't keep process alive just for beacon
    if (this.heartbeatInterval) {
      this.heartbeatInterval.unref();
    }

    // Send shutdown beacon
    const shutdown = async () => {
      if (this.appInfo) {
        await this.sendBeacon({
          id: this.appInfo.id,
          name: this.appInfo.name,
          version: this.appInfo.version,
          platform: this.appInfo.platform,
          environment: this.appInfo.environment,
          hostname: this.appInfo.hostname,
          node_version: this.appInfo.node_version,
          os: this.appInfo.os,
          has_claude_code: this.appInfo.has_claude_code,
          has_git: this.appInfo.has_git,
          started_at: this.appInfo.started_at,
          pid: this.appInfo.pid,
          event: 'shutdown',
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        });
      }
    };

    process.once('exit', shutdown);
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);

    if (!this.config.silent) {
      console.log(`[ChittyBeacon] Tracking ${this.appInfo.name} on ${this.appInfo.platform}`);
    }
  }

  public async getBeaconHistory(): Promise<BeaconRecord[]> {
    try {
      const auditLogs = await storage.getAllAuditLogs();
      return auditLogs
        .filter(log => log.metadata?.beacon === true)
        .map(log => {
          try {
            return JSON.parse(log.details) as BeaconRecord;
          } catch {
            return null;
          }
        })
        .filter(record => record !== null)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch {
      return [];
    }
  }

  public async getStats(): Promise<{
    total_beacons: number;
    active_apps: number;
    platforms: Record<string, number>;
    recent_activity: number;
  }> {
    try {
      const history = await this.getBeaconHistory();
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);

      const platforms: Record<string, number> = {};
      const activeApps = new Set<string>();
      let recentActivity = 0;

      history.forEach(record => {
        platforms[record.platform] = (platforms[record.platform] || 0) + 1;
        activeApps.add(record.id);
        
        if (new Date(record.timestamp).getTime() > oneHourAgo) {
          recentActivity++;
        }
      });

      return {
        total_beacons: history.length,
        active_apps: activeApps.size,
        platforms,
        recent_activity: recentActivity
      };
    } catch {
      return {
        total_beacons: 0,
        active_apps: 0,
        platforms: {},
        recent_activity: 0
      };
    }
  }

  public getConfig() {
    return { ...this.config };
  }

  public getAppInfo() {
    return this.appInfo ? { ...this.appInfo } : null;
  }
}

// Singleton instance
export const chittyBeacon = ChittyBeaconService.getInstance();