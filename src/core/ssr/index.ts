/**
 * SSR/CSR module exports for The Base Event
 * @author The Base Event Team
 * @since 1.0.0
 */

export { isSSR, getEnvironment, setSSR, type Environment } from "./detection";

export {
  HydrationManager,
  type SSRConfig,
  type SSRState,
  DEFAULT_SSR_CONFIG,
} from "./hydration";

export {
  BufferSyncManager,
  type BufferSyncStrategy,
  type SyncMode,
} from "./buffer-sync";

export { ClientWaitManager } from "./client-wait";
