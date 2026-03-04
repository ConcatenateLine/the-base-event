# Vue 3 Integration Guide

The Vue adapter provides composables for integrating The Base Event with Vue 3 applications using the Composition API.

## Installation

```bash
npm install the-base-event
```

## Quick Start

```vue
<script setup lang="ts">
import { useNotificationChannel } from "the-base-event/vue";

const { events, subscribe, emit, clear } = useNotificationChannel<string>({
  channel: "notifications",
  replay: true,
});

const handleSend = () => {
  emit("Hello from Vue!");
};
</script>

<template>
  <div>
    <button @click="handleSend">Send Notification</button>
    <button @click="clear">Clear</button>
    <ul>
      <li v-for="event in events" :key="event.id">
        {{ event.data }}
      </li>
    </ul>
  </div>
</template>
```

## API Reference

### useNotificationChannel

```typescript
const {
  events,
  lastEvent,
  subscribe,
  emit,
  clear,
  emitter,
} = useNotificationChannel<T>({
  channel: string,
  emitter?: EventEmitter,
  config?: EventEmitterConfig,
  replay?: boolean,
});
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `channel` | `string` | Required | The notification channel to subscribe to |
| `emitter` | `EventEmitter` | `undefined` | Optional shared emitter instance |
| `config` | `EventEmitterConfig` | `undefined` | Configuration for the emitter |
| `replay` | `boolean` | `true` | Whether to replay buffered events |

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `events` | `Ref<BaseEvent<T>[]>` | Reactive array of buffered events |
| `lastEvent` | `Ref<BaseEvent<T> | null>` | Reactive last event |
| `subscribe` | `(callback) => UnsubscribeFunction` | Subscribe to new events |
| `emit` | `(data: T) => void` | Emit an event to the channel |
| `clear` | `() => void` | Clear buffered events |
| `emitter` | `EventEmitter` | The underlying emitter instance |

### useNotificationSubscription

A simpler composable for subscribing to events:

```typescript
const lastEvent = useNotificationSubscription<T>({
  channel: string,
  emitter?: EventEmitter,
  onEvent?: (event: BaseEvent<T>) => void,
  replay?: boolean,
}): Ref<BaseEvent<T> | null>
```

## Vue Reactivity

The composables use Vue's reactivity system:

```vue
<script setup lang="ts">
import { useNotificationChannel } from "the-base-event/vue";

const { events, lastEvent, emit } = useNotificationChannel<{ message: string }>({
  channel: "notifications",
});

// events is a Ref - automatically updates in template
// lastEvent is a Ref - automatically updates in template
</script>

<template>
  <div>
    <p>Last event: {{ lastEvent?.data?.message }}</p>
    <p>Total events: {{ events.length }}</p>
  </div>
</template>
```

## Shared Emitter

Share a single emitter across multiple components:

```typescript
// composables/useSharedEmitter.ts
import { createEventEmitter } from "the-base-event/vue";

export const sharedEmitter = createEventEmitter({
  buffer: { maxSize: 1000, ttl: 60000 },
});

// Component A
const { events, emit } = useNotificationChannel({
  channel: "shared",
  emitter: sharedEmitter,
});

// Component B
const { events, emit } = useNotificationChannel({
  channel: "shared",
  emitter: sharedEmitter);
```

## Event Replay

By default, new subscribers receive all buffered events:

```typescript
// These events are buffered
emit("event-1");
emit("event-2");

// New component receives both events (replay: true by default)
const { events } = useNotificationChannel({
  channel: "my-channel",
  replay: true, // default
});

// events.value = [event-1, event-2]
```

Disable replay for new events only:

```typescript
const { subscribe } = useNotificationChannel({
  channel: "my-channel",
  replay: false,
});

subscribe((event) => {
  // Only receives events emitted after subscription
});
```

## Automatic Cleanup

The composable automatically cleans up subscriptions on component unmount:

```vue
<script setup lang="ts">
import { useNotificationChannel } from "the-base-event/vue";

const { subscribe, emit } = useNotificationChannel({
  channel: "notifications",
});

// Subscription is automatically cleaned up when component unmounts
subscribe((event) => {
  console.log(event.data);
});
</script>
```

## Using onEvent Callback

For simpler use cases, use the `onEvent` callback:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useNotificationSubscription } from "the-base-event/vue";

const notifications = ref<string[]>([]);

useNotificationSubscription<string>({
  channel: "notifications",
  onEvent: (event) => {
    notifications.value.push(event.data);
  },
  replay: true,
});
</script>

<template>
  <ul>
    <li v-for="msg in notifications" :key="msg">{{ msg }}</li>
  </ul>
</template>
```

## TypeScript

The adapter is fully typed with generics:

```typescript
interface UserNotification {
  id: string;
  message: string;
  timestamp: number;
}

const { events, emit, subscribe } = useNotificationChannel<UserNotification>({
  channel: "user-notifications",
});

subscribe((event) => {
  // event.data is typed as UserNotification
  console.log(event.data.message);
});

emit({
  id: "1",
  message: "Hello!",
  timestamp: Date.now(),
});
```

## Real-World Example: Toast Notifications

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useNotificationSubscription } from "the-base-event/vue";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

const toasts = ref<Toast[]>([]);

useNotificationSubscription<Toast>({
  channel: "toast",
  onEvent: (event) => {
    const toast = event.data;
    toasts.value.push(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== toast.id);
    }, 5000);
  },
  replay: false,
});

const emit = (message: string, type: Toast["type"] = "info") => {
  // This would be called from another component
  const { emit: sendToast } = useNotificationChannel<Toast>({
    channel: "toast",
  });
  sendToast({
    id: crypto.randomUUID(),
    message,
    type,
  });
};
</script>

<template>
  <div class="toast-container">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :class="['toast', `toast-${toast.type}`]"
    >
      {{ toast.message }}
    </div>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
}

.toast {
  padding: 1rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
}

.toast-success { background: #10b981; }
.toast-error { background: #ef4444; }
.toast-info { background: #3b82f6; }
</style>
```

## Best Practices

1. **Use shared emitters** for related components
2. **Leverage reactive refs** - use `events.value` and `lastEvent.value` in script
3. **Disable replay** for high-frequency events
4. **Use TypeScript generics** for type safety
5. **Let composables handle cleanup** - it's automatic!

## Composition API Features

The composables work with all Vue Composition API features:

```vue
<script setup lang="ts">
import { computed, watch } from "vue";
import { useNotificationChannel } from "the-base-event/vue";

const { events, lastEvent } = useNotificationChannel<number>({
  channel: "counter",
});

// Computed properties
const eventCount = computed(() => events.value.length);

// Watchers
watch(lastEvent, (newEvent) => {
  if (newEvent) {
    console.log("New event:", newEvent.data);
  }
});
</script>
```
