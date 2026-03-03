/**
 * Rate Limiting Module Tests
 * Tests for token bucket rate limiting algorithm
 * @author The Base Event Team
 * @since 1.0.0
 */

import {
  RateLimiter,
  createRateLimiter,
  createGlobalRateLimiter,
  createPerChannelRateLimiter,
  type RateLimitResult,
} from "../../security/rate-limiting";

describe("Rate Limiting - Basic Global Rate Limiting", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = createGlobalRateLimiter(10, 10);
  });

  it("should allow requests within rate limit", () => {
    const result = limiter.check();
    expect(result.allowed).toBe(true);
  });

  it("should track remaining tokens", () => {
    limiter.check();
    const result = limiter.check();
    expect(result.remainingTokens).toBeLessThanOrEqual(9);
  });

  it("should eventually exhaust tokens under sustained load", () => {
    for (let i = 0; i < 15; i++) {
      limiter.check();
    }
    const result = limiter.check();
    expect(result.allowed).toBe(false);
  });

  it("should provide reset timestamp", () => {
    const result = limiter.check();
    expect(result.resetAt).toBeDefined();
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});

describe("Rate Limiting - Per-Channel Rate Limiting", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = createPerChannelRateLimiter(5, 5);
  });

  it("should limit each channel independently", () => {
    for (let i = 0; i < 5; i++) {
      expect(limiter.check("channel1").allowed).toBe(true);
    }
    expect(limiter.check("channel1").allowed).toBe(false);
    expect(limiter.check("channel2").allowed).toBe(true);
  });

  it("should track channels separately", () => {
    limiter.check("channel1");
    limiter.check("channel1");
    limiter.check("channel2");

    const status1 = limiter.getStatus("channel1");
    const status2 = limiter.getStatus("channel2");

    expect(status1.tokens).not.toEqual(status2.tokens);
  });
});

describe("Rate Limiting - Token Bucket Refill", () => {
  it("should refill tokens over time", async () => {
    const limiter = createGlobalRateLimiter(100, 5);

    for (let i = 0; i < 5; i++) {
      limiter.check();
    }

    expect(limiter.check().allowed).toBe(false);

    await new Promise(resolve => setTimeout(resolve, 50));

    const result = limiter.check();
    expect(result.allowed).toBe(true);
  });
});

describe("Rate Limiting - Callback Handling", () => {
  it("should call callback when rate limit is exceeded", () => {
    const callback = jest.fn();
    const limiter = new RateLimiter({
      eventsPerSecond: 1,
      burstCapacity: 1,
      scope: "global",
    });
    limiter.setOnLimitExceeded(callback);

    limiter.check();
    limiter.check();

    expect(callback).toHaveBeenCalled();
  });

  it("should provide callback with rate limit details", () => {
    const callback = jest.fn();
    const limiter = new RateLimiter({
      eventsPerSecond: 10,
      burstCapacity: 10,
      scope: "global",
    });
    limiter.setOnLimitExceeded(callback);

    for (let i = 0; i < 15; i++) {
      limiter.check();
    }

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "global",
        eventsPerSecond: 10,
        burstCapacity: 10,
        timestamp: expect.any(Number),
      })
    );
  });
});

describe("Rate Limiting - Reset Functionality", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = createGlobalRateLimiter(5, 5);
  });

  it("should reset global bucket", () => {
    for (let i = 0; i < 5; i++) {
      limiter.check();
    }
    expect(limiter.check().allowed).toBe(false);

    limiter.reset();
    expect(limiter.check().allowed).toBe(true);
  });

  it("should reset specific channel", () => {
    const perChannelLimiter = createPerChannelRateLimiter(2, 2);

    perChannelLimiter.check("channel1");
    perChannelLimiter.check("channel1");
    expect(perChannelLimiter.check("channel1").allowed).toBe(false);

    perChannelLimiter.reset("channel1");
    expect(perChannelLimiter.check("channel1").allowed).toBe(true);
  });

  it("should reset all channels", () => {
    const perChannelLimiter = createPerChannelRateLimiter(1, 1);

    perChannelLimiter.check("channel1");
    perChannelLimiter.check("channel2");

    perChannelLimiter.resetAll();

    expect(perChannelLimiter.check("channel1").allowed).toBe(true);
    expect(perChannelLimiter.check("channel2").allowed).toBe(true);
  });
});

describe("Rate Limiting - Configuration Updates", () => {
  it("should update rate limit configuration", () => {
    const limiter = createRateLimiter({
      eventsPerSecond: 10,
      burstCapacity: 10,
      scope: "global",
    });

    limiter.updateConfig({ eventsPerSecond: 100 });

    expect(limiter.getConfig().eventsPerSecond).toBe(100);
  });

  it("should preserve bucket capacity after config update", () => {
    const limiter = createRateLimiter({
      eventsPerSecond: 10,
      burstCapacity: 10,
      scope: "global",
    });

    limiter.check();
    limiter.updateConfig({ eventsPerSecond: 20 });

    const status = limiter.getStatus();
    expect(status.maxTokens).toBe(10);
  });
});

describe("Rate Limiting - Status Information", () => {
  it("should return correct status for global limiter", () => {
    const limiter = createGlobalRateLimiter(100, 50);
    limiter.check();
    limiter.check();

    const status = limiter.getStatus();
    expect(status.maxTokens).toBe(50);
    expect(status.tokens).toBeLessThan(50);
    expect(status.lastRefill).toBeDefined();
  });

  it("should return fresh bucket status for unknown channel", () => {
    const limiter = createPerChannelRateLimiter(10, 10);

    const status = limiter.getStatus("new-channel");
    expect(status.tokens).toBe(10);
    expect(status.maxTokens).toBe(10);
  });
});

describe("Rate Limiting - Convenience Methods", () => {
  it("should use allow() method for quick checks", () => {
    const limiter = createGlobalRateLimiter(5, 5);

    expect(limiter.allow()).toBe(true);
    limiter.check();
    limiter.check();
    limiter.check();
    limiter.check();
    limiter.check();

    expect(limiter.allow()).toBe(false);
  });

  it("should create rate limiter with createRateLimiter", () => {
    const limiter = createRateLimiter({
      eventsPerSecond: 50,
      burstCapacity: 100,
      scope: "global",
    });

    expect(limiter.getConfig().eventsPerSecond).toBe(50);
    expect(limiter.getConfig().burstCapacity).toBe(100);
    expect(limiter.getConfig().scope).toBe("global");
  });
});

describe("Rate Limiting - Edge Cases", () => {
  it("should handle very high rate limits", () => {
    const limiter = createGlobalRateLimiter(10000, 10000);
    const result = limiter.check();
    expect(result.allowed).toBe(true);
  });

  it("should handle very low rate limits", () => {
    const limiter = createGlobalRateLimiter(0.1, 1);

    expect(limiter.check().allowed).toBe(true);
    expect(limiter.check().allowed).toBe(false);
  });

  it("should provide retryAfter when rate limited", () => {
    const limiter = createGlobalRateLimiter(1, 1);
    limiter.check();
    const result = limiter.check();

    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("should handle burst capacity correctly", () => {
    const limiter = createGlobalRateLimiter(10, 100);

    for (let i = 0; i < 100; i++) {
      expect(limiter.check().allowed).toBe(true);
    }

    expect(limiter.check().allowed).toBe(false);
  });
});

describe("Rate Limiting - Scope Handling", () => {
  it("should use global scope by default", () => {
    const limiter = new RateLimiter({ eventsPerSecond: 10, burstCapacity: 10 });
    expect(limiter.getConfig().scope).toBe("global");
  });

  it("should support per-channel scope", () => {
    const limiter = new RateLimiter({
      eventsPerSecond: 10,
      burstCapacity: 10,
      scope: "per-channel",
    });

    expect(limiter.check("channel1").allowed).toBe(true);
    expect(limiter.check("channel2").allowed).toBe(true);
  });
});
