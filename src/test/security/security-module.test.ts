/**
 * Security Module Integration Tests
 * Tests for the main security module and toggle functionality
 * @author The Base Event Team
 * @since 1.0.0
 */

import { EventEmitter } from "../../core/emitter";
import {
  createSecurityModule,
  createSecurityMiddleware,
  type SecurityConfig,
} from "../../security/index";
import { waitForAsync, createSpyCallback } from "../setup";

describe("Security Module - Toggle Functionality", () => {
  let security: ReturnType<typeof createSecurityModule>;

  beforeEach(() => {
    security = createSecurityModule({ enabled: false });
  });

  it("should be disabled by default", () => {
    expect(security.isEnabled()).toBe(false);
  });

  it("should enable security", () => {
    security.enable();
    expect(security.isEnabled()).toBe(true);
  });

  it("should disable security", () => {
    security.enable();
    security.disable();
    expect(security.isEnabled()).toBe(false);
  });

  it("should report enabled state correctly", () => {
    expect(security.isEnabled()).toBe(false);
    security.enable();
    expect(security.isEnabled()).toBe(true);
    security.disable();
    expect(security.isEnabled()).toBe(false);
  });
});

describe("Security Module - Configuration", () => {
  it("should create module with sanitization enabled", () => {
    const security = createSecurityModule({
      enabled: true,
      sanitization: {
        enabled: true,
        config: { stripScriptTags: true },
      },
    });

    const result = security.sanitizePayload('<script>alert(1)</script>');
    expect(result).not.toContain("<script>");
  });

  it("should create module with filtering enabled", () => {
    const security = createSecurityModule({
      enabled: true,
      filtering: {
        enabled: true,
        config: {
          mode: "blacklist",
          blockedPatterns: ["admin:*"],
          defaultBehavior: "allow",
        },
      },
    });

    expect(security.isChannelAllowed("admin:delete")).toBe(false);
    expect(security.isChannelAllowed("user:events")).toBe(true);
  });

  it("should create module with rate limiting enabled", () => {
    const security = createSecurityModule({
      enabled: true,
      rateLimiting: {
        enabled: true,
        config: {
          eventsPerSecond: 5,
          burstCapacity: 5,
          scope: "global",
        },
      },
    });

    for (let i = 0; i < 5; i++) {
      expect(security.checkRateLimit().allowed).toBe(true);
    }
    expect(security.checkRateLimit().allowed).toBe(false);
  });

  it("should update configuration at runtime", () => {
    const security = createSecurityModule({ enabled: false });

    security.updateConfig({
      enabled: true,
      filtering: {
        enabled: true,
        config: {
          mode: "whitelist",
          allowedChannels: ["user:*"],
          defaultBehavior: "deny",
        },
      },
    });

    expect(security.isEnabled()).toBe(true);
    expect(security.isChannelAllowed("user:events")).toBe(true);
    expect(security.isChannelAllowed("admin:events")).toBe(false);
  });

  it("should get current configuration", () => {
    const security = createSecurityModule({
      enabled: true,
      sanitization: { enabled: true },
    });

    const config = security.getConfig();
    expect(config.enabled).toBe(true);
    expect(config.sanitization?.enabled).toBe(true);
  });
});

describe("Security Module - Middleware Integration", () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  afterEach(() => {
    emitter.destroy();
  });

  it("should process events through security middleware when enabled", async () => {
    const security = createSecurityModule({
      enabled: true,
      sanitization: {
        enabled: true,
        config: { encodeHtmlEntities: true },
      },
    });

    emitter.use(security.createMiddleware());

    const callback = createSpyCallback<string>();
    emitter.on<string>("test-channel", callback);

    emitter.emit<string>("test-channel", '<script>alert(1)</script>');

    await waitForAsync();

    expect(callback).toHaveBeenCalled();
    const receivedData = callback.mock.calls[0][0].data;
    expect(receivedData).not.toContain("<script>");
  });

  it("should block channels when filtering is enabled", async () => {
    const security = createSecurityModule({
      enabled: true,
      filtering: {
        enabled: true,
        config: {
          mode: "blacklist",
          blockedPatterns: ["blocked:*"],
          defaultBehavior: "allow",
        },
      },
    });

    emitter.use(security.createMiddleware());

    const callback = createSpyCallback<string>();
    emitter.on<string>("blocked:channel", callback);

    emitter.emit<string>("blocked:channel", "test-data");

    await waitForAsync();

    expect(callback).not.toHaveBeenCalled();
  });

  it("should allow channels when filtering is enabled", async () => {
    const security = createSecurityModule({
      enabled: true,
      filtering: {
        enabled: true,
        config: {
          mode: "blacklist",
          blockedPatterns: ["blocked:*"],
          defaultBehavior: "allow",
        },
      },
    });

    emitter.use(security.createMiddleware());

    const callback = createSpyCallback<string>();
    emitter.on<string>("allowed:channel", callback);

    emitter.emit<string>("allowed:channel", "test-data");

    await waitForAsync();

    expect(callback).toHaveBeenCalled();
  });

  it("should not process events when disabled", async () => {
    const security = createSecurityModule({
      enabled: false,
      sanitization: {
        enabled: true,
        config: { encodeHtmlEntities: true },
      },
    });

    emitter.use(security.createMiddleware());

    const callback = createSpyCallback<string>();
    emitter.on<string>("test-channel", callback);

    emitter.emit<string>("test-channel", '<script>alert(1)</script>');

    await waitForAsync();

    expect(callback).toHaveBeenCalled();
    const receivedData = callback.mock.calls[0][0].data;
    expect(receivedData).toContain("<script>");
  });
});

describe("Security Module - Rate Limiting with Callbacks", () => {
  let emitter: EventEmitter;
  let rateLimitCallback: jest.Mock;

  beforeEach(() => {
    emitter = new EventEmitter();
    rateLimitCallback = jest.fn();
  });

  afterEach(() => {
    emitter.destroy();
  });

  it("should trigger callback when rate limit exceeded", async () => {
    const security = createSecurityModule({
      enabled: true,
      rateLimiting: {
        enabled: true,
        config: {
          eventsPerSecond: 2,
          burstCapacity: 2,
          scope: "global",
        },
        onLimitExceeded: rateLimitCallback,
      },
    });

    emitter.use(security.createMiddleware());

    const callback = createSpyCallback<string>();
    emitter.on<string>("test-channel", callback);

    emitter.emit<string>("test-channel", "data1");
    emitter.emit<string>("test-channel", "data2");
    emitter.emit<string>("test-channel", "data3");

    await waitForAsync();

    expect(rateLimitCallback).toHaveBeenCalled();
  });

  it("should provide detailed rate limit info in callback", async () => {
    const callback = jest.fn();
    const security = createSecurityModule({
      enabled: true,
      rateLimiting: {
        enabled: true,
        config: {
          eventsPerSecond: 1,
          burstCapacity: 1,
          scope: "global",
        },
        onLimitExceeded: callback,
      },
    });

    emitter.use(security.createMiddleware());

    const handler = createSpyCallback<string>();
    emitter.on<string>("test-channel", handler);

    emitter.emit<string>("test-channel", "data1");
    emitter.emit<string>("test-channel", "data2");

    await waitForAsync();

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "global",
        eventsPerSecond: 1,
        burstCapacity: 1,
      })
    );
  });
});

describe("Security Module - XSS Detection", () => {
  it("should detect XSS payloads", () => {
    const security = createSecurityModule({ enabled: false });

    expect(security.isXssPayload('<script>alert(1)</script>')).toBe(true);
    expect(security.isXssPayload('<img src=x onerror="alert(1)">')).toBe(true);
    expect(security.isXssPayload("Hello World")).toBe(false);
  });
});

describe("Security Module - Channel Filtering Results", () => {
  it("should return detailed filter results", () => {
    const security = createSecurityModule({
      enabled: true,
      filtering: {
        enabled: true,
        config: {
          mode: "whitelist",
          allowedChannels: ["user:*"],
          defaultBehavior: "deny",
        },
      },
    });

    const result = security.filterChannel("user:login");
    expect(result.allowed).toBe(true);
    expect(result.matchedPattern).toBe("user:*");

    const blockedResult = security.filterChannel("admin:delete");
    expect(blockedResult.allowed).toBe(false);
    expect(blockedResult.reason).toBeDefined();
  });
});

describe("Security Module - Helper Methods", () => {
  it("should provide access to rate limiter", () => {
    const security = createSecurityModule({
      enabled: true,
      rateLimiting: {
        enabled: true,
        config: {
          eventsPerSecond: 100,
          burstCapacity: 100,
          scope: "global",
        },
      },
    });

    const rateLimiter = security.getRateLimiter();
    expect(rateLimiter).not.toBeNull();
    expect(rateLimiter?.getConfig().eventsPerSecond).toBe(100);
  });

  it("should provide access to channel filter", () => {
    const security = createSecurityModule({
      enabled: true,
      filtering: {
        enabled: true,
        config: {
          mode: "blacklist",
          blockedPatterns: ["admin:*"],
          defaultBehavior: "allow",
        },
      },
    });

    const channelFilter = security.getChannelFilter();
    expect(channelFilter).not.toBeNull();
    expect(channelFilter?.allow("admin:delete")).toBe(false);
  });

  it("should return null when feature not enabled", () => {
    const security = createSecurityModule({ enabled: true });

    expect(security.getRateLimiter()).toBeNull();
    expect(security.getChannelFilter()).toBeNull();
  });
});

describe("Security Module - Edge Cases", () => {
  it("should handle multiple security features enabled", () => {
    const security = createSecurityModule({
      enabled: true,
      sanitization: { enabled: true },
      filtering: {
        enabled: true,
        config: {
          mode: "blacklist",
          blockedPatterns: ["bad:*"],
          defaultBehavior: "allow",
        },
      },
      rateLimiting: {
        enabled: true,
        config: {
          eventsPerSecond: 1000,
          burstCapacity: 1000,
          scope: "global",
        },
      },
    });

    expect(security.isEnabled()).toBe(true);
    expect(security.sanitizePayload('<script>alert(1)</script>')).not.toContain("<script>");
    expect(security.isChannelAllowed("bad:channel")).toBe(false);
    expect(security.isChannelAllowed("good:channel")).toBe(true);
    expect(security.checkRateLimit().allowed).toBe(true);
  });

  it("should not sanitize when sanitization is disabled in config", () => {
    const security = createSecurityModule({
      enabled: true,
      sanitization: { enabled: false },
    });

    const result = security.sanitizePayload('<script>alert(1)</script>');
    expect(result).toContain("<script>");
  });
});

describe("Security Middleware - Factory Function", () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  afterEach(() => {
    emitter.destroy();
  });

  it("should create middleware with config", async () => {
    const middleware = createSecurityMiddleware({
      enabled: true,
      sanitization: { enabled: true },
    });

    emitter.use(middleware);

    const callback = createSpyCallback<string>();
    emitter.on<string>("test", callback);

    emitter.emit<string>("test", "data");

    await waitForAsync();

    expect(callback).toHaveBeenCalled();
  });
});
