/**
 * Environment detection for SSR/CSR compatibility
 * @author The Base Event Team
 * @since 1.0.0
 */

export type Environment = "server" | "client";

let ssrOverride: boolean | undefined;

export function isSSR(): boolean {
  if (ssrOverride !== undefined) {
    return ssrOverride;
  }

  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof navigator === "undefined"
  ) {
    return true;
  }

  return false;
}

export function getEnvironment(): Environment {
  return isSSR() ? "server" : "client";
}

export function setSSR(enabled: boolean | undefined): void {
  ssrOverride = enabled;
}
