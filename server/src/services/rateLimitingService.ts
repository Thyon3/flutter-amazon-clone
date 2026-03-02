import { Request, Response, NextFunction } from 'express';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Only count failed requests
  skipFailedRequests?: boolean; // Only count successful requests
  keyGenerator?: (req: Request) => string; // Custom key generator
  handler?: (req: Request, res: Response) => void; // Custom handler
  onLimitReached?: (req: Request, res: Response) => void; // Callback when limit is reached
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
  retryAfter: number; // seconds until reset
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter: number;
  totalHits: number;
}

export interface RateLimitStats {
  key: string;
  totalRequests: number;
  blockedRequests: number;
  averageRequestsPerMinute: number;
  peakRequestsPerMinute: number;
  lastRequestTime: Date;
  currentWindowRequests: number;
}

export class RateLimitingService {
  private static instances: Map<string, RateLimitingService> = new Map();
  private store: Map<string, { count: number; resetTime: number; lastReset: number }>;
  private stats: Map<string, RateLimitStats>;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      message: 'Too many requests, please try again later.',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    };

    this.store = new Map();
    this.stats = new Map();
    this.startCleanup();
  }

  private config: RateLimitConfig;

  // Create rate limiter middleware
  static create(config?: Partial<RateLimitConfig>): RateLimitingService {
    const key = JSON.stringify(config || {});
    
    if (!RateLimitingService.instances.has(key)) {
      RateLimitingService.instances.set(key, new RateLimitingService(config));
    }
    
    return RateLimitingService.instances.get(key)!;
  }

  // Rate limiting middleware
  middleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getKey(req);
      const result = this.checkLimit(key);

      // Add rate limit headers
      this.addRateLimitHeaders(res, result);

      if (!result.allowed) {
        // Update stats
        this.updateStats(key, false);

        // Call custom handler if provided
        if (this.config.handler) {
          this.config.handler(req, res);
          return;
        }

        // Call onLimitReached callback if provided
        if (this.config.onLimitReached) {
          this.config.onLimitReached(req, res);
        }

        // Send rate limit response
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: this.config.message,
          limit: result.limit,
          remaining: result.remaining,
          resetTime: result.resetTime,
          retryAfter: result.retryAfter,
        });
        return;
      }

      // Update stats for successful request
      this.updateStats(key, true);
      next();
    };
  }

  // Check rate limit for a key
  checkLimit(key: string): RateLimitResult {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record) {
      // First request for this key
      const resetTime = now + this.config.windowMs;
      this.store.set(key, {
        count: 1,
        resetTime,
        lastReset: now,
      });

      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        resetTime: new Date(resetTime),
        retryAfter: Math.ceil(this.config.windowMs / 1000),
        totalHits: 1,
      };
    }

    // Check if window has expired
    if (now > record.resetTime) {
      const resetTime = now + this.config.windowMs;
      this.store.set(key, {
        count: 1,
        resetTime,
        lastReset: now,
      });

      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        resetTime: new Date(resetTime),
        retryAfter: Math.ceil(this.config.windowMs / 1000),
        totalHits: 1,
      };
    }

    // Increment counter
    const newCount = record.count + 1;
    this.store.set(key, {
      ...record,
      count: newCount,
    });

    const allowed = newCount <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - newCount);

    return {
      allowed,
      limit: this.config.maxRequests,
      remaining,
      resetTime: new Date(record.resetTime),
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
      totalHits: newCount,
    };
  }

  // Get key for request
  private getKey(req: Request): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(req);
    }

    // Default key generation based on IP and user ID
    const ip = this.getClientIP(req);
    const userId = this.getUserId(req);
    
    return userId ? `user:${userId}` : `ip:${ip}`;
  }

  // Get client IP
  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  // Get user ID from request
  private getUserId(req: Request): string | null {
    // Try to get user ID from various sources
    return (
      (req as any).user?.id ||
      (req as any).user?._id ||
      req.headers['x-user-id'] as string ||
      null
    );
  }

  // Add rate limit headers to response
  private addRateLimitHeaders(res: Response, result: RateLimitResult): void {
    res.set('X-RateLimit-Limit', result.limit.toString());
    res.set('X-RateLimit-Remaining', result.remaining.toString());
    res.set('X-RateLimit-Reset', result.resetTime.toISOString());
    res.set('Retry-After', result.retryAfter.toString());
  }

  // Update statistics
  private updateStats(key: string, allowed: boolean): void {
    const now = new Date();
    let stats = this.stats.get(key);

    if (!stats) {
      stats = {
        key,
        totalRequests: 0,
        blockedRequests: 0,
        averageRequestsPerMinute: 0,
        peakRequestsPerMinute: 0,
        lastRequestTime: now,
        currentWindowRequests: 0,
      };
      this.stats.set(key, stats);
    }

    stats.totalRequests++;
    stats.lastRequestTime = now;

    if (!allowed) {
      stats.blockedRequests++;
    }

    // Update current window requests
    const record = this.store.get(key);
    if (record) {
      stats.currentWindowRequests = record.count;
    }

    // Calculate average requests per minute (simplified)
    const timeDiff = (now.getTime() - stats.lastRequestTime.getTime()) / (1000 * 60);
    if (timeDiff > 0) {
      stats.averageRequestsPerMinute = stats.currentWindowRequests / Math.max(1, this.config.windowMs / (1000 * 60));
      stats.peakRequestsPerMinute = Math.max(stats.peakRequestsPerMinute, stats.currentWindowRequests);
    }
  }

  // Get statistics for a key
  getStats(key: string): RateLimitStats | null {
    return this.stats.get(key) || null;
  }

  // Get all statistics
  getAllStats(): RateLimitStats[] {
    return Array.from(this.stats.values());
  }

  // Reset rate limit for a key
  resetKey(key: string): void {
    this.store.delete(key);
    const stats = this.stats.get(key);
    if (stats) {
      stats.currentWindowRequests = 0;
    }
  }

  // Reset all rate limits
  resetAll(): void {
    this.store.clear();
    this.stats.clear();
  }

  // Get current limits for a key
  getCurrentLimit(key: string): RateLimitInfo | null {
    const record = this.store.get(key);
    if (!record) {
      return null;
    }

    const now = Date.now();
    const remaining = Math.max(0, this.config.maxRequests - record.count);
    const resetTime = new Date(record.resetTime);
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);

    return {
      limit: this.config.maxRequests,
      current: record.count,
      remaining,
      resetTime,
      retryAfter,
    };
  }

  // Check if key is currently rate limited
  isRateLimited(key: string): boolean {
    const result = this.checkLimit(key);
    return !result.allowed;
  }

  // Get time until reset for a key
  getTimeUntilReset(key: string): number {
    const record = this.store.get(key);
    if (!record) {
      return 0;
    }

    const now = Date.now();
    return Math.max(0, record.resetTime - now);
  }

  // Set custom configuration
  setConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get current configuration
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  // Create multiple rate limiters with different configurations
  static createMultiple(configs: Array<{ name: string; config: Partial<RateLimitConfig> }>): Map<string, RateLimitingService> {
    const limiters = new Map<string, RateLimitingService>();

    configs.forEach(({ name, config }) => {
      limiters.set(name, new RateLimitingService(config));
    });

    return limiters;
  }

  // Create rate limiter for specific endpoints
  static createForEndpoints(endpoints: Array<{ path: string; config: Partial<RateLimitConfig> }>): (req: Request, res: Response, next: NextFunction) => void {
    const limiters = new Map<string, RateLimitingService>();

    endpoints.forEach(({ path, config }) => {
      limiters.set(path, new RateLimitingService(config));
    });

    return (req: Request, res: Response, next: NextFunction) => {
      const limiter = limiters.get(req.path);
      if (limiter) {
        return limiter.middleware()(req, res, next);
      }
      next();
    };
  }

  // Create rate limiter for different user tiers
  static createForTiers(tiers: Array<{ name: string; condition: (req: Request) => boolean; config: Partial<RateLimitConfig> }>): (req: Request, res: Response, next: NextFunction) => void {
    const limiters = new Map<string, RateLimitingService>();

    tiers.forEach(({ name, config }) => {
      limiters.set(name, new RateLimitingService(config));
    });

    return (req: Request, res: Response, next: NextFunction) => {
      for (const { name, condition } of tiers) {
        if (condition(req)) {
          const limiter = limiters.get(name);
          if (limiter) {
            return limiter.middleware()(req, res, next);
          }
        }
      }
      next();
    };
  }

  // Create sliding window rate limiter
  static createSlidingWindow(config: { windowMs: number; maxRequests: number }): RateLimitingService {
    return new RateLimitingService({
      ...config,
      keyGenerator: (req: Request) => {
        const ip = req.headers['x-forwarded-for'] as string || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
        return `${ip}:${windowStart}`;
      },
    });
  }

  // Create distributed rate limiter (for multiple servers)
  static createDistributed(config: Partial<RateLimitConfig> & { redis?: any; keyPrefix?: string }): RateLimitingService {
    // In a real implementation, you'd use Redis or another distributed store
    // For now, we'll use in-memory store with a different key structure
    return new RateLimitingService({
      ...config,
      keyGenerator: (req: Request) => {
        const ip = req.headers['x-forwarded-for'] as string || req.connection.remoteAddress || 'unknown';
        const userId = (req as any).user?.id;
        const prefix = (config as any).keyPrefix || 'rate_limit';
        const key = userId ? `${prefix}:user:${userId}` : `${prefix}:ip:${ip}`;
        return key;
      },
    });
  }

  // Create adaptive rate limiter (adjusts based on load)
  static createAdaptive(baseConfig: Partial<RateLimitConfig>): RateLimitingService {
    const adaptiveLimiter = new RateLimitingService(baseConfig);

    // Override the checkLimit method to add adaptive logic
    const originalCheckLimit = adaptiveLimiter.checkLimit.bind(adaptiveLimiter);
    
    adaptiveLimiter.checkLimit = (key: string): RateLimitResult => {
      const result = originalCheckLimit(key);
      
      // Adjust limits based on current load
      const currentLoad = adaptiveLimiter.getCurrentSystemLoad();
      let adjustedMaxRequests = baseConfig.maxRequests || 100;
      
      if (currentLoad > 0.8) {
        adjustedMaxRequests = Math.floor(adjustedMaxRequests * 0.5); // Reduce by 50% under high load
      } else if (currentLoad > 0.6) {
        adjustedMaxRequests = Math.floor(adjustedMaxRequests * 0.75); // Reduce by 25% under medium load
      }
      
      // Recalculate remaining based on adjusted limit
      const remaining = Math.max(0, adjustedMaxRequests - result.totalHits);
      
      return {
        ...result,
        limit: adjustedMaxRequests,
        remaining,
        allowed: result.totalHits <= adjustedMaxRequests,
      };
    };

    return adaptiveLimiter;
  }

  // Get current system load (mock implementation)
  private getCurrentSystemLoad(): number {
    // In a real implementation, you'd check CPU, memory, etc.
    // For now, return a random load between 0 and 1
    return Math.random();
  }

  // Start cleanup process
  private startCleanup(): void {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    
    // Clean up rate limit store
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime + this.config.windowMs) {
        this.store.delete(key);
      }
    }

    // Clean up old stats (older than 24 hours)
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
    for (const [key, stats] of this.stats.entries()) {
      if (stats.lastRequestTime.getTime() < twentyFourHoursAgo) {
        this.stats.delete(key);
      }
    }
  }

  // Stop cleanup process
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  // Export rate limit data
  exportData(): any {
    return {
      config: this.config,
      currentLimits: Array.from(this.store.entries()).map(([key, record]) => ({
        key,
        ...record,
        resetTime: new Date(record.resetTime),
      })),
      statistics: Array.from(this.stats.values()),
      timestamp: new Date(),
    };
  }

  // Import rate limit data
  importData(data: any): void {
    if (data.config) {
      this.config = { ...this.config, ...data.config };
    }

    if (data.currentLimits) {
      this.store.clear();
      data.currentLimits.forEach((item: any) => {
        this.store.set(item.key, {
          count: item.count,
          resetTime: item.resetTime.getTime(),
          lastReset: item.lastReset || Date.now(),
        });
      });
    }

    if (data.statistics) {
      this.stats.clear();
      data.statistics.forEach((stat: RateLimitStats) => {
        this.stats.set(stat.key, {
          ...stat,
          lastRequestTime: new Date(stat.lastRequestTime),
        });
      });
    }
  }

  // Get health status
  getHealthStatus(): any {
    const now = Date.now();
    const activeKeys = this.store.size;
    const totalRequests = Array.from(this.stats.values()).reduce((sum, stat) => sum + stat.totalRequests, 0);
    const blockedRequests = Array.from(this.stats.values()).reduce((sum, stat) => sum + stat.blockedRequests, 0);

    return {
      status: 'healthy',
      activeKeys,
      totalRequests,
      blockedRequests,
      blockRate: totalRequests > 0 ? (blockedRequests / totalRequests) * 100 : 0,
      memoryUsage: {
        storeSize: this.store.size,
        statsSize: this.stats.size,
      },
      uptime: process.uptime(),
      timestamp: new Date(),
    };
  }

  // Create rate limiter for GraphQL
  static createForGraphQL(config: Partial<RateLimitConfig>): any {
    const limiter = new RateLimitingService(config);

    return {
      async resolve(resolve: any, reject: any, args: any) {
        const { context } = args;
        const req = context.req;
        const result = limiter.checkLimit(limiter.getKey(req));

        if (!result.allowed) {
          return reject(new Error('Rate limit exceeded'));
        }

        return resolve(args);
      },
    };
  }

  // Create rate limiter for WebSocket connections
  static createForWebSocket(config: Partial<RateLimitConfig>): any {
    const limiter = new RateLimitingService(config);

    return {
      handleConnection: (ws: any, req: Request) => {
        const key = limiter.getKey(req);
        const result = limiter.checkLimit(key);

        if (!result.allowed) {
          ws.close(429, 'Rate limit exceeded');
          return false;
        }

        return true;
      },
    };
  }

  // Create rate limiter with burst capacity
  static createWithBurst(config: { windowMs: number; maxRequests: number; burstCapacity: number }): RateLimitingService {
    return new RateLimitingService({
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      keyGenerator: (req: Request) => {
        const baseKey = req.headers['x-forwarded-for'] as string || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        const burstWindow = Math.floor(now / 1000); // 1-second burst window
        return `${baseKey}:${burstWindow}`;
      },
    });
  }
}
