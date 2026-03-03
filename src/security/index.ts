/**
 * Security Module Entry Point
 * Wires all security features together with zero performance impact when disabled
 * @author The Base Event Team
 * @since 1.0.0
 */

import type { Middleware, BaseEvent } from "../core/events/typing";
import {
  sanitizeString,
  sanitizeObject,
  isXssPayload,
  type SanitizationConfig,
} from "./sanitization";
import {
  ChannelFilter,
  createWhitelistFilter,
  createBlacklistFilter,
  type ChannelFilterConfig,
  type FilterResult,
} from "./filtering";
import {
  RateLimiter,
  createRateLimiter,
  createGlobalRateLimiter,
  createPerChannelRateLimiter,
  type RateLimitConfig,
  type RateLimitResult,
  type RateLimitExceededCallback,
} from "./rate-limiting";

export type RateLimitScope = "global" | "per-channel";

export interface SecurityConfig {
  enabled: boolean;
  sanitization?: {
    enabled: boolean;
    config?: Partial<SanitizationConfig>;
  };
  filtering?: {
    enabled: boolean;
    config?: Partial<ChannelFilterConfig>;
  };
  rateLimiting?: {
    enabled: boolean;
    config?: Partial<RateLimitConfig>;
    onLimitExceeded?: RateLimitExceededCallback;
  };
}

export interface SecurityModule {
  isEnabled: () => boolean;
  enable: () => void;
  disable: () => void;
  createMiddleware: () => Middleware;
  sanitizePayload: <T>(data: T) => T;
  isXssPayload: (input: string) => boolean;
  filterChannel: (channel: string) => FilterResult;
  isChannelAllowed: (channel: string) => boolean;
  checkRateLimit: (channel?: string) => RateLimitResult;
  getRateLimiter: () => RateLimiter | null;
  getChannelFilter: () => ChannelFilter | null;
  updateConfig: (config: Partial<SecurityConfig>) => void;
  getConfig: () => SecurityConfig;
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enabled: false,
};

export function createSecurityModule(
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): SecurityModule {
  let enabled = config.enabled;
  let sanitizationConfig: Partial<SanitizationConfig> = {};
  let channelFilterConfig: Partial<ChannelFilterConfig> = {};
  let rateLimitConfig: Partial<RateLimitConfig> = {};
  let onRateLimitExceeded: RateLimitExceededCallback | undefined;

  let channelFilter: ChannelFilter | null = null;
  let rateLimiter: RateLimiter | null = null;

  if (config.sanitization?.enabled) {
    sanitizationConfig = config.sanitization.config || {};
  }

  if (config.filtering?.enabled) {
    channelFilterConfig = config.filtering.config || {};
    channelFilter = new ChannelFilter(channelFilterConfig);
  }

  if (config.rateLimiting?.enabled) {
    rateLimitConfig = config.rateLimiting.config || {};
    onRateLimitExceeded = config.rateLimiting.onLimitExceeded;
    rateLimiter = createRateLimiter(rateLimitConfig);
    if (onRateLimitExceeded) {
      rateLimiter.setOnLimitExceeded(onRateLimitExceeded);
    }
  }

  return {
    isEnabled: () => enabled,

    enable: () => {
      enabled = true;
    },

    disable: () => {
      enabled = false;
    },

    createMiddleware: (): Middleware => {
      return (event: BaseEvent, next: () => Promise<void> | void) => {
        if (!enabled) {
          return next();
        }

        if (channelFilter && !channelFilter.allow(event.channel)) {
          const result = channelFilter.filterEvent(event.channel);
          console.warn(
            `Security: Channel "${event.channel}" blocked: ${result.reason}`
          );
          throw new Error(
            `Security: Channel "${event.channel}" blocked: ${result.reason}`
          );
        }

        if (rateLimiter) {
          const rateResult = rateLimiter.check(event.channel);
          if (!rateResult.allowed) {
            console.warn(
              `Security: Rate limit exceeded for channel "${event.channel || "global"}"` +
                `, retry after ${rateResult.retryAfter}ms`
            );
            throw new Error(
              `Security: Rate limit exceeded for channel "${event.channel || "global"}"`
            );
          }
        }

        if (config.sanitization?.enabled && event.data !== undefined) {
          event.data = sanitizeObject(
            event.data,
            sanitizationConfig
          ) as typeof event.data;
        }

        return next();
      };
    },

    sanitizePayload: <T>(data: T): T => {
      if (!enabled || !config.sanitization?.enabled) {
        return data;
      }
      return sanitizeObject(data, sanitizationConfig) as T;
    },

    isXssPayload: (input: string): boolean => {
      return isXssPayload(input);
    },

    filterChannel: (channel: string): FilterResult => {
      if (!enabled || !channelFilter) {
        return { allowed: true };
      }
      return channelFilter.filterEvent(channel);
    },

    isChannelAllowed: (channel: string): boolean => {
      if (!enabled || !channelFilter) {
        return true;
      }
      return channelFilter.allow(channel);
    },

    checkRateLimit: (channel?: string): RateLimitResult => {
      if (!enabled || !rateLimiter) {
        return {
          allowed: true,
          remainingTokens: Number.MAX_SAFE_INTEGER,
          resetAt: Date.now() + 1000,
        };
      }
      return rateLimiter.check(channel);
    },

    getRateLimiter: (): RateLimiter | null => {
      return rateLimiter;
    },

    getChannelFilter: (): ChannelFilter | null => {
      return channelFilter;
    },

    updateConfig: (newConfig: Partial<SecurityConfig>): void => {
      if (newConfig.enabled !== undefined) {
        enabled = newConfig.enabled;
      }

      if (newConfig.sanitization) {
        sanitizationConfig = newConfig.sanitization.config || {};
      }

      if (newConfig.filtering?.enabled !== undefined) {
        if (newConfig.filtering.enabled && !channelFilter) {
          channelFilterConfig = newConfig.filtering.config || {};
          channelFilter = new ChannelFilter(channelFilterConfig);
        } else if (!newConfig.filtering.enabled) {
          channelFilter = null;
        }
      }

      if (newConfig.filtering?.config && channelFilter) {
        channelFilter.updateConfig(newConfig.filtering.config);
      }

      if (newConfig.rateLimiting?.enabled !== undefined) {
        if (newConfig.rateLimiting.enabled && !rateLimiter) {
          rateLimitConfig = newConfig.rateLimiting.config || {};
          rateLimiter = createRateLimiter(rateLimitConfig);
          if (newConfig.rateLimiting.onLimitExceeded) {
            rateLimiter.setOnLimitExceeded(
              newConfig.rateLimiting.onLimitExceeded
            );
          }
        } else if (!newConfig.rateLimiting.enabled) {
          rateLimiter = null;
        }
      }

      if (newConfig.rateLimiting?.config && rateLimiter) {
        rateLimiter.updateConfig(newConfig.rateLimiting.config);
      }

      if (newConfig.rateLimiting?.onLimitExceeded && rateLimiter) {
        rateLimiter.setOnLimitExceeded(newConfig.rateLimiting.onLimitExceeded);
      }
    },

    getConfig: (): SecurityConfig => {
      return {
        enabled,
        sanitization: config.sanitization
          ? {
              enabled: config.sanitization.enabled,
              config: sanitizationConfig,
            }
          : undefined,
        filtering: channelFilter
          ? {
              enabled: true,
              config: channelFilter.getConfig(),
            }
          : { enabled: false },
        rateLimiting: rateLimiter
          ? {
              enabled: true,
              config: rateLimiter.getConfig(),
            }
          : { enabled: false },
      };
    },
  };
}

export function createSecurityMiddleware(
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): Middleware {
  const security = createSecurityModule(config);
  return security.createMiddleware();
}

export {
  sanitizeString,
  sanitizeObject,
  isXssPayload,
  type SanitizationConfig,
  ChannelFilter,
  createWhitelistFilter,
  createBlacklistFilter,
  type ChannelFilterConfig,
  type FilterResult,
  RateLimiter,
  createRateLimiter,
  createGlobalRateLimiter,
  createPerChannelRateLimiter,
  type RateLimitConfig,
  type RateLimitResult,
  type RateLimitExceededCallback,
};
