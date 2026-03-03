/**
 * Channel Filtering Module
 * Implements whitelist/blacklist filtering with glob pattern support
 * @author The Base Event Team
 * @since 1.0.0
 */

export type FilterMode = "whitelist" | "blacklist";

export interface ChannelFilterConfig {
  mode: FilterMode;
  allowedChannels: string[];
  blockedPatterns: string[];
  defaultBehavior: "allow" | "deny";
}

export interface FilterResult {
  allowed: boolean;
  reason?: string;
  matchedPattern?: string;
}

const DEFAULT_FILTER_CONFIG: ChannelFilterConfig = {
  mode: "blacklist",
  allowedChannels: [],
  blockedPatterns: [],
  defaultBehavior: "allow",
};

function escapeGlobPattern(pattern: string): string {
  return pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
}

function createGlobRegex(pattern: string): RegExp {
  const escaped = escapeGlobPattern(pattern);
  return new RegExp(`^${escaped}$`, "i");
}

export function createChannelFilter(
  config: Partial<ChannelFilterConfig> = {}
): (channel: string) => FilterResult {
  const finalConfig: ChannelFilterConfig = {
    ...DEFAULT_FILTER_CONFIG,
    ...config,
  };

  const allowedRegexes = finalConfig.allowedChannels.map(createGlobRegex);
  const blockedRegexes = finalConfig.blockedPatterns.map(createGlobRegex);

  return (channel: string): FilterResult => {
    if (!channel || typeof channel !== "string") {
      return {
        allowed: false,
        reason: "Invalid channel: must be a non-empty string",
      };
    }

    if (finalConfig.mode === "whitelist") {
      if (allowedRegexes.length === 0) {
        const defaultAllowed = finalConfig.defaultBehavior === "allow";
        return {
          allowed: defaultAllowed,
          reason: defaultAllowed
            ? "No whitelist configured, using default allow"
            : "No whitelist configured, using default deny",
        };
      }

      for (let i = 0; i < allowedRegexes.length; i++) {
        if (allowedRegexes[i].test(channel)) {
          return {
            allowed: true,
            matchedPattern: finalConfig.allowedChannels[i],
          };
        }
      }

      return {
        allowed: false,
        reason: `Channel "${channel}" not in whitelist`,
      };
    }

    for (let i = 0; i < blockedRegexes.length; i++) {
      if (blockedRegexes[i].test(channel)) {
        return {
          allowed: false,
          reason: `Channel "${channel}" matches blocked pattern "${finalConfig.blockedPatterns[i]}"`,
          matchedPattern: finalConfig.blockedPatterns[i],
        };
      }
    }

    const defaultAllowed = finalConfig.defaultBehavior === "allow";
    return {
      allowed: defaultAllowed,
      reason: defaultAllowed
        ? "Channel not blocked, using default allow"
        : "Channel not in whitelist, using default deny",
    };
  };
}

export function isChannelAllowed(
  channel: string,
  config: Partial<ChannelFilterConfig> = {}
): boolean {
  const filter = createChannelFilter(config);
  return filter(channel).allowed;
}

export function filterChannels(
  channels: string[],
  config: Partial<ChannelFilterConfig> = {}
): string[] {
  const filter = createChannelFilter(config);
  return channels.filter(channel => filter(channel).allowed);
}

export class ChannelFilter {
  private config: ChannelFilterConfig;
  private filter: (channel: string) => FilterResult;

  constructor(config: Partial<ChannelFilterConfig> = {}) {
    this.config = { ...DEFAULT_FILTER_CONFIG, ...config };
    this.filter = createChannelFilter(this.config);
  }

  allow(channel: string): boolean {
    return this.filter(channel).allowed;
  }

  filterEvent(channel: string): FilterResult {
    return this.filter(channel);
  }

  updateConfig(config: Partial<ChannelFilterConfig>): void {
    this.config = { ...this.config, ...config };
    this.filter = createChannelFilter(this.config);
  }

  getConfig(): ChannelFilterConfig {
    return { ...this.config };
  }

  addAllowedChannel(pattern: string): void {
    if (!this.config.allowedChannels.includes(pattern)) {
      this.config.allowedChannels.push(pattern);
      this.filter = createChannelFilter(this.config);
    }
  }

  addBlockedPattern(pattern: string): void {
    if (!this.config.blockedPatterns.includes(pattern)) {
      this.config.blockedPatterns.push(pattern);
      this.filter = createChannelFilter(this.config);
    }
  }

  removeAllowedChannel(pattern: string): void {
    const idx = this.config.allowedChannels.indexOf(pattern);
    if (idx !== -1) {
      this.config.allowedChannels.splice(idx, 1);
      this.filter = createChannelFilter(this.config);
    }
  }

  removeBlockedPattern(pattern: string): void {
    const idx = this.config.blockedPatterns.indexOf(pattern);
    if (idx !== -1) {
      this.config.blockedPatterns.splice(idx, 1);
      this.filter = createChannelFilter(this.config);
    }
  }

  clearRules(): void {
    this.config.allowedChannels = [];
    this.config.blockedPatterns = [];
    this.filter = createChannelFilter(this.config);
  }
}

export function createWhitelistFilter(
  allowedChannels: string[]
): ChannelFilter {
  return new ChannelFilter({
    mode: "whitelist",
    allowedChannels,
    defaultBehavior: "deny",
  });
}

export function createBlacklistFilter(
  blockedPatterns: string[]
): ChannelFilter {
  return new ChannelFilter({
    mode: "blacklist",
    blockedPatterns,
    defaultBehavior: "allow",
  });
}
