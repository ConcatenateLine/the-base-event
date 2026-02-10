/**
 * TTL (Time To Live) memory management for buffer cleanup
 * @author The Base Event Team
 * @since 1.0.0
 */

import type { BufferedEvent } from '../../events/typing';

export interface TTLConfig {
  ttl: number;
  maxSize: number;
  checkInterval?: number;
}

export interface MemoryManager {
  cleanup<T>(buffer: Map<string, BufferedEvent<T>[]>): number;
  setTTL(ttl: number): void;
  setMaxSize(maxSize: number): void;
  isExpired(event: BufferedEvent<unknown>): boolean;
}

/**
 * TTL-based memory manager implementation
 */
export default function createTTLManager(ttl: number, maxSize: number): MemoryManager {
  const interval = ttl / 4; // Check every quarter TTL
  let cleanupInterval: NodeJS.Timeout | null = null;
  
  return {
    cleanup<T>(buffer: Map<string, BufferedEvent<T>[]>): number {
      let cleanedCount = 0;
      const now = Date.now();
      
      for (const [channel, events] of buffer.entries()) {
        const originalLength = events.length;
        
        // Remove expired events
        for (let i = events.length - 1; i >= 0; i--) {
          const event = events[i];
          if (isEventExpired(event)) {
            events.splice(i, 1);
            cleanedCount++;
          }
        }
        
        // Update buffer if events were removed
        if (events.length < originalLength) {
          buffer.set(channel, events);
        }
      }
      
      return cleanedCount;
    },
    
    setTTL(newTtl: number): void {
      ttl = newTtl;
      
      // Restart cleanup interval
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
      }
      
      cleanupInterval = setInterval(() => {
        // Auto-cleanup logic would be called here
      }, interval);
    },
    
    setMaxSize(newMaxSize: number): void {
      maxSize = newMaxSize;
    },
    
    isExpired(event: BufferedEvent<unknown>): boolean {
      if (!event.ttl) return false;
      
      const now = Date.now();
      return now - event.bufferedAt > event.ttl;
    }
  };
}

/**
 * Utility function to check if event is expired
 */
function isEventExpired(event: BufferedEvent<unknown>): boolean {
  if (!event.ttl) return false;
  
  const now = Date.now();
  return now - event.bufferedAt > event.ttl;
}