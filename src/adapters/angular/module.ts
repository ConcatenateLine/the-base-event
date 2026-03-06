/**
 * Angular Provider Module
 * Provides Angular dependency injection registration
 * @author The Base Event Team
 * @since 1.0.0
 */

import {
  NotificationService,
  type NotificationServiceConfig,
} from "./notification.service";

interface AngularInjectionToken {
  ɵprov: unknown;
}

declare const Symbol: unique symbol;

interface NotificationServiceConfigToken {
  [Symbol]: unknown;
}

export const NOTIFICATION_SERVICE_CONFIG =
  "NOTIFICATION_SERVICE_CONFIG" as unknown as AngularInjectionToken &
    NotificationServiceConfigToken;

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
  type NotificationServiceConfig,
} from "./notification.service";
