/**
 * React adapter exports
 * @author The Base Event Team
 * @since 1.0.0
 */

export {
  useNotificationChannel,
  useNotificationSubscription,
  EventEmitter,
  createEventEmitter,
} from "./useNotificationChannel";

export type {
  UseNotificationChannelOptions,
  NotificationChannelResult,
  UseNotificationSubscriptionOptions,
  EventEmitterConfig,
  BaseEvent,
  EventCallback,
  UnsubscribeFunction,
} from "./useNotificationChannel";
