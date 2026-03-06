/**
 * Angular adapter exports
 * @author The Base Event Team
 * @since 1.0.0
 */

export {
  NotificationModule,
  NOTIFICATION_SERVICE_CONFIG,
  NotificationService,
} from "./module";

export { createNotificationService } from "./notification.service";

export { EventEmitter, createEventEmitter } from "../../core";

export type {
  NotificationServiceConfig,
  NotificationChannelState,
  EventEmitterConfig,
  BaseEvent,
  EventCallback,
  UnsubscribeFunction,
} from "./notification.service";
