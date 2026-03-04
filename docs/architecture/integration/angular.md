# Angular Integration Guide

The Angular adapter provides a service for integrating The Base Event with Angular applications, with support for dependency injection and Angular signals.

## Installation

```bash
npm install the-base-event
```

## Quick Start

### 1. Provide the Service

```typescript
// app.module.ts
import { NgModule } from "@angular/core";
import { NotificationService } from "the-base-event/angular";

@NgModule({
  providers: [NotificationService],
})
export class AppModule {}
```

### 2. Use in Component

```typescript
import { Component, OnInit, OnDestroy } from "@angular/core";
import { NotificationService } from "the-base-event/angular";
import { Subscription } from "rxjs";

@Component({
  selector: "app-notifications",
  template: `
    <button (click)="sendNotification()">Send</button>
    <ul>
      <li *ngFor="let event of events">{{ event.data }}</li>
    </ul>
  `,
})
export class NotificationsComponent implements OnInit, OnDestroy {
  events: any[] = [];
  private unsubscribe?: Subscription;

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.unsubscribe = this.notificationService.subscribe<string>(
      "notifications",
      (event) => {
        this.events = this.notificationService.getEvents("notifications");
      },
      true // replay buffered events
    );
  }

  sendNotification() {
    this.notificationService.emit("Hello from Angular!");
  }

  ngOnDestroy() {
    this.unsubscribe?.unsubscribe();
  }
}
```

## API Reference

### NotificationService

```typescript
class NotificationService {
  constructor(config?: NotificationServiceConfig);
  getEmitter(): EventEmitter;
  subscribe<T>(channel: string, callback: EventCallback<T>, replay?: boolean): UnsubscribeFunction;
  subscribeOnce<T>(channel: string, callback: EventCallback<T>): UnsubscribeFunction;
  subscribePattern<T>(pattern: string, callback: EventCallback<T>, replay?: boolean): UnsubscribeFunction;
  emit<T>(channel: string, data: T): void;
  getEvents<T>(channel: string): BaseEvent<T>[];
  getLastEvent<T>(channel: string): BaseEvent<T> | null;
  getChannelState<T>(channel: string): NotificationChannelState<T>;
  clear(channel?: string): void;
  unsubscribe(channel: string): void;
  unsubscribeAll(): void;
  destroy(): void;
}
```

### Configuration

```typescript
interface NotificationServiceConfig extends EventEmitterConfig {
  provideSignals?: boolean;
}
```

## Dependency Injection

### Using providedIn: 'root'

```typescript
// notification.service.ts
import { Injectable } from "@angular/core";
import { NotificationService } from "the-base-event/angular";

@Injectable({
  providedIn: "root",
})
export class AppNotificationService extends NotificationService {}
```

### Using Module Providers

```typescript
// app.module.ts
import { NgModule } from "@angular/core";
import { NotificationService } from "the-base-event/angular";

@NgModule({
  providers: [NotificationService],
})
export class AppModule {}
```

## Service Lifecycle

### Initialization

```typescript
@Component({})
export class MyComponent implements OnInit {
  constructor(private notifications: NotificationService) {}

  ngOnInit() {
    // Subscribe to channels
    this.notifications.subscribe("channel-1", this.handleEvent, true);
  }

  private handleEvent = (event: BaseEvent) => {
    console.log(event.data);
  };
}
```

### Cleanup on Destroy

```typescript
@Component({})
export class MyComponent implements OnInit, OnDestroy {
  constructor(private notifications: NotificationService) {}

  ngOnInit() {
    this.notifications.subscribe("channel-1", this.handleEvent);
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.notifications.unsubscribeAll();
    // Or destroy the service completely
    // this.notifications.destroy();
  }

  private handleEvent = (event: BaseEvent) => {
    console.log(event.data);
  };
}
```

## Event Store

The service maintains an internal event store for each channel:

```typescript
// Get all events for a channel
const events = this.notifications.getEvents<string>("notifications");

// Get the last event
const lastEvent = this.notifications.getLastEvent<string>("notifications");

// Get full channel state
const state = this.notifications.getChannelState<string>("notifications");
// state.events - all events
// state.lastEvent - last event
// state.metrics - performance metrics
```

## Pattern Subscriptions

Subscribe to channels matching a pattern:

```typescript
// Subscribe to all user.* events
this.notifications.subscribePattern<string>("user.*", (event) => {
  console.log(event.channel, event.data);
});

// Matches: user.login, user.logout, user.update, etc.
```

## One-Time Subscriptions

```typescript
// Subscribe to first event only
this.notifications.subscribeOnce<string>("initialization", (event) => {
  console.log("Initialized with:", event.data);
});
```

## Angular Signals (Optional)

When `provideSignals: true` is configured, the service can work with Angular signals:

```typescript
const service = new NotificationService({
  provideSignals: true,
});

// The service maintains reactive state that components can observe
```

## Error Handling

```typescript
try {
  this.notifications.emit("channel", "data");
} catch (error) {
  if (error.message.includes("destroyed")) {
    // Reinitialize the service
    this.notifications = new NotificationService();
  }
}
```

## Best Practices

1. **Use dependency injection** for centralized event management
2. **Clean up subscriptions** in `ngOnDestroy`
3. **Use pattern subscriptions** for related channel groups
4. **Leverage event store** for debugging and state management
5. **Extend the service** for application-specific functionality

## Example: Real-World Usage

```typescript
import { Component, OnDestroy, OnInit } from "@angular/core";
import { NotificationService } from "the-base-event/angular";
import type { BaseEvent, UnsubscribeFunction } from "the-base-event";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

@Component({
  selector: "app-toast",
  template: `
    <div class="toast-container">
      <div
        *ngFor="let toast of toasts"
        [class]="'toast toast-' + toast.type"
      >
        {{ toast.message }}
      </div>
    </div>
  `,
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private subscriptions: UnsubscribeFunction[] = [];

  constructor(private notifications: NotificationService) {}

  ngOnInit() {
    const unsub = this.notifications.subscribe<Toast>(
      "toast",
      (event) => {
        this.toasts = [...this.toasts, event.data];
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
          this.toasts = this.toasts.filter((t) => t.id !== event.data.id);
        }, 5000);
      },
      false
    );

    this.subscriptions.push(unsub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach((unsub) => unsub());
  }
}
```

## TypeScript Support

The adapter is fully typed:

```typescript
interface UserEvent {
  userId: string;
  action: string;
  timestamp: number;
}

this.notifications.subscribe<UserEvent>("user-actions", (event) => {
  // event.data is typed as UserEvent
  console.log(event.data.userId, event.data.action);
});
```
