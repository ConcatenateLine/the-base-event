/**
 * Sanitization Module Tests
 * Tests for XSS prevention and input sanitization
 * @author The Base Event Team
 * @since 1.0.0
 */

import {
  sanitizeString,
  sanitizeObject,
  isXssPayload,
  sanitizeChannel,
  createSanitizer,
  XSS_PATTERNS,
  DEFAULT_SANITIZATION_CONFIG,
  type SanitizationConfig,
} from "../../security/sanitization";

describe("Sanitization - Basic String Sanitization", () => {
  it("should not modify safe strings", () => {
    const input = "Hello, World!";
    const result = sanitizeString(input);
    expect(result).toBe(input);
  });

  it("should strip script tags by default", () => {
    const input = '<script>alert("xss")</script>Hello';
    const result = sanitizeString(input);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("</script>");
    expect(result).toContain("Hello");
  });

  it("should strip style tags by default", () => {
    const input = "<style>body{display:none}</style>Hello";
    const result = sanitizeString(input);
    expect(result).not.toContain("<style");
    expect(result).not.toContain("</style>");
  });

  it("should strip event handlers by default", () => {
    const input = '<div onclick="alert(1)">Click me</div>';
    const result = sanitizeString(input);
    expect(result).not.toContain("onclick");
  });

  it("should strip script tags completely", () => {
    const input = "<script>alert('xss')</script>";
    const result = sanitizeString(input);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert");
    expect(result).toBe("");
  });

  it("should handle mixed XSS attempts", () => {
    const input = '<img src=x onerror="alert(1)"><script>evil()</script>';
    const result = sanitizeString(input);
    expect(result).not.toContain("<img");
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("<script");
  });
});

describe("Sanitization - Configuration Options", () => {
  it("should strip script tags first, then encode remaining", () => {
    const input = '<script>alert("xss")</script>';
    const result = sanitizeString(input);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("<");
  });

  it("should allow disabling script tag stripping", () => {
    const input = '<script>alert("xss")</script>';
    const result = sanitizeString(input, {
      stripScriptTags: false,
      encodeHtmlEntities: false,
    });
    expect(result).toContain("<script>");
  });

  it("should allow disabling style tag stripping", () => {
    const input = "<style>body{display:none}</style>";
    const result = sanitizeString(input, {
      stripStyleTags: false,
      encodeHtmlEntities: false,
    });
    expect(result).toContain("<style>");
  });

  it("should allow disabling HTML entity encoding", () => {
    const input = "<div>Hello</div>";
    const result = sanitizeString(input, { encodeHtmlEntities: false });
    expect(result).toContain("<div>");
  });

  it("should strip HTML tags and keep allowed attributes", () => {
    const input = '<a href="http://example.com" onclick="evil()">Link</a>';
    const result = sanitizeString(input, {
      stripHtmlTags: true,
      allowAttributes: ["href"],
    });
    expect(result).not.toContain("onclick");
    expect(result).toContain("href=");
  });
});

describe("Sanitization - Object Sanitization", () => {
  it("should sanitize strings in objects", () => {
    const input = {
      name: '<script>alert("xss")</script>',
      age: 25,
    };
    const result = sanitizeObject(input) as Record<string, unknown>;
    expect(result.name).not.toContain("<script>");
    expect(result.age).toBe(25);
  });

  it("should sanitize nested objects", () => {
    const input = {
      user: {
        profile: {
          bio: '<img src=x onerror="alert(1)">',
        },
      },
    };
    const result = sanitizeObject(input) as Record<string, unknown>;
    const bio = (result.user as Record<string, unknown>).profile as Record<
      string,
      unknown
    >;
    expect(bio.bio).not.toContain("<img");
  });

  it("should sanitize arrays", () => {
    const input = ["<script>alert(1)</script>", { name: "<img src=x>" }];
    const result = sanitizeObject(input) as unknown[];
    expect(result[0]).not.toContain("<script>");
    expect((result[1] as Record<string, unknown>).name).not.toContain("<img");
  });

  it("should handle null values", () => {
    const input = { value: null };
    const result = sanitizeObject(input) as Record<string, unknown>;
    expect(result.value).toBeNull();
  });

  it("should handle undefined values", () => {
    const input = { value: undefined };
    const result = sanitizeObject(input) as Record<string, unknown>;
    expect(result.value).toBeUndefined();
  });

  it("should handle primitive values", () => {
    expect(sanitizeObject(42)).toBe(42);
    expect(sanitizeObject(true)).toBe(true);
  });
});

describe("Sanitization - XSS Detection", () => {
  it("should detect script tag XSS", () => {
    expect(isXssPayload("<script>alert(1)</script>")).toBe(true);
  });

  it("should detect event handler XSS", () => {
    expect(isXssPayload('<div onmouseover="alert(1)">')).toBe(true);
  });

  it("should detect img onerror XSS", () => {
    expect(isXssPayload('<img src=x onerror="alert(1)">')).toBe(true);
  });

  it("should return false for safe strings", () => {
    expect(isXssPayload("Hello World")).toBe(false);
    expect(isXssPayload("No XSS here")).toBe(false);
  });
});

describe("Sanitization - Channel Sanitization", () => {
  it("should validate empty channels", () => {
    expect(sanitizeChannel("")).toBe(false);
    expect(sanitizeChannel(null as unknown as string)).toBe(false);
  });

  it("should validate channel types", () => {
    expect(sanitizeChannel(123 as unknown as string)).toBe(false);
  });

  it("should filter by whitelist", () => {
    expect(sanitizeChannel("user:events", ["user:*"])).toBe(true);
    expect(sanitizeChannel("admin:events", ["user:*"])).toBe(false);
  });

  it("should filter by blacklist", () => {
    expect(sanitizeChannel("safe:channel", undefined, ["admin:*"])).toBe(true);
    expect(sanitizeChannel("admin:delete", undefined, ["admin:*"])).toBe(false);
  });

  it("should support glob patterns", () => {
    expect(sanitizeChannel("user:123:event", ["user:*:*"])).toBe(true);
    expect(sanitizeChannel("user:123", ["user:*"])).toBe(true);
  });
});

describe("Sanitization - Factory Function", () => {
  it("should create a reusable sanitizer", () => {
    const sanitizer = createSanitizer({
      stripScriptTags: true,
      encodeHtmlEntities: false,
    });
    expect(sanitizer("<script>alert(1)</script>")).not.toContain("<script>");
  });

  it("should apply custom config to factory", () => {
    const sanitizer = createSanitizer({
      encodeHtmlEntities: false,
    });
    const result = sanitizer("<div>test</div>");
    expect(result).toContain("<div>");
  });
});

describe("Sanitization - Edge Cases", () => {
  it("should handle empty strings", () => {
    expect(sanitizeString("")).toBe("");
  });

  it("should handle very long strings", () => {
    const longString = "a".repeat(10000);
    const result = sanitizeString(longString);
    expect(result.length).toBe(longString.length);
  });

  it("should handle nested script tags", () => {
    const input = "<scr<script>ipt>alert(1)</scr</script>ipt>";
    const result = sanitizeString(input);
    expect(result).not.toContain("<script>");
  });

  it("should handle malformed HTML", () => {
    const input = "<div><script>alert(1)</div>";
    const result = sanitizeString(input);
    expect(result).not.toContain("<script>");
  });

  it("should handle unicode characters", () => {
    const input = "Hello 世界 🌍";
    const result = sanitizeString(input);
    expect(result).toBe(input);
  });
});
