/**
 * XSS Prevention - Input Sanitization Module
 * Provides configurable sanitization functions to prevent XSS attacks in string payloads
 * @author The Base Event Team
 * @since 1.0.0
 */

export interface SanitizationConfig {
  stripScriptTags: boolean;
  stripStyleTags: boolean;
  stripHtmlTags: boolean;
  stripEventHandlers: boolean;
  allowAttributes: string[];
  encodeHtmlEntities: boolean;
}

export const DEFAULT_SANITIZATION_CONFIG: SanitizationConfig = {
  stripScriptTags: true,
  stripStyleTags: true,
  stripHtmlTags: false,
  stripEventHandlers: true,
  allowAttributes: ["href", "src", "alt", "title", "class", "id"],
  encodeHtmlEntities: true,
};

const DANGEROUS_PROTOCOL_PATTERN = /^(javascript|vbscript|data):/i;
const SCRIPT_TAG_PATTERN =
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const STYLE_TAG_PATTERN = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi;
const EVENT_HANDLER_PATTERN = /\s+on\w+\s*=\s*(["']?)[^"'\s>]+(\1)/gi;
const HTML_TAG_PATTERN = /<(\/?)([\w-]+)([^>]*)>/gi;

const HTML_ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

function encodeHtmlEntities(str: string): string {
  return str.replace(/[&<>"'/]/g, char => HTML_ENTITY_MAP[char] || char);
}

function matchGlobPattern(pattern: string, text: string): boolean {
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${regexPattern}$`, "i").test(text);
}

export function sanitizeString(
  input: string,
  config: Partial<SanitizationConfig> = {}
): string {
  const finalConfig = { ...DEFAULT_SANITIZATION_CONFIG, ...config };
  let sanitized = input;

  if (finalConfig.stripScriptTags) {
    sanitized = sanitized.replace(SCRIPT_TAG_PATTERN, "");
  }

  if (finalConfig.stripStyleTags) {
    sanitized = sanitized.replace(STYLE_TAG_PATTERN, "");
  }

  if (finalConfig.stripEventHandlers) {
    sanitized = sanitized.replace(EVENT_HANDLER_PATTERN, "");
  }

  if (finalConfig.stripHtmlTags) {
    sanitized = sanitized.replace(
      HTML_TAG_PATTERN,
      (match, closing, tagName, attributes) => {
        if (!tagName) return "";

        const lowerTagName = tagName.toLowerCase();
        if (lowerTagName === "script" || lowerTagName === "style") {
          return "";
        }

        if (finalConfig.allowAttributes.length > 0 && attributes) {
          const allowedAttributes = finalConfig.allowAttributes.map(a =>
            a.toLowerCase()
          );
          const filteredAttributes = attributes.replace(
            /([\w-]+)=["']([^"']*)["']/gi,
            (attrMatch: string, attrName: string, attrValue: string) => {
              if (allowedAttributes.includes(attrName.toLowerCase())) {
                if (DANGEROUS_PROTOCOL_PATTERN.test(attrValue)) {
                  return "";
                }
                return attrMatch;
              }
              return "";
            }
          );
          return `<${closing}${tagName}${filteredAttributes}>`;
        }

        return closing ? `</${tagName}>` : "";
      }
    );
  }

  if (finalConfig.encodeHtmlEntities) {
    sanitized = encodeHtmlEntities(sanitized);
  }

  return sanitized;
}

export function sanitizeObject(
  obj: unknown,
  config: Partial<SanitizationConfig> = {}
): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return sanitizeString(obj, config);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, config));
  }

  if (typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      sanitized[key] = sanitizeObject(value, config);
    }
    return sanitized;
  }

  return obj;
}

export function isXssPayload(input: string): boolean {
  const testConfig: SanitizationConfig = {
    stripScriptTags: true,
    stripStyleTags: true,
    stripHtmlTags: true,
    stripEventHandlers: true,
    allowAttributes: [],
    encodeHtmlEntities: false,
  };

  const beforeSanitize = input;
  const afterSanitize = sanitizeString(input, testConfig);

  return beforeSanitize !== afterSanitize;
}

export function sanitizeChannel(
  channel: string,
  allowedChannels?: string[],
  blockedPatterns?: string[]
): boolean {
  if (!channel || typeof channel !== "string") {
    return false;
  }

  if (blockedPatterns && blockedPatterns.length > 0) {
    for (const pattern of blockedPatterns) {
      if (matchGlobPattern(pattern, channel)) {
        return false;
      }
    }
  }

  if (allowedChannels && allowedChannels.length > 0) {
    return allowedChannels.some(allowed => matchGlobPattern(allowed, channel));
  }

  return true;
}

export function createSanitizer(
  config: Partial<SanitizationConfig> = {}
): (input: string) => string {
  const finalConfig = { ...DEFAULT_SANITIZATION_CONFIG, ...config };
  return (input: string) => sanitizeString(input, finalConfig);
}

export const XSS_PATTERNS = {
  scriptTags: SCRIPT_TAG_PATTERN,
  styleTags: STYLE_TAG_PATTERN,
  eventHandlers: EVENT_HANDLER_PATTERN,
  dangerousProtocols: DANGEROUS_PROTOCOL_PATTERN,
};
