# DevTools Recommendations

This guide covers recommended tools and techniques for debugging applications using The Base Event.

## Browser DevTools

### Chrome/Edge DevTools

#### Event Monitoring
Use the console to monitor events in real-time:

```typescript
const emitter = new EventEmitter();

// Log all events
emitter.on('*', (channel, data) => {
  console.log(`[EVENT] ${channel}:`, data);
});

// Monitor specific channels
emitter.on('user:login', (data) => {
  console.log('User logged in:', data);
});
```

#### Performance Profiler
Use the Performance tab in DevTools to:
- Profile event emission overhead
- Identify memory leaks
- Measure subscriber callback performance

### Firefox Developer Tools

- **Memory Tab**: Take heap snapshots to detect memory leaks
- **Console**: Advanced logging with custom formatting

## VS Code Extensions

### Recommended Extensions

1. **ESLint** - Linting and auto-fix
2. **Prettier** - Code formatting
3. **Jest Runner** - Run tests directly in VS Code
4. **TypeScript Hero** - TypeScript navigation and IntelliSense

## Debugging Tips

### Enable Debug Logging

```typescript
const emitter = new EventEmitter({
  performance: {
    monitoring: true,
    metricsInterval: 5000 // Log metrics every 5 seconds
  }
});

// Access metrics
const metrics = emitter.getMetrics();
console.log('Events/sec:', metrics.eventsPerSecond);
console.log('Active subscribers:', metrics.activeSubscribers);
```

### Memory Leak Detection

```typescript
// Monitor buffer size
const emitter = new EventEmitter({
  buffer: {
    maxSize: 1000,
    ttl: 60000
  }
});

// Check buffer health
setInterval(() => {
  const buffered = emitter.getBuffered();
  console.log('Buffered events:', buffered.length);
}, 10000);
```

### SSR Debugging

```typescript
// Check environment
console.log('Is SSR:', emitter.isSSR());

// Debug hydration
emitter.waitForHydration().then(() => {
  console.log('Hydration complete');
});
```

## Chrome Extensions

- **React Developer Tools** - If using React adapter
- **Vue Developer Tools** - If using Vue adapter
- **Angular DevTools** - If using Angular adapter

## Logging Best Practices

```typescript
// Production-friendly logging
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

function createLogger(level) {
  return (channel, data) => {
    if (process.env.LOG_LEVEL >= LOG_LEVELS[level]) {
      console[level](`[${channel}]`, data);
    }
  };
}

// Usage
emitter.on('*', createLogger('debug'));
```

## Bundle Analysis

Use source maps and bundle analysis tools:

```bash
# Analyze bundle size
npm run build
# Check dist/ directory for minified files
```

## Common Issues

### Events Not Received
1. Check if subscriber is registered before emit
2. Verify channel name matches exactly
3. Check if buffer strategy is configured correctly

### Memory Leaks
1. Ensure `off()` is called on component unmount
2. Check buffer TTL settings
3. Monitor subscriber count over time

### SSR Hydration Issues
1. Verify `waitForHydration()` is awaited
2. Check buffer sync settings
3. Ensure client-only events don't trigger during SSR
