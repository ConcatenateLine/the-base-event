/**
 * Wildcard Pattern Matching for Event Channels
 * Supports * (single segment) and ** (multi-segment) patterns
 * @author The Base Event Team
 * @since 1.0.0
 */

export interface PatternMatchResult {
  matches: boolean;
  capturedGroups: Record<string, string>;
}

export interface CompiledPattern {
  regex: RegExp;
  captureNames: string[];
  pattern: string;
}

const patternCache = new Map<string, CompiledPattern>();

export function compilePattern(pattern: string): CompiledPattern {
  const cached = patternCache.get(pattern);
  if (cached) {
    return cached;
  }

  const captureNames: string[] = [];
  let regexStr = "^";

  let i = 0;
  while (i < pattern.length) {
    if (pattern[i] === "*" && pattern[i + 1] === "*") {
      if (i + 2 < pattern.length && pattern[i + 2] !== ".") {
        const captureName = `capture${captureNames.length}`;
        captureNames.push(captureName);
        regexStr += `(?<${captureName}>[a-zA-Z0-9.:_-]+(?:\\.[a-zA-Z0-9.:_-]+)*)`;
        i += 2;
      } else {
        regexStr += "(?:[a-zA-Z0-9.:_-]+\\.)*";
        i += 2;
      }
    } else if (pattern[i] === "*") {
      const captureName = `capture${captureNames.length}`;
      captureNames.push(captureName);
      regexStr += `(?<${captureName}>[a-zA-Z0-9_-]+)`;
      i++;
    } else if (pattern[i] === "?") {
      regexStr += "[a-zA-Z0-9_-]";
      i++;
    } else if (".+^${}[]|()\\".includes(pattern[i])) {
      regexStr += `\\${  pattern[i]}`;
      i++;
    } else {
      regexStr += pattern[i];
      i++;
    }
  }

  regexStr += "$";

  const compiled: CompiledPattern = {
    regex: new RegExp(regexStr),
    captureNames,
    pattern,
  };

  if (patternCache.size < 1000) {
    patternCache.set(pattern, compiled);
  }

  return compiled;
}

export function matchPattern(
  channel: string,
  pattern: string
): PatternMatchResult {
  const compiled = compilePattern(pattern);
  const match = channel.match(compiled.regex);

  if (!match) {
    return { matches: false, capturedGroups: {} };
  }

  const capturedGroups: Record<string, string> = {};

  for (const name of compiled.captureNames) {
    if (match.groups && match.groups[name] !== undefined) {
      capturedGroups[name] = match.groups[name];
    }
  }

  return { matches: true, capturedGroups };
}

export function matchWildcard(channel: string, pattern: string): boolean {
  return matchPattern(channel, pattern).matches;
}

export function clearPatternCache(): void {
  patternCache.clear();
}

export function getPatternCacheSize(): number {
  return patternCache.size;
}

export interface WildcardSubscription<T = unknown> {
  pattern: string;
  callback: (event: { channel: string; match: PatternMatchResult }) => T;
}

export function createPatternMatcher(channel: string): {
  matches: (pattern: string) => boolean;
  getMatches: (patterns: string[]) => string[];
} {
  return {
    matches: (pattern: string) => matchWildcard(channel, pattern),
    getMatches: (patterns: string[]) =>
      patterns.filter(p => matchWildcard(channel, p)),
  };
}

export function expandPattern(pattern: string): string[] {
  if (!pattern.includes("*") && !pattern.includes("?")) {
    return [pattern];
  }

  const segments = pattern.split(/([*.?])/);
  const result: string[] = [""];

  for (const segment of segments) {
    if (segment === "") {
      continue;
    }

    if (segment === "*") {
      result.forEach((_, idx) => {
        result[idx] = segment;
      });
    } else if (segment === "**") {
      result.forEach((_, idx) => {
        result[idx] = segment;
      });
    } else if (segment === "?") {
      const newResult: string[] = [];
      for (const r of result) {
        newResult.push(`${r  }x`);
      }
      result.length = 0;
      result.push(...newResult);
    } else if (segment === ".") {
      result.forEach((r, idx) => {
        result[idx] = r + segment;
      });
    } else {
      result.forEach((r, idx) => {
        result[idx] = r + segment;
      });
    }
  }

  return result;
}

export function isValidPattern(pattern: string): boolean {
  if (!pattern || pattern.trim() === "") {
    return false;
  }

  if (pattern.includes("**") && !pattern.includes(".")) {
    return false;
  }

  try {
    compilePattern(pattern);
    return true;
  } catch {
    return false;
  }
}
