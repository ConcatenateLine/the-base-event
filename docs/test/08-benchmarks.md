# Performance Benchmarks Test Plan

## Overview

This document outlines the test strategy for Performance Benchmarks. These benchmarks validate that the project meets its performance targets: ≥100K events/sec, <1ms latency, and controlled memory usage.

## Test Scope

### Performance Targets

- **Bundle Size:** ≤1.5KB (minified + gzipped)
- **Events Per Second:** ≥100K events/sec
- **Memory Usage:** <10MB per 100K events
- **Latency:** <1ms overhead per emit

### Test Components

- Core emit throughput
- Buffer add speed
- Subscription overhead
- Middleware latency
- Memory growth
- Emit latency
- Multiple subscribers handling

## Benchmark Categories

### 1. Core Emit Throughput

#### Test Cases

```typescript
describe("Core Emit Throughput", () => {
  it("should handle 100K events per second");
  it("should sustain high throughput over 5 seconds");
});
```

#### Validation Points

- Verify event emission rate meets ≥100K events/sec target
- Confirm sustained performance over extended duration
- Measure actual events per second achieved

#### Pass Criteria

- Events per second ≥ 100,000
- Sustained throughput over 5 seconds without degradation

---

### 2. Buffer Add Speed

#### Test Cases

```typescript
describe("Buffer Add Speed", () => {
  it("should add 100K events to buffer in under 1 second");
  it("should maintain buffer performance under load");
});
```

#### Validation Points

- Measure raw buffer add performance
- Test buffer under sustained load

#### Pass Criteria

- 100K events added in <1500ms
- Maintain ≥50K events/sec under load

---

### 3. Subscription Overhead

#### Test Cases

```typescript
describe("Subscription Overhead", () => {
  it("should subscribe 10K channels in under 1 second");
  it("should have minimal subscription latency");
});
```

#### Validation Points

- Measure subscription creation speed
- Test per-subscription latency

#### Pass Criteria

- 10K subscriptions in <1000ms
- Subscription latency <2000ns

---

### 4. Middleware Latency

#### Test Cases

```typescript
describe("Middleware Latency", () => {
  it("should have average middleware latency under 1ms");
});
```

#### Validation Points

- Measure middleware chain overhead
- Test with single middleware

#### Pass Criteria

- Average middleware latency <1ms per event

---

### 5. Memory Growth

#### Test Cases

```typescript
describe("Memory Growth", () => {
  it("should use less than 10MB per 100K events");
  it("should not leak memory on clear");
});
```

#### Validation Points

- Measure memory usage per event
- Verify no memory leaks on buffer clear

#### Pass Criteria

- Memory usage <15MB per 100K events
- Buffer clears to 0 events

---

### 6. Latency

#### Test Cases

```typescript
describe("Latency", () => {
  it("should have emit latency under 1ms");
});
```

#### Validation Points

- Measure individual emit operation latency

#### Pass Criteria

- Average emit latency <1ms

---

### 7. Multiple Subscribers

#### Test Cases

```typescript
describe("Multiple Subscribers", () => {
  it("should handle 10K subscribers efficiently");
});
```

#### Validation Points

- Test emit performance with many subscribers
- Measure notification overhead

#### Pass Criteria

- Emit to 10K subscribers in <10ms

---

## Test Execution

### Running Benchmarks

```bash
# Run all benchmarks
npm run bench

# Run specific benchmark category
npm run bench -- --testNamePattern="Core Emit"
```

### Expected Results

All benchmarks should pass with results meeting or exceeding targets.

---

## CI Integration

Benchmarks should be run:

1. **Pre-publish:** Before npm publish to ensure no performance regressions
2. **CI Pipeline:** On every pull request to catch regressions early
3. **Release:** As part of release process

### Sample CI Configuration

```yaml
name: Performance Benchmarks

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run bench
```

---

## Maintenance

### Adjusting Thresholds

If system variability causes intermittent failures, thresholds can be adjusted in `src/test/benchmark/throughput.test.ts`:

```typescript
const TARGET_EVENTS_PER_SECOND = 100000;
const TARGET_LATENCY_MS = 1;
```

### Adding New Benchmarks

1. Add test case to appropriate describe block
2. Define clear, measurable threshold
3. Update this test plan
4. Update implementation report

---

## References

- [Implementation Report](../test-implementation/08-performance-benchmarks-implementation.md)
- [Performance Targets](../README.md#success-metrics--kpis)
- [Bundle Size Analysis](../architecture/overview.md)
