/**
 * Channel Filtering Module Tests
 * Tests for whitelist/blacklist filtering with glob patterns
 * @author The Base Event Team
 * @since 1.0.0
 */

import {
  createChannelFilter,
  isChannelAllowed,
  filterChannels,
  ChannelFilter,
  createWhitelistFilter,
  createBlacklistFilter,
  type FilterResult,
  type ChannelFilterConfig,
} from "../../security/filtering";

describe("Channel Filtering - Basic Whitelist", () => {
  let filter: ChannelFilter;

  beforeEach(() => {
    filter = createWhitelistFilter(["user:*", "system:*"]);
  });

  it("should allow whitelisted channels", () => {
    expect(filter.allow("user:login")).toBe(true);
    expect(filter.allow("system:start")).toBe(true);
  });

  it("should block non-whitelisted channels", () => {
    expect(filter.allow("admin:delete")).toBe(false);
    expect(filter.allow("private:data")).toBe(false);
  });

  it("should return detailed filter results", () => {
    const result = filter.filterEvent("user:login");
    expect(result.allowed).toBe(true);
    expect(result.matchedPattern).toBe("user:*");
  });
});

describe("Channel Filtering - Basic Blacklist", () => {
  let filter: ChannelFilter;

  beforeEach(() => {
    filter = createBlacklistFilter(["admin:*", "private:*"]);
  });

  it("should block blacklisted channels", () => {
    expect(filter.allow("admin:delete")).toBe(false);
    expect(filter.allow("private:sensitive")).toBe(false);
  });

  it("should allow non-blacklisted channels", () => {
    expect(filter.allow("user:events")).toBe(true);
    expect(filter.allow("public:data")).toBe(true);
  });

  it("should return detailed filter results for blocked channels", () => {
    const result = filter.filterEvent("admin:secret");
    expect(result.allowed).toBe(false);
    expect(result.matchedPattern).toBe("admin:*");
    expect(result.reason).toContain("matches blocked pattern");
  });
});

describe("Channel Filtering - Glob Patterns", () => {
  it("should match single segment wildcard", () => {
    const filter = createWhitelistFilter(["test:*"]);
    expect(filter.allow("test:channel")).toBe(true);
    expect(filter.allow("test:anything")).toBe(true);
  });

  it("should match multi-segment wildcard", () => {
    const filter = createWhitelistFilter(["user:*:*"]);
    expect(filter.allow("user:123:event")).toBe(true);
    expect(filter.allow("user:id:action")).toBe(true);
  });

  it("should match single character wildcard", () => {
    const filter = createWhitelistFilter(["user?:events"]);
    expect(filter.allow("user1:events")).toBe(true);
    expect(filter.allow("user2:events")).toBe(true);
  });

  it("should handle multiple wildcards", () => {
    const filter = createWhitelistFilter(["*:private:*"]);
    expect(filter.allow("any:private:data")).toBe(true);
    expect(filter.allow("channel:private:sensitive")).toBe(true);
  });
});

describe("Channel Filtering - Case Sensitivity", () => {
  it("should be case insensitive", () => {
    const filter = createWhitelistFilter(["User:*"]);
    expect(filter.allow("USER:EVENTS")).toBe(true);
    expect(filter.allow("user:Events")).toBe(true);
  });
});

describe("Channel Filtering - Empty Channels", () => {
  let filter: ChannelFilter;

  beforeEach(() => {
    filter = new ChannelFilter({
      mode: "whitelist",
      allowedChannels: ["user:*"],
      defaultBehavior: "deny",
    });
  });

  it("should reject empty channels", () => {
    expect(filter.allow("")).toBe(false);
  });

  it("should reject null channels", () => {
    expect(filter.allow(null as unknown as string)).toBe(false);
  });

  it("should reject undefined channels", () => {
    expect(filter.allow(undefined as unknown as string)).toBe(false);
  });
});

describe("Channel Filtering - Default Behavior", () => {
  it("should use default allow when no whitelist configured", () => {
    const filter = new ChannelFilter({
      mode: "whitelist",
      allowedChannels: [],
      defaultBehavior: "allow",
    });
    expect(filter.allow("any:channel")).toBe(true);
  });

  it("should use default deny when no whitelist configured", () => {
    const filter = new ChannelFilter({
      mode: "whitelist",
      allowedChannels: [],
      defaultBehavior: "deny",
    });
    expect(filter.allow("any:channel")).toBe(false);
  });

  it("should use default behavior for blacklist", () => {
    const filter = new ChannelFilter({
      mode: "blacklist",
      blockedPatterns: [],
      defaultBehavior: "deny",
    });
    expect(filter.allow("any:channel")).toBe(false);
  });
});

describe("Channel Filtering - Runtime Updates", () => {
  let filter: ChannelFilter;

  beforeEach(() => {
    filter = createWhitelistFilter(["user:*"]);
  });

  it("should add allowed channels dynamically", () => {
    filter.addAllowedChannel("admin:*");
    expect(filter.allow("admin:panel")).toBe(true);
  });

  it("should add blocked patterns dynamically", () => {
    filter.addBlockedPattern("private:*");
    expect(filter.allow("private:data")).toBe(false);
  });

  it("should remove allowed channels", () => {
    filter.addAllowedChannel("admin:*");
    filter.removeAllowedChannel("admin:*");
    expect(filter.allow("admin:panel")).toBe(false);
  });

  it("should remove blocked patterns from blacklist filter", () => {
    const filter = createBlacklistFilter(["admin:*"]);
    filter.addBlockedPattern("private:*");
    filter.removeBlockedPattern("private:*");
    expect(filter.allow("private:data")).toBe(true);
  });

  it("should clear all rules", () => {
    filter.clearRules();
    const config = filter.getConfig();
    expect(config.allowedChannels).toHaveLength(0);
    expect(config.blockedPatterns).toHaveLength(0);
  });
});

describe("Channel Filtering - Helper Functions", () => {
  it("should use isChannelAllowed for quick checks", () => {
    expect(
      isChannelAllowed("user:events", {
        mode: "whitelist",
        allowedChannels: ["user:*"],
        defaultBehavior: "deny",
      })
    ).toBe(true);

    expect(
      isChannelAllowed("admin:events", {
        mode: "whitelist",
        allowedChannels: ["user:*"],
        defaultBehavior: "deny",
      })
    ).toBe(false);
  });

  it("should use filterChannels to filter arrays", () => {
    const channels = ["user:login", "admin:delete", "system:start", "private:data"];
    const result = filterChannels(channels, {
      mode: "blacklist",
      blockedPatterns: ["admin:*", "private:*"],
      defaultBehavior: "allow",
    });
    expect(result).toEqual(["user:login", "system:start"]);
  });
});

describe("Channel Filtering - Factory Function", () => {
  it("should create channel filter with config", () => {
    const filter = createChannelFilter({
      mode: "whitelist",
      allowedChannels: ["test:*"],
      defaultBehavior: "deny",
    });
    expect(filter("test:channel").allowed).toBe(true);
    expect(filter("other:channel").allowed).toBe(false);
  });

  it("should return detailed filter results", () => {
    const filterResult = createChannelFilter({
      mode: "whitelist",
      allowedChannels: ["user:*"],
      defaultBehavior: "deny",
    })("admin:panel");

    expect(filterResult.allowed).toBe(false);
    expect(filterResult.reason).toBeDefined();
  });
});

describe("Channel Filtering - Edge Cases", () => {
  it("should handle duplicate patterns", () => {
    const filter = createWhitelistFilter(["user:*", "user:*"]);
    expect(filter.allow("user:event")).toBe(true);
  });

  it("should handle overlapping patterns", () => {
    const filter = new ChannelFilter({
      mode: "whitelist",
      allowedChannels: ["user:*", "user:admin:*"],
      defaultBehavior: "deny",
    });
    expect(filter.allow("user:anything")).toBe(true);
    expect(filter.allow("user:admin:panel")).toBe(true);
  });

  it("should handle special characters in channel names", () => {
    const filter = createWhitelistFilter(["special-channels:*"]);
    expect(filter.allow("special-channels:test")).toBe(true);
  });
});
