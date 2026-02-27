/**
 * Priority-based buffer strategy implementation
 * @author The Base Event Team
 * @since 1.0.0
 */

import type { BaseEvent, BufferedEvent } from "../../events/typing";

export interface PriorityConfig {
  maxSize: number;
}

export type EventPriority = "high" | "medium" | "low";

/**
 * Priority strategy implementation for buffer management
 */
export default class PriorityStrategy {
  constructor(private config: PriorityConfig) {}

  add<T>(
    buffer: Map<string, BufferedEvent<unknown>[]>,
    event: BufferedEvent<T>
  ): void {
    const channel = event.channel;
    let events = buffer.get(channel) || [];

    // Add new event
    events.push(event);

    // Sort by priority (high first)
    events.sort((a, b) => {
      const priorityA = this.getPriority(a);
      const priorityB = this.getPriority(b);
      return this.comparePriority(priorityA, priorityB);
    });

    // Check if we need to evict
    if (events.length > this.config.maxSize) {
      // Evict lowest priority event
      events.pop();
    }

    // Update buffer
    buffer.set(channel, events);
  }

  shouldEvict<T>(
    buffer: Map<string, BufferedEvent<unknown>[]>,
    channel: string
  ): boolean {
    const events = buffer.get(channel) || [];
    return events.length >= this.config.maxSize;
  }

  evictOldest<T>(
    buffer: Map<string, BufferedEvent<unknown>[]>,
    channel: string
  ): BufferedEvent<unknown> | null {
    const events = buffer.get(channel) || [];
    return events.length > 0 ? events.pop() || null : null;
  }

  private getPriority<T>(event: BufferedEvent<T>): EventPriority {
    // Extract priority from event data or options
    if (event.type === "high") return "high";
    if (event.type === "medium") return "medium";
    return "low";
  }

  private comparePriority(a: EventPriority, b: EventPriority): number {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b] - priorityOrder[a];
  }
}
