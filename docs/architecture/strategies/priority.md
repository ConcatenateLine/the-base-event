# Priority Strategy Implementation
## Priority-Based Event Ordering and Eviction

### **Use Case**
Critical event handling where important events must be processed first, regardless of when they were added.

### **Priority Levels**
```typescript
type EventPriority = 'high' | 'medium' | 'low';

const PRIORITY_WEIGHT = {
  high: 3,
  medium: 2,
  low: 1
};
```

### **Algorithm**
1. **Priority Assignment**: Extract from event type or options
2. **Sort by Priority**: High > Medium > Low ordering
3. **Tie-Breaking**: Earlier events take precedence for same priority
4. **Priority Eviction**: Remove lowest priority events when buffer is full

### **Performance Characteristics**
- **Time Complexity**: O(n log n) due to sorting
- **Space Complexity**: O(n)
- **Eviction**: Guaranteed removal of lowest priority
- **Order Preservation**: Maintains priority order within each level

### **Interface Implementation**
```typescript
class PriorityStrategy implements BufferStrategy {
  add(buffer, event) {
    // Add event and sort by priority
    // Evict lowest priority if over capacity
  }

  shouldEvict(buffer, channel) {
    // Always evict if buffer is full
    // Priority-based eviction guaranteed
  }

  evictOldest(buffer, channel) {
    // Remove and return lowest priority event
    // From lowest priority group
  }
}
```

### **Key Features**
- **Critical Priority**: High-priority events processed first
- **Intelligent Eviction**: Low-priority events evicted first
- **Configurable Levels**: Customizable priority weights
- **Tie-Breaking**: Consistent order preservation

### **Priority Assignment Logic**
```typescript
// Extract priority from event metadata
private getPriority<T>(event: BufferedEvent<T>): EventPriority {
  // Check event.type first
  if (event.type === 'high') return 'high';
  if (event.type === 'medium') return 'medium';
  
  // Fallback to event.options.priority or default
  return event.options?.priority || 'low';
}
```

### **Use Cases**
- **Critical Alerts**: `priority: 'high'` for system errors
- **User Actions**: `priority: 'medium'` for important user events
- **Analytics**: `priority: 'low'` for general events

### **Trade-offs**
- **Performance Cost**: O(n log n) due to sorting overhead
- **Complexity**: More sophisticated than FIFO/LRU
- **Memory Usage**: Similar to other strategies
- **Reliability**: Guaranteed critical event processing

---

*Priority strategy implementation with intelligent critical event handling*