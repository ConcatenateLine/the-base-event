/**
 * Rate Limiting Module
 * Token bucket algorithm implementation for event rate limiting
 * @author The Base Event Team
 * @since 1.0.0
 */

export type RateLimitScope = "global" | "per-channel";

export type RateLimit = RateLimitScope;

export interface RateLimitConfig {
  eventsPerSecond: number;
  burstCapacity: number;
  scope: RateLimitScope;
  windowSize?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingTokens: number;
  resetAt: number;
  retryAfter?: number;
}

export interface RateLimitExceededCallback {
  (data: {
    channel?: string;
    scope: RateLimitScope;
    eventsPerSecond: number;
    burstCapacity: number;
    currentTokens: number;
    timestamp: number;
  }): void;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
}

interface ChannelBuckets {
  [channel: string]: TokenBucket;
}

const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  eventsPerSecond: 100,
  burstCapacity: 150,
  scope: "global",
};

export class RateLimiter {
  private config: RateLimitConfig;
  private globalBucket: TokenBucket;
  private channelBuckets: ChannelBuckets;
  private onLimitExceeded?: RateLimitExceededCallback;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
    this.globalBucket = this.createBucket(this.config.burstCapacity);
    this.channelBuckets = {};
  }

  private createBucket(maxTokens: number): TokenBucket {
    return {
      tokens: maxTokens,
      lastRefill: Date.now(),
      maxTokens,
    };
  }

  private refillBucket(bucket: TokenBucket): TokenBucket {
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.config.eventsPerSecond;

    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    return bucket;
  }

  setOnLimitExceeded(callback: RateLimitExceededCallback): void {
    this.onLimitExceeded = callback;
  }

  check(channel?: string): RateLimitResult {
    if (this.config.scope === "global") {
      return this.checkGlobal();
    }
    return this.checkChannel(channel || "default");
  }

  private checkGlobal(): RateLimitResult {
    this.refillBucket(this.globalBucket);

    if (this.globalBucket.tokens >= 1) {
      this.globalBucket.tokens -= 1;
      return {
        allowed: true,
        remainingTokens: Math.floor(this.globalBucket.tokens),
        resetAt: this.globalBucket.lastRefill + 1000,
      };
    }

    if (this.onLimitExceeded) {
      this.onLimitExceeded({
        scope: "global",
        eventsPerSecond: this.config.eventsPerSecond,
        burstCapacity: this.config.burstCapacity,
        currentTokens: this.globalBucket.tokens,
        timestamp: Date.now(),
      });
    }

    const retryAfter = Math.ceil((1 - this.globalBucket.tokens) / this.config.eventsPerSecond * 1000);

    return {
      allowed: false,
      remainingTokens: 0,
      resetAt: this.globalBucket.lastRefill + 1000,
      retryAfter,
    };
  }

  private checkChannel(channel: string): RateLimitResult {
    let bucket = this.channelBuckets[channel];

    if (!bucket) {
      bucket = this.createBucket(this.config.burstCapacity);
      this.channelBuckets[channel] = bucket;
    }

    this.refillBucket(bucket);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return {
        allowed: true,
        remainingTokens: Math.floor(bucket.tokens),
        resetAt: bucket.lastRefill + 1000,
      };
    }

    if (this.onLimitExceeded) {
      this.onLimitExceeded({
        channel,
        scope: "per-channel",
        eventsPerSecond: this.config.eventsPerSecond,
        burstCapacity: this.config.burstCapacity,
        currentTokens: bucket.tokens,
        timestamp: Date.now(),
      });
    }

    const retryAfter = Math.ceil((1 - bucket.tokens) / this.config.eventsPerSecond * 1000);

    return {
      allowed: false,
      remainingTokens: 0,
      resetAt: bucket.lastRefill + 1000,
      retryAfter,
    };
  }

  allow(channel?: string): boolean {
    return this.check(channel).allowed;
  }

  reset(channel?: string): void {
    if (this.config.scope === "global" || !channel) {
      this.globalBucket = this.createBucket(this.config.burstCapacity);
    }
    if (channel && this.channelBuckets[channel]) {
      delete this.channelBuckets[channel];
    }
  }

  resetAll(): void {
    this.globalBucket = this.createBucket(this.config.burstCapacity);
    this.channelBuckets = {};
  }

  getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
    this.globalBucket.maxTokens = this.config.burstCapacity;
  }

  getStatus(channel?: string): {
    tokens: number;
    maxTokens: number;
    lastRefill: number;
  } {
    if (this.config.scope === "global" || !channel) {
      return {
        tokens: this.globalBucket.tokens,
        maxTokens: this.globalBucket.maxTokens,
        lastRefill: this.globalBucket.lastRefill,
      };
    }

    const bucket = this.channelBuckets[channel];
    if (!bucket) {
      return {
        tokens: this.config.burstCapacity,
        maxTokens: this.config.burstCapacity,
        lastRefill: Date.now(),
      };
    }

    return {
      tokens: bucket.tokens,
      maxTokens: bucket.maxTokens,
      lastRefill: bucket.lastRefill,
    };
  }
}

export function createRateLimiter(
  config: Partial<RateLimitConfig> = {}
): RateLimiter {
  return new RateLimiter(config);
}

export function createGlobalRateLimiter(
  eventsPerSecond: number,
  burstCapacity?: number
): RateLimiter {
  return new RateLimiter({
    eventsPerSecond,
    burstCapacity: burstCapacity || Math.ceil(eventsPerSecond * 1.5),
    scope: "global",
  });
}

export function createPerChannelRateLimiter(
  eventsPerSecond: number,
  burstCapacity?: number
): RateLimiter {
  return new RateLimiter({
    eventsPerSecond,
    burstCapacity: burstCapacity || Math.ceil(eventsPerSecond * 1.5),
    scope: "per-channel",
  });
}
