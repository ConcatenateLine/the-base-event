/**
 * SSR/CSR Module Tests
 * @author The Base Event Team
 * @since 1.0.0
 */

import {
  isSSR,
  getEnvironment,
  setSSR,
  Environment,
} from "../../core/ssr/detection";
import {
  HydrationManager,
  SSRConfig,
  DEFAULT_SSR_CONFIG,
} from "../../core/ssr/hydration";
import {
  BufferSyncManager,
  BufferSyncStrategy,
  SyncMode,
} from "../../core/ssr/buffer-sync";
import { ClientWaitManager } from "../../core/ssr/client-wait";
import type { BufferedEvent } from "../../core/events/typing";
import { waitForAsync } from "../setup";

function createTestBufferedEvent<T>(
  channel: string,
  data: T
): BufferedEvent<T> {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    channel,
    data,
    timestamp: Date.now(),
    type: "standard",
    bufferedAt: Date.now(),
    ttl: 30000,
  };
}

describe("Detection Module", () => {
  beforeEach(() => {
    setSSR(undefined);
  });

  afterEach(() => {
    setSSR(undefined);
  });

  describe("isSSR", () => {
    it("should detect server environment via manual override", () => {
      setSSR(true);
      expect(isSSR()).toBe(true);
    });

    it("should detect client environment via manual override", () => {
      setSSR(false);
      expect(isSSR()).toBe(false);
    });

    it("should respect manual SSR setting", () => {
      setSSR(true);
      expect(isSSR()).toBe(true);
      setSSR(false);
      expect(isSSR()).toBe(false);
    });
  });

  describe("getEnvironment", () => {
    it("should return 'server' when in SSR mode", () => {
      setSSR(true);
      expect(getEnvironment()).toBe("server");
    });

    it("should return 'client' when in CSR mode", () => {
      setSSR(false);
      expect(getEnvironment()).toBe("client");
    });
  });
});

describe("HydrationManager", () => {
  let manager: HydrationManager;

  beforeEach(() => {
    manager = new HydrationManager();
  });

  describe("constructor", () => {
    it("should create with default config", () => {
      const defaultManager = new HydrationManager();
      expect(defaultManager.getConfig()).toEqual(DEFAULT_SSR_CONFIG);
    });

    it("should create with custom config", () => {
      const customConfig: Partial<SSRConfig> = {
        enabled: true,
        hydrationDelay: 200,
        bufferStrategy: "server-persist",
        syncMode: "immediate",
      };
      const customManager = new HydrationManager(customConfig);
      expect(customManager.getConfig().enabled).toBe(true);
      expect(customManager.getConfig().hydrationDelay).toBe(200);
      expect(customManager.getConfig().bufferStrategy).toBe("server-persist");
      expect(customManager.getConfig().syncMode).toBe("immediate");
    });
  });

  describe("markHydrated", () => {
    it("should mark as hydrated", () => {
      manager.markHydrated();
      expect(manager.getState().isHydrated).toBe(true);
    });

    it("should not call resolve multiple times", () => {
      manager.markHydrated();
      manager.markHydrated();
      expect(manager.getState().isHydrated).toBe(true);
    });
  });

  describe("waitForHydration", () => {
    it("should resolve immediately if already hydrated", async () => {
      manager.markHydrated();
      await expect(manager.waitForHydration()).resolves.toBeUndefined();
    });

    it("should wait for hydration to complete", async () => {
      const hydrationPromise = manager.waitForHydration();
      manager.markHydrated();
      await expect(hydrationPromise).resolves.toBeUndefined();
    });

    it("should respect hydration delay", async () => {
      const delayedManager = new HydrationManager({ hydrationDelay: 50 });
      const startTime = Date.now();
      const hydrationPromise = delayedManager.waitForHydration();
      delayedManager.markHydrated();
      await hydrationPromise;
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(45);
    });

    it("should resolve immediately with 0 delay", async () => {
      const noDelayManager = new HydrationManager({ hydrationDelay: 0 });
      noDelayManager.markHydrated();
      await expect(noDelayManager.waitForHydration()).resolves.toBeUndefined();
    });
  });

  describe("getState", () => {
    it("should return correct state before hydration", () => {
      const state = manager.getState();
      expect(state.isHydrated).toBe(false);
      expect(state.isServer).toBeDefined();
      expect(state.hydrationPromise).toBeDefined();
    });

    it("should return correct state after hydration", () => {
      manager.markHydrated();
      const state = manager.getState();
      expect(state.isHydrated).toBe(true);
      expect(state.hydrationPromise).toBeNull();
    });
  });

  describe("updateConfig", () => {
    it("should update config", () => {
      manager.updateConfig({ enabled: true, hydrationDelay: 500 });
      expect(manager.getConfig().enabled).toBe(true);
      expect(manager.getConfig().hydrationDelay).toBe(500);
    });

    it("should preserve unchanged config values", () => {
      const initialConfig = manager.getConfig();
      manager.updateConfig({ enabled: true });
      expect(manager.getConfig().bufferStrategy).toBe(
        initialConfig.bufferStrategy
      );
    });
  });

  describe("isEnabled", () => {
    it("should return true when enabled", () => {
      const enabledManager = new HydrationManager({ enabled: true });
      expect(enabledManager.isEnabled()).toBe(true);
    });

    it("should return false when disabled", () => {
      const disabledManager = new HydrationManager({ enabled: false });
      expect(disabledManager.isEnabled()).toBe(false);
    });
  });
});

describe("BufferSyncManager", () => {
  let syncManager: BufferSyncManager;

  describe("constructor", () => {
    it("should create with default strategy and sync mode", () => {
      syncManager = new BufferSyncManager();
      expect(syncManager.getStrategy()).toBe("client-only");
      expect(syncManager.getSyncMode()).toBe("on-hydration");
    });

    it("should create with custom strategy and sync mode", () => {
      syncManager = new BufferSyncManager("server-persist", "immediate");
      expect(syncManager.getStrategy()).toBe("server-persist");
      expect(syncManager.getSyncMode()).toBe("immediate");
    });
  });

  describe("bufferServerEvent", () => {
    beforeEach(() => {
      syncManager = new BufferSyncManager("server-persist");
    });

    it("should buffer events with server-persist strategy", () => {
      const event = createTestBufferedEvent("test", { message: "hello" });
      syncManager.bufferServerEvent(event);
      expect(syncManager.getServerBuffer()).toHaveLength(1);
    });

    it("should not buffer events with client-only strategy", () => {
      const clientOnlyManager = new BufferSyncManager("client-only");
      const event = createTestBufferedEvent("test", { message: "hello" });
      clientOnlyManager.bufferServerEvent(event);
      expect(clientOnlyManager.getServerBuffer()).toHaveLength(0);
    });

    it("should buffer events with hybrid strategy", () => {
      const hybridManager = new BufferSyncManager("hybrid");
      const event = createTestBufferedEvent("test", { message: "hello" });
      hybridManager.bufferServerEvent(event);
      expect(hybridManager.getServerBuffer()).toHaveLength(1);
    });
  });

  describe("replayServerEvents", () => {
    beforeEach(() => {
      syncManager = new BufferSyncManager("server-persist");
    });

    it("should return buffered events", () => {
      const event1 = createTestBufferedEvent("test", { message: "hello" });
      const event2 = createTestBufferedEvent("test", { message: "world" });
      syncManager.bufferServerEvent(event1);
      syncManager.bufferServerEvent(event2);

      const events = syncManager.replayServerEvents();
      expect(events).toHaveLength(2);
    });

    it("should clear buffer after replay", () => {
      const event = createTestBufferedEvent("test", { message: "hello" });
      syncManager.bufferServerEvent(event);

      syncManager.replayServerEvents();
      expect(syncManager.getServerBuffer()).toHaveLength(0);
    });

    it("should not replay empty buffer", () => {
      const events = syncManager.replayServerEvents();
      expect(events).toHaveLength(0);
    });
  });

  describe("sync modes", () => {
    it("should report correct sync mode", () => {
      const immediateManager = new BufferSyncManager(
        "client-only",
        "immediate"
      );
      const hydrationManager = new BufferSyncManager(
        "client-only",
        "on-hydration"
      );
      const manualManager = new BufferSyncManager("client-only", "manual");

      expect(immediateManager.shouldSyncImmediately()).toBe(true);
      expect(immediateManager.shouldSyncOnHydration()).toBe(false);
      expect(immediateManager.isManualSync()).toBe(false);

      expect(hydrationManager.shouldSyncOnHydration()).toBe(true);
      expect(hydrationManager.shouldSyncImmediately()).toBe(false);
      expect(hydrationManager.isManualSync()).toBe(false);

      expect(manualManager.isManualSync()).toBe(true);
      expect(manualManager.shouldSyncImmediately()).toBe(false);
      expect(manualManager.shouldSyncOnHydration()).toBe(false);
    });
  });

  describe("strategy and mode updates", () => {
    it("should update strategy", () => {
      syncManager = new BufferSyncManager("client-only");
      syncManager.setStrategy("server-persist");
      expect(syncManager.getStrategy()).toBe("server-persist");
    });

    it("should update sync mode", () => {
      syncManager = new BufferSyncManager("client-only", "immediate");
      syncManager.setSyncMode("manual");
      expect(syncManager.getSyncMode()).toBe("manual");
    });
  });

  describe("clear", () => {
    it("should clear buffer", () => {
      syncManager = new BufferSyncManager("server-persist");
      syncManager.bufferServerEvent(
        createTestBufferedEvent("test", { message: "hello" })
      );
      syncManager.clear();
      expect(syncManager.getServerBuffer()).toHaveLength(0);
    });
  });
});

describe("ClientWaitManager", () => {
  let waitManager: ClientWaitManager;

  beforeEach(() => {
    waitManager = new ClientWaitManager(1000);
  });

  describe("constructor", () => {
    it("should create with default timeout", () => {
      const defaultManager = new ClientWaitManager();
      expect(defaultManager.getTimeout()).toBe(5000);
    });

    it("should create with custom timeout", () => {
      const customManager = new ClientWaitManager(3000);
      expect(customManager.getTimeout()).toBe(3000);
    });
  });

  describe("onClientMount", () => {
    it("should mark as mounted", () => {
      waitManager.onClientMount();
      expect(waitManager.isClientMounted()).toBe(true);
    });

    it("should not call resolve multiple times", () => {
      waitManager.onClientMount();
      waitManager.onClientMount();
      expect(waitManager.isClientMounted()).toBe(true);
    });
  });

  describe("waitForClient", () => {
    it("should resolve immediately if already mounted", async () => {
      waitManager.onClientMount();
      await expect(waitManager.waitForClient()).resolves.toBeUndefined();
    });

    it("should wait for mount", async () => {
      const mountPromise = waitManager.waitForClient();
      waitManager.onClientMount();
      await expect(mountPromise).resolves.toBeUndefined();
    });

    it("should timeout if mount does not occur", async () => {
      const shortWaitManager = new ClientWaitManager(50);
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      await expect(shortWaitManager.waitForClient()).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should use custom timeout when provided", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const shortWaitManager = new ClientWaitManager(10000);
      await shortWaitManager.waitForClient(50);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("setTimeout", () => {
    it("should update timeout", () => {
      waitManager.setTimeout(2000);
      expect(waitManager.getTimeout()).toBe(2000);
    });
  });

  describe("reset", () => {
    it("should reset state", () => {
      waitManager.onClientMount();
      waitManager.reset();
      expect(waitManager.isClientMounted()).toBe(false);
    });
  });
});

describe("Integration", () => {
  it("should work together as a complete system", () => {
    const hydrationManager = new HydrationManager({
      enabled: true,
      bufferStrategy: "server-persist",
      syncMode: "on-hydration",
    });

    const bufferSyncManager = new BufferSyncManager(
      "server-persist",
      "on-hydration"
    );

    const clientWaitManager = new ClientWaitManager(5000);

    expect(hydrationManager.isEnabled()).toBe(true);
    expect(bufferSyncManager.getStrategy()).toBe("server-persist");
    expect(bufferSyncManager.shouldSyncOnHydration()).toBe(true);
    expect(clientWaitManager.getTimeout()).toBe(5000);

    const event = createTestBufferedEvent("test", {
      message: "integration test",
    });
    bufferSyncManager.bufferServerEvent(event);
    expect(bufferSyncManager.getServerBuffer()).toHaveLength(1);

    hydrationManager.markHydrated();
    expect(hydrationManager.getState().isHydrated).toBe(true);

    clientWaitManager.onClientMount();
    expect(clientWaitManager.isClientMounted()).toBe(true);

    const replayedEvents = bufferSyncManager.replayServerEvents();
    expect(replayedEvents).toHaveLength(1);
    expect(replayedEvents[0].data).toEqual({ message: "integration test" });
  });
});
