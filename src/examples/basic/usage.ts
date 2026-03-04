/**
 * Basic usage example for The Base Event
 * @author The Base Event Team
 * @since 1.0.0
 */

import {
  createEventEmitter,
  type EventCallback,
  type UnsubscribeFunction,
} from "@core/emitter";

interface UserEvent {
  userId: string;
  action: string;
  timestamp: number;
}

interface NotificationEvent {
  id: string;
  message: string;
  type: "info" | "warning" | "error";
}

const emitter = createEventEmitter();

const unsubscribeUser: UnsubscribeFunction = emitter.on<UserEvent>(
  "user:login",
  event => {
    console.log("User logged in:", event.data);
  }
);

emitter.emit<UserEvent>("user:login", {
  userId: "user-123",
  action: "login",
  timestamp: Date.now(),
});

emitter.once<NotificationEvent>("notification", event => {
  console.log("One-time notification:", event.data.message);
});

emitter.emit<NotificationEvent>("notification", {
  id: "notif-1",
  message: "Welcome!",
  type: "info",
});

emitter.emit<NotificationEvent>("notification", {
  id: "notif-2",
  message: "This won't trigger once listener",
  type: "info",
});

emitter.onPattern("*", event => {
  console.log("Pattern match:", event.channel, event.data);
});

emitter.onPattern("user:*", event => {
  console.log("User event:", event.channel);
});

emitter.emit("user:logout", { userId: "user-123" });
emitter.emit("notification:new", { id: "1", message: "Hi", type: "info" });

const buffered = emitter.getBuffered("user:login");
console.log("Buffered events:", buffered);

const metrics = emitter.getMetrics();
console.log("Metrics:", metrics);

emitter.clear("user:login");
unsubscribeUser();

emitter.destroy();
