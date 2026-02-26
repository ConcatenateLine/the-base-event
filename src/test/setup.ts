/**
 * Jest test setup for The Base Event
 * @author The Base Event Team
 * @since 1.0.0
 */

import { EventEmitter } from "../core/emitter";

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledWithEvent(event: { channel: string; data: unknown }): R;
    }
  }
}

expect.extend({
  toHaveBeenCalledWithEvent(
    received: jest.Mock,
    expected: { channel: string; data: unknown }
  ) {
    const calls = received.mock.calls;
    const pass = calls.some(call => {
      const event = call[0];
      return (
        event &&
        event.channel === expected.channel &&
        event.data === expected.data
      );
    });

    if (pass) {
      return {
        message: () =>
          `Expected event not to have been called with ${JSON.stringify(expected)}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected event to have been called with ${JSON.stringify(expected)}`,
        pass: false,
      };
    }
  },
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup
});

export function waitForAsync(timeout = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

export function createSpyCallback<T>(): jest.MockedFunction<
  (event: import("../core/events/typing").BaseEvent<T>) => void
> {
  return jest.fn();
}
