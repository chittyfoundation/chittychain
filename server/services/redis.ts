import Redis from 'ioredis';
import { env } from '../config/environment';

class RedisService {
  private client: Redis | null = null;
  private connected = false;

  constructor() {
    this.connect();
  }

  private async connect() {
    try {
      this.client = new Redis({
        host: env.REDIS_HOST || 'localhost',
        port: env.REDIS_PORT || 6379,
        password: env.REDIS_PASSWORD,
        db: env.REDIS_DB || 0,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        connectTimeout: 5000,
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected');
        this.connected = true;
      });

      this.client.on('error', (error) => {
        console.error('❌ Redis connection error:', error);
        this.connected = false;
      });

      this.client.on('close', () => {
        console.log('🔌 Redis connection closed');
        this.connected = false;
      });

      // Test connection
      await this.client.ping();
    } catch (error) {
      console.error('Redis initialization failed:', error);
      // Continue without Redis for graceful degradation
      this.client = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key: string, value: string, expireInSeconds?: number): Promise<boolean> {
    if (!this.client) return false;

    try {
      if (expireInSeconds) {
        await this.client.setex(key, expireInSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  async incr(key: string): Promise<number | null> {
    if (!this.client) return null;

    try {
      return await this.client.incr(key);
    } catch (error) {
      console.error('Redis INCR error:', error);
      return null;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.expire(key, seconds);
      return true;
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      return false;
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.client) return null;

    try {
      return await this.client.hget(key, field);
    } catch (error) {
      console.error('Redis HGET error:', error);
      return null;
    }
  }

  async hset(key: string, field: string, value: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.hset(key, field, value);
      return true;
    } catch (error) {
      console.error('Redis HSET error:', error);
      return false;
    }
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    if (!this.client) return null;

    try {
      return await this.client.hgetall(key);
    } catch (error) {
      console.error('Redis HGETALL error:', error);
      return null;
    }
  }

  async sadd(key: string, member: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.sadd(key, member);
      return true;
    } catch (error) {
      console.error('Redis SADD error:', error);
      return false;
    }
  }

  async srem(key: string, member: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.srem(key, member);
      return true;
    } catch (error) {
      console.error('Redis SREM error:', error);
      return false;
    }
  }

  async smembers(key: string): Promise<string[]> {
    if (!this.client) return [];

    try {
      return await this.client.smembers(key);
    } catch (error) {
      console.error('Redis SMEMBERS error:', error);
      return [];
    }
  }

  // Session management
  async setSession(sessionId: string, data: any, expireInSeconds = 86400): Promise<boolean> {
    return await this.set(`session:${sessionId}`, JSON.stringify(data), expireInSeconds);
  }

  async getSession(sessionId: string): Promise<any | null> {
    const data = await this.get(`session:${sessionId}`);
    if (!data) return null;
    
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Session parse error:', error);
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return await this.del(`session:${sessionId}`);
  }

  // Rate limiting
  async isRateLimited(key: string, limit: number, windowSeconds: number): Promise<{ limited: boolean; remaining: number; resetTime: number }> {
    if (!this.client) {
      return { limited: false, remaining: limit, resetTime: Date.now() + windowSeconds * 1000 };
    }

    try {
      const current = await this.incr(key);
      if (current === null) {
        return { limited: false, remaining: limit, resetTime: Date.now() + windowSeconds * 1000 };
      }

      if (current === 1) {
        await this.expire(key, windowSeconds);
      }

      const remaining = Math.max(0, limit - current);
      const limited = current > limit;
      const resetTime = Date.now() + windowSeconds * 1000;

      return { limited, remaining, resetTime };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { limited: false, remaining: limit, resetTime: Date.now() + windowSeconds * 1000 };
    }
  }

  // Cache management
  async cache<T>(key: string, fetcher: () => Promise<T>, ttlSeconds = 3600): Promise<T | null> {
    try {
      // Try to get from cache first
      const cached = await this.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch data
      const data = await fetcher();
      if (data !== null && data !== undefined) {
        await this.set(key, JSON.stringify(data), ttlSeconds);
      }

      return data;
    } catch (error) {
      console.error('Cache operation error:', error);
      // Fall back to direct fetcher call
      return await fetcher();
    }
  }

  async invalidateCache(pattern: string): Promise<number> {
    if (!this.client) return 0;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return 0;
    }
  }

  // Pub/Sub for real-time updates
  async publish(channel: string, message: any): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.publish(channel, JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Redis PUBLISH error:', error);
      return false;
    }
  }

  createSubscriber(): Redis | null {
    if (!this.isConnected()) return null;

    try {
      return new Redis({
        host: env.REDIS_HOST || 'localhost',
        port: env.REDIS_PORT || 6379,
        password: env.REDIS_PASSWORD,
        db: env.REDIS_DB || 0,
      });
    } catch (error) {
      console.error('Redis subscriber creation error:', error);
      return null;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
    if (!this.client) {
      return { status: 'unhealthy', error: 'Redis client not initialized' };
    }

    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;

      return { status: 'healthy', latency };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
    }
  }
}

// Export singleton instance
export const redisService = new RedisService();