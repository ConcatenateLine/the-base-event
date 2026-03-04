/**
 * Framework examples exports
 * @author The Base Event Team
 * @since 1.0.0
 */

export { default as basicUsage } from "./basic/usage";

export {
  ChatComponent,
  NotificationToast,
  EventLogger,
  useReactiveState,
  useEventEffect,
  globalEmitter,
} from "./frameworks/react-example";

export {
  NotificationService,
  NotificationModule,
} from "./frameworks/angular-example";

export {
  useEventBus,
  useChannel,
  useTodoStore,
  getGlobalEmitter,
} from "./frameworks/vue-example";

export {
  createServerEventEmitter,
  createNotificationChannel,
  NotificationChannel,
} from "@adapters/node";
