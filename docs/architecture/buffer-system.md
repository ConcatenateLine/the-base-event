# Buffer System Architecture
## Intelligent Event Buffering Strategies

---

## 🎯 **Overview**

The Buffer System provides **intelligent event management** with configurable strategies, TTL-based cleanup, and cross-tab synchronization. It ensures no events are lost while maintaining memory safety.

---

## 🏗️ **System Architecture**

### **Core Manager** (`src/core/buffer/index.ts`)
```typescript
interface BufferManager {
  add<T>(event: BaseEvent<T>): void;
  get(channel: string): BufferedEvent<unknown>[];
  has(channel: string): boolean;
  clear(channel?: string): void;
  size: number;
  configure(config: Partial<BufferConfig>): void;
  getMetrics(): BufferMetrics;
  evictExpired(): number;
}
```

### **Strategy Pattern** (`src/core/buffer/strategies/`)
```typescript
interface BufferStrategy {
  add<T>(buffer: Map<string, BufferedEvent<unknown>[]>, event: BufferedEvent<T>): void;
  shouldEvict<T>(buffer: Map<string, BufferedEvent<unknown>[]>, channel: string): boolean;
  evictOldest<T>(buffer: Map<string, BufferedEvent<unknown>[]>, channel: string): BufferedEvent<unknown> | null;
}
```

### **Memory Management** (`src/core/buffer/memory/`)
```typescript
interface MemoryManager {
  cleanup<T>(buffer: Map<string, BufferedEvent<T>[]>): number;
  setTTL(ttl: number): void;
  setMaxSize(maxSize: number): void;
  isExpired(event: BufferedEvent<unknown>): boolean;
}
```

---

## 🎨 **Strategy Implementations**

### **LRU Strategy** (`strategies/lru.ts`)
**Use Case**: Frequently accessed channels
**Algorithm**: Track access order, evict least recently used
**Performance**: O(1) operations, excellent hit ratio

```typescript
class LRUStrategy implements BufferStrategy {
  private accessOrder = new Map<string, number>();
  
  add(buffer, event) {
    // Update LRU order and evict if needed
  }
}
```

### **FIFO Strategy** (`strategies/fifo.ts`)
**Use Case**: Chronological event ordering
**Algorithm**: Simple queue behavior
**Performance**: O(1) operations, predictable memory

```typescript
class FIFOStrategy implements BufferStrategy {
  add(buffer, event) {
    // Add to end, evict from start if needed
  }
}
```

### **Priority Strategy** (`strategies/priority.ts`)
**Use Case**: Critical event handling
**Algorithm**: Sort by priority, evict lowest priority first
**Performance**: O(n log n) due to sorting

```typescript
class PriorityStrategy implements BufferStrategy {
  add(buffer, event) {
    // High/Medium/Low priority ordering
  }
}
```

---

## 🧠 **Memory Management**

### **TTL-Based Cleanup** (`memory/ttl.ts`)
**Features**:
- Configurable time-to-live (TTL)
- Automatic expiration checks
- Periodic cleanup intervals
- Memory usage estimation

```typescript
// 30-second TTL with cleanup every 7.5 seconds
const ttlManager = createTTLManager(30000, 1000);
```

### **Size Limits**
**Features**:
- Per-channel maximum events
- Global memory constraints
- Overflow prevention
- Memory usage monitoring

---

## 🔄 **Cross-Tab Synchronization**

### **BroadcastChannel API**
```typescript
// Share buffer state across browser windows
const syncManager = createSynchronizationManager();

syncManager.sync(event);
```

### **LocalStorage Integration**
```typescript
// Persist buffer during page reload
const CROSS_TAB_KEY = 'the-base-event-buffer';

// Automatic restore on initialization
const restoredBuffer = loadFromLocalStorage();
```

---

## 📊 **Performance Metrics**

### **Buffer Analytics**
```typescript
interface BufferMetrics {
  totalEvents: number;        // Total events across channels
  bufferedEvents: number;       // Currently buffered
  memoryUsage: number;         // Estimated memory usage
  channels: number;           // Active channels
  evictions: number;          // Events evicted
  hits: number;                // Buffer hits (LRU)
}
```

### **Real-time Monitoring**
```typescript
// Track events per second and buffer utilization
const metrics = buffer.getMetrics();

console.log(`Events/sec: ${metrics.eventsPerSecond}`);
console.log(`Buffer utilization: ${metrics.bufferUtilization}%`);
```

---

## 🎯 **Configuration**

### **Buffer Options**
```typescript
interface BufferConfig {
  strategy: 'lru' | 'fifo' | 'priority';
  maxSize: number;              // Maximum events per channel
  ttl: number;                 // Time-to-live in ms
  crossTab?: boolean;            // Enable cross-tab sync
  compression?: boolean;          // Compress large payloads
}
```

### **Strategy Selection Guidelines**

| Access Pattern | Recommended Strategy |
|--------------|-------------------|
| Frequent reads | LRU |
| Chronological order | FIFO |
| Critical events | Priority |

---

## 🚀 **Benefits**

### **✅ Event Reliability**
- Intelligent replay guarantees no lost events
- Automatic cleanup prevents memory leaks
- Cross-tab synchronization ensures consistency

### **✅ Performance**
- Strategy selection optimizes for use case
- O(1) operations for common patterns
- Memory usage control prevents unbounded growth

### **✅ Flexibility**
- Pluggable strategy pattern
- Configurable parameters
- Framework-agnostic design

---

*Buffer system: Complete implementation with intelligent strategies and memory management*