/**
 * React hook for notification channels
 * Provides React 18 concurrent mode support with useSyncExternalStore
 * @author The Base Event Team
 * @since 1.0.0
 */

import { useSyncExternalStore } from "react";
import {
  EventEmitter,
  createEventEmitter,
  type EventEmitterConfig,
  type BaseEvent,
  type EventCallback,
  type UnsubscribeFunction,
} from "../../core";

export interface UseNotificationChannelOptions<T> {
  channel: string;
  emitter?: EventEmitter;
  config?: EventEmitterConfig;
  replay?: boolean;
}

export interface NotificationChannelResult<T> {
  events: BaseEvent<T>[];
  subscribe: (callback: EventCallback<T>) => UnsubscribeFunction;
  emit: (data: T) => void;
  clear: () => void;
  emitter: EventEmitter;
}

const EMPTY_EVENTS: BaseEvent<unknown>[] = [];

function subscribe<T>(
  emitter: EventEmitter,
  channel: string,
  callback: EventCallback<T>
): UnsubscribeFunction {
  return emitter.on<T>(channel, callback);
}

export function useNotificationChannel<T = unknown>(
  options: UseNotificationChannelOptions<T>
): NotificationChannelResult<T> {
  const { channel, emitter: providedEmitter, config, replay = true } = options;

  const emitter = providedEmitter ?? createEventEmitter(config);

  const store = useSyncExternalStore(
    (onStoreChange: () => void): (() => void) => {
      const callback: EventCallback<T> = (event): void => {
        onStoreChange();
      };

      const unsubscribe = subscribe(emitter, channel, callback);

      if (replay) {
        const buffered = emitter.getBuffered(channel);
        for (const event of buffered) {
          callback(event as BaseEvent<T>);
        }
      }

      return (): void => {
        unsubscribe();
      };
    },
    (): unknown => {
      return emitter.getBuffered(channel);
    },
    (): unknown => EMPTY_EVENTS
  );

  const emit = (data: T): void => {
    emitter.emit<T>(channel, data);
  };

  const clear = (): void => {
    emitter.clear(channel);
  };

  return {
    events: store as BaseEvent<T>[],
    subscribe: (callback: EventCallback<T>): UnsubscribeFunction =>
      emitter.on<T>(channel, callback),
    emit,
    clear,
    emitter,
  };
}

export interface UseNotificationSubscriptionOptions<T> {
  channel: string;
  emitter?: EventEmitter;
  onEvent?: (event: BaseEvent<T>) => void;
  replay?: boolean;
}

export function useNotificationSubscription<T = unknown>(
  options: UseNotificationSubscriptionOptions<T>
): UnsubscribeFunction {
  const { channel, emitter: providedEmitter, onEvent, replay = true } = options;

  const emitter = providedEmitter ?? createEventEmitter();

  let currentUnsub: UnsubscribeFunction | null = null;

  useSyncExternalStore(
    (onStoreChange: () => void): (() => void) => {
      const callback: EventCallback<T> = (event: BaseEvent<T>): void => {
        onStoreChange();
        if (onEvent) {
          onEvent(event);
        }
      };

      currentUnsub = subscribe(emitter, channel, callback);

      if (replay) {
        const buffered = emitter.getBuffered(channel);
        for (const event of buffered) {
          if (onEvent) {
            onEvent(event as BaseEvent<T>);
          }
        }
      }

      return (): void => {
        if (currentUnsub) {
          currentUnsub();
          currentUnsub = null;
        }
      };
    },
    (): number => 0,
    (): number => 1
  );

  return (): void => {
    if (currentUnsub) {
      currentUnsub();
      currentUnsub = null;
    }
  };
}

export { EventEmitter, createEventEmitter };
export type { EventEmitterConfig, BaseEvent, EventCallback, UnsubscribeFunction };
