# LRU Strategy Implementation
## Least Recently Used Buffer Strategy

### **Use Case**
Optimal for frequently accessed channels where recent events have higher probability of being accessed again.

### **Algorithm**
1. **Track Access Order**: Maintain timestamp-based access order
2. **Evict Oldest**: Remove least recently used item when buffer is full
3. **Update on Access**: Move accessed item to end (most recent)

### **Performance Characteristics**
- **Time Complexity**: O(1) for add/remove, O(1) for access
- **Space Complexity**: O(n) where n = buffer size
- **Hit Ratio**: Excellent for frequently accessed channels

### **Interface Implementation**
```typescript
class LRUStrategy implements BufferStrategy {
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;

  add(buffer, event) {
    // Add new event to end
    // Update access order for LRU tracking
    // Evict oldest if buffer exceeds capacity
  }

  shouldEvict(buffer, channel) {
    // Check if eviction needed
    // Return true if size limit exceeded
  }

  evictOldest(buffer, channel) {
    // Remove and return least recently used event
    // O(1) operation
  }
}
```

### **Key Features**
- **Access Order Tracking**: Timestamp-based LRU management
- **Intelligent Eviction**: Prioritizes frequently accessed events
- **Memory Efficiency**: Optimal hit rates for hot data
- **Performance**: O(1) operations for most use cases

### **Trade-offs**
- **Memory Overhead**: Access order tracking map
- **Complexity**: More complex than FIFO
- **Benefits**: Significant performance improvement for hot data

---

*LRU strategy implementation*