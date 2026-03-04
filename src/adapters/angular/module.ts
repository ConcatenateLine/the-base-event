/**
 * Angular Provider Module
 * Provides Angular dependency injection registration
 * @author The Base Event Team
 * @since 1.0.0
 */

import {
  NotificationService,
  createNotificationService,
  type NotificationServiceConfig,
} from "./notification.service";

interface AngularInjectionToken<T> {
  ɵprov: unknown;
}

declare const Symbol: unique symbol;

interface NotificationServiceConfigToken {
  [Symbol]: unknown;
}

export const NOTIFICATION_SERVICE_CONFIG = "NOTIFICATION_SERVICE_CONFIG" as unknown as AngularInjectionToken<NotificationServiceConfig> & NotificationServiceConfigToken;

export const NotificationModule = {
  forRoot(config?: NotificationServiceConfig) {
    return {
      ngModule: NotificationModule,
      providers: [
        NotificationService,
        {
          provide: NOTIFICATION_SERVICE_CONFIG,
          useValue: config || {},
        },
      ],
    };
  },

  forFeature() {
    return {
      ngModule: NotificationModule,
      providers: [NotificationService],
    };
  },
};

export {
  NotificationService,
  createNotificationService,
  type NotificationServiceConfig,
} from "./notification.service";
