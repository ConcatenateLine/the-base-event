/**
 * Main entry point for The Base Event
 * @author The Base Event Team
 * @since 1.0.0
 */

// Core exports
export { EventEmitter, createEventEmitter } from "./core";

export type {
  BaseEvent,
  BufferedEvent,
  EventCallback,
  UnsubscribeFunction,
  EmitOptions,
  Middleware,
  PerformanceMetrics,
  BaseEventConfig,
  BufferConfig,
  EventEmitterConfig,
} from "./core";

// SSR/CSR exports
export {
  isSSR,
  getEnvironment,
  setSSR,
  type Environment,
} from "./core/ssr/detection";

export {
  HydrationManager,
  DEFAULT_SSR_CONFIG,
  type SSRConfig,
  type SSRState,
} from "./core/ssr/hydration";

export {
  BufferSyncManager,
  type BufferSyncStrategy,
  type SyncMode,
} from "./core/ssr/buffer-sync";

export { ClientWaitManager } from "./core/ssr/client-wait";
