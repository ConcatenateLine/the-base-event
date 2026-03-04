/**
 * Vue adapter exports
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
  NotificationChannelReturn,
  UseNotificationSubscriptionOptions,
  EventEmitterConfig,
  BaseEvent,
  EventCallback,
  UnsubscribeFunction,
} from "./useNotificationChannel";
