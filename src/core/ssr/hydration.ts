/**
 * Hydration state management for SSR/CSR
 * @author The Base Event Team
 * @since 1.0.0
 */

import { isSSR } from "./detection";

export interface SSRState {
  isServer: boolean;
  isHydrated: boolean;
  hydrationPromise: Promise<void> | null;
}

export interface SSRConfig {
  enabled: boolean;
  hydrationDelay: number;
  bufferStrategy: "client-only" | "server-persist" | "hybrid";
  syncMode: "immediate" | "on-hydration" | "manual";
}

export const DEFAULT_SSR_CONFIG: SSRConfig = {
  enabled: false,
  hydrationDelay: 100,
  bufferStrategy: "client-only",
  syncMode: "on-hydration",
};

export class HydrationManager {
  private isHydrated = false;
  private hydrationResolve: (() => void) | null = null;
  private hydrationPromise: Promise<void>;
  private config: SSRConfig;

  constructor(config: Partial<SSRConfig> = {}) {
    this.config = { ...DEFAULT_SSR_CONFIG, ...config };
    this.hydrationPromise = new Promise(resolve => {
      this.hydrationResolve = resolve;
    });
  }

  markHydrated(): void {
    if (this.isHydrated) return;

    this.isHydrated = true;

    if (this.config.hydrationDelay > 0) {
      setTimeout(() => {
        this.hydrationResolve?.();
      }, this.config.hydrationDelay);
    } else {
      this.hydrationResolve?.();
    }
  }

  waitForHydration(): Promise<void> {
    if (this.isHydrated) return Promise.resolve();
    return this.hydrationPromise;
  }

  getState(): SSRState {
    return {
      isServer: isSSR(),
      isHydrated: this.isHydrated,
      hydrationPromise: this.isHydrated ? null : this.hydrationPromise,
    };
  }

  getConfig(): SSRConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<SSRConfig>): void {
    this.config = { ...this.config, ...config };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  reset(): void {
    this.isHydrated = false;
    this.hydrationPromise = new Promise(resolve => {
      this.hydrationResolve = resolve;
    });
  }
}
