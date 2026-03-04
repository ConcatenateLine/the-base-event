/**
 * Vue 3 composable for notification channels
 * Provides Vue composition API with ref/reactive
 * @author The Base Event Team
 * @since 1.0.0
 */

import { ref, reactive, onUnmounted, type Ref } from "vue";
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

export interface NotificationChannelReturn<T> {
  events: Ref<BaseEvent<T>[]>;
  lastEvent: Ref<BaseEvent<T> | null>;
  subscribe: (callback: EventCallback<T>) => UnsubscribeFunction;
  emit: (data: T) => void;
  clear: () => void;
  emitter: EventEmitter;
}

export function useNotificationChannel<T = unknown>(
  options: UseNotificationChannelOptions<T>
): NotificationChannelReturn<T> {
  const { channel, emitter: providedEmitter, config, replay = true } = options;

  const emitter = providedEmitter ?? createEventEmitter(config);

  const events = ref<BaseEvent<T>[]>([]) as Ref<BaseEvent<T>[]>;
  const lastEvent = ref<BaseEvent<T> | null>(null) as Ref<BaseEvent<T> | null>;

  const eventStore: BaseEvent<T>[] = [];

  const callback: EventCallback<T> = (event) => {
    eventStore.push(event);
    if (eventStore.length > 100) {
      eventStore.shift();
    }
    events.value = [...eventStore];
    lastEvent.value = event;
  };

  const unsubscribe = emitter.on<T>(channel, callback);

  if (replay) {
    const buffered = emitter.getBuffered(channel);
    for (const event of buffered) {
      eventStore.push(event as BaseEvent<T>);
    }
    events.value = [...eventStore];
    if (eventStore.length > 0) {
      lastEvent.value = eventStore[eventStore.length - 1];
    }
  }

  const cleanup = () => {
    unsubscribe();
  };

  onUnmounted(() => {
    cleanup();
  });

  const emit = (data: T): void => {
    emitter.emit<T>(channel, data);
  };

  const clear = (): void => {
    emitter.clear(channel);
    eventStore.length = 0;
    events.value = [];
    lastEvent.value = null;
  };

  return {
    events,
    lastEvent,
    subscribe: (cb: EventCallback<T>) => emitter.on<T>(channel, cb),
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
): Ref<BaseEvent<T> | null> {
  const {
    channel,
    emitter: providedEmitter,
    onEvent,
    replay = true,
  } = options;

  const emitter = providedEmitter ?? createEventEmitter();

  const lastEvent = ref<BaseEvent<T> | null>(null) as Ref<BaseEvent<T> | null>;

  const callback: EventCallback<T> = (event) => {
    lastEvent.value = event;
    if (onEvent) {
      onEvent(event);
    }
  };

  const unsubscribe = emitter.on<T>(channel, callback);

  if (replay) {
    const buffered = emitter.getBuffered(channel);
    if (buffered.length > 0) {
      const lastBuffered = buffered[buffered.length - 1];
      lastEvent.value = lastBuffered as BaseEvent<T>;
      if (onEvent) {
        for (const event of buffered) {
          onEvent(event as BaseEvent<T>);
        }
      }
    }
  }

  onUnmounted(() => {
    unsubscribe();
  });

  return lastEvent;
}

export { EventEmitter, createEventEmitter };
export type { EventEmitterConfig, BaseEvent, EventCallback, UnsubscribeFunction };
