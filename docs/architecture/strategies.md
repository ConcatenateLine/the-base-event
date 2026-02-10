# Buffer Strategies Overview
## Intelligent Event Buffering Algorithms

---

## 🎯 **Available Strategies**

### **1. LRU (Least Recently Used)**
**Best for**: Frequently accessed channels, cache-like behavior
- **File**: `lru.ts`

### **2. FIFO (First In, First Out)**
**Best for**: Chronological event ordering, predictable behavior
- **File**: `fifo.ts`

### **3. Priority**
**Best for**: Critical event handling, important notifications
- **File**: `priority.ts`

---

## 🔧 **Selection Guidelines**

### **Choose by Access Pattern**

| Access Pattern | Recommended Strategy | Reason |
|---------------|-------------------|--------|
| Frequent reads | LRU | Optimizes cache hits |
| Sequential events | FIFO | Preserves order |
| Mixed priorities | Priority | Handles critical events |

### **Performance Comparison**

| Strategy | Memory Overhead | Hit Ratio (LRU) | Ordering | Complexity |
|----------|----------------|----------------|---------|-----------|
| LRU | Low (access map) | Excellent | Not chronological | Medium |
| FIFO | None | N/A | Perfect | Low |
| Priority | None | N/A | Priority-based | High |

---

## 📊 **Implementation Status**

All strategies implement the `BufferStrategy` interface and are fully pluggable.

```typescript
// Strategy factory usage
const strategies = {
  lru: new LRUStrategy({ maxSize: 1000 }),
  fifo: new FIFOStrategy({ maxSize: 1000 }),
  priority: new PriorityStrategy({ maxSize: 1000 })
};

// Create emitter with chosen strategy
const emitter = new EventEmitter({
  buffer: { strategy: 'lru' } // Or 'fifo' or 'priority'
});
```

---

## 📁 **Documentation Links**

- [LRU Strategy](./lru.md) - Detailed implementation
- [FIFO Strategy](./fifo.md) - Simple queue behavior
- [Priority Strategy](./priority.md) - Critical event handling

---

*Buffer strategies: Pluggable architecture with performance optimization*