/**
 * Cross-environment buffer synchronization for SSR/CSR
 * @author The Base Event Team
 * @since 1.0.0
 */

import type { BufferedEvent } from "../events/typing";

export type BufferSyncStrategy = "client-only" | "server-persist" | "hybrid";
export type SyncMode = "immediate" | "on-hydration" | "manual";

const STORAGE_KEY = "__the_base_event_ssr_buffer__";

export class BufferSyncManager {
  private serverBuffer: BufferedEvent[] = [];
  private strategy: BufferSyncStrategy;
  private syncMode: SyncMode;
  private isClient = false;

  constructor(
    strategy: BufferSyncStrategy = "client-only",
    syncMode: SyncMode = "on-hydration"
  ) {
    this.strategy = strategy;
    this.syncMode = syncMode;
    this.isClient = typeof window !== "undefined";
  }

  bufferServerEvent(event: BufferedEvent): void {
    if (this.strategy === "client-only") return;

    this.serverBuffer.push(event);

    if (this.strategy === "server-persist") {
      this.persistToStorage();
    }
  }

  replayServerEvents(): BufferedEvent[] {
    if (this.strategy === "server-persist" && !this.serverBuffer.length) {
      this.serverBuffer = this.loadFromStorage();
    }

    const events = [...this.serverBuffer];
    this.serverBuffer = [];
    this.clearStorage();
    return events;
  }

  getServerBuffer(): BufferedEvent[] {
    return [...this.serverBuffer];
  }

  getStrategy(): BufferSyncStrategy {
    return this.strategy;
  }

  getSyncMode(): SyncMode {
    return this.syncMode;
  }

  setStrategy(strategy: BufferSyncStrategy): void {
    this.strategy = strategy;
  }

  setSyncMode(syncMode: SyncMode): void {
    this.syncMode = syncMode;
  }

  shouldSyncImmediately(): boolean {
    return this.syncMode === "immediate";
  }

  shouldSyncOnHydration(): boolean {
    return this.syncMode === "on-hydration";
  }

  isManualSync(): boolean {
    return this.syncMode === "manual";
  }

  private persistToStorage(): void {
    if (!this.isClient) return;

    try {
      const serialized = JSON.stringify(this.serverBuffer);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, serialized);
      }
    } catch {
      // Storage might be full or unavailable
    }
  }

  private loadFromStorage(): BufferedEvent[] {
    if (!this.isClient) return [];

    try {
      if (typeof localStorage === "undefined") return [];
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data) as BufferedEvent[];
    } catch {
      return [];
    }
  }

  clearStorage(): void {
    if (!this.isClient) return;

    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }

  clear(): void {
    this.serverBuffer = [];
    this.clearStorage();
  }
}
