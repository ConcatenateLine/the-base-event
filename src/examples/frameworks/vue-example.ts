/**
 * Vue example for The Base Event
 * @author The Base Event Team
 * @since 1.0.0
 */

import { ref, onMounted, onUnmounted, type Ref, type ComputedRef } from "vue";
import {
  createEventEmitter,
  useNotificationChannel,
  type EventEmitter,
  type BaseEvent,
  type UnsubscribeFunction,
} from "@core";

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

export interface TodoEvent {
  action: "create" | "update" | "delete";
  item: TodoItem;
}

function createGlobalEmitter() {
  return createEventEmitter({
    buffer: {
      maxSize: 200,
      strategy: "fifo",
    },
  });
}

let globalEmitter: EventEmitter | null = null;

export function getGlobalEmitter(): EventEmitter {
  if (!globalEmitter) {
    globalEmitter = createGlobalEmitter();
  }
  return globalEmitter;
}

export function useEventBus() {
  const emitter = getGlobalEmitter();
  const isConnected = ref(true);

  const subscribe = <T>(
    channel: string,
    callback: (event: BaseEvent<T>) => void,
    replay: boolean = true
  ): UnsubscribeFunction => {
    if (replay) {
      const buffered = emitter.getBuffered(channel);
      for (const event of buffered) {
        try {
          callback(event as BaseEvent<T>);
        } catch (e) {
          console.error("Error replaying event:", e);
        }
      }
    }
    return emitter.on<T>(channel, callback);
  };

  const emit = <T>(channel: string, data: T): void => {
    emitter.emit<T>(channel, data);
  };

  const unsubscribe = (channel: string): void => {
    emitter.off(channel);
  };

  const clear = (channel?: string): void => {
    emitter.clear(channel);
  };

  onUnmounted(() => {
    isConnected.value = false;
  });

  return {
    subscribe,
    emit,
    unsubscribe,
    clear,
    isConnected: isConnected as Ref<boolean>,
    emitter,
  };
}

export function useChannel<T>(
  channel: string,
  options: {
    replay?: boolean;
    immediate?: boolean;
  } = {}
): {
  lastEvent: Ref<BaseEvent<T> | null>;
  events: Ref<BaseEvent<T>[]>;
  subscribe: (callback: (event: BaseEvent<T>) => void) => UnsubscribeFunction;
  emit: (data: T) => void;
  clear: () => void;
} {
  const { subscribe: sub, emit: emitFn, clear: clearFn } = useEventBus();

  const lastEvent = ref<BaseEvent<T> | null>(null);
  const events = ref<BaseEvent<T>[]>([]);

  const subscribe = (
    callback: (event: BaseEvent<T>) => void
  ): UnsubscribeFunction => {
    return sub<T>(
      channel,
      event => {
        lastEvent.value = event;
        events.value = [...events.value.slice(-99), event];
        callback(event);
      },
      options.replay ?? true
    );
  };

  const emit = (data: T): void => {
    emitFn<T>(channel, data);
  };

  const clear = (): void => {
    clearFn(channel);
  };

  return {
    lastEvent,
    events,
    subscribe,
    emit,
    clear,
  };
}

export function useTodoStore() {
  const { subscribe, emit, clear } = useEventBus();

  const todos: Ref<TodoItem[]> = ref([]);
  const isLoading = ref(false);
  const error: Ref<string | null> = ref(null);

  const loadTodos = () => {
    isLoading.value = true;
    const buffered = getGlobalEmitter().getBuffered("todos:*");
    todos.value = buffered
      .map(e => e.data.item)
      .filter(item => item.createdAt > Date.now() - 300000);
    isLoading.value = false;
  };

  const addTodo = (title: string): void => {
    const item: TodoItem = {
      id: `todo-${Date.now()}`,
      title,
      completed: false,
      createdAt: Date.now(),
    };

    emit<TodoEvent>("todos:create", { action: "create", item });
    todos.value = [...todos.value, item];
  };

  const toggleTodo = (id: string): void => {
    const item = todos.value.find(t => t.id === id);
    if (item) {
      const updated = { ...item, completed: !item.completed };
      emit<TodoEvent>("todos:update", { action: "update", item: updated });
      todos.value = todos.value.map(t => (t.id === id ? updated : t));
    }
  };

  const deleteTodo = (id: string): void => {
    const item = todos.value.find(t => t.id === id);
    if (item) {
      emit<TodoEvent>("todos:delete", { action: "delete", item });
      todos.value = todos.value.filter(t => t.id !== id);
    }
  };

  onMounted(() => {
    loadTodos();

    const unsubCreate = subscribe<TodoEvent>("todos:create", event => {
      if (!todos.value.find(t => t.id === event.data.item.id)) {
        todos.value = [...todos.value, event.data.item];
      }
    });

    const unsubUpdate = subscribe<TodoEvent>("todos:update", event => {
      todos.value = todos.value.map(t =>
        t.id === event.data.item.id ? event.data.item : t
      );
    });

    const unsubDelete = subscribe<TodoEvent>("todos:delete", event => {
      todos.value = todos.value.filter(t => t.id !== event.data.item.id);
    });

    onUnmounted(() => {
      unsubCreate();
      unsubUpdate();
      unsubDelete();
    });
  });

  return {
    todos,
    isLoading,
    error,
    addTodo,
    toggleTodo,
    deleteTodo,
    clear,
  };
}

export { getGlobalEmitter };
