# Event Versioning Support

The Base Event provides built-in support for event schema versioning, enabling backward compatibility and smooth migrations between event schema versions.

## Overview

Event versioning allows you to:
- Maintain backward compatibility with older event consumers
- Migrate event schemas gradually
- Track version history for event channels
- Filter events by version

## Basic Usage

### Adding Version to Events

```typescript
import { EventEmitter } from '@core/emitter';

const emitter = new EventEmitter();

// Emit event with version
emitter.emit('user:login', { userId: '123' }, { version: '2.0.0' });
```

### Version Interface

Events can include an optional `version` field:

```typescript
interface VersionedEvent<T> extends BaseEvent<T> {
  version?: string;
}
```

## Migration System

### Registering Migrations

```typescript
import { registerMigration, createMigration } from '@core/events/versioning';

// Create a migration from v1.0.0 to v2.0.0
const migration = createMigration('1.0.0', '2.0.0', (data) => {
  // Transform v1 data to v2 format
  return {
    ...data,
    // Add new fields or transform existing
    timestamp: new Date(data.timestamp).toISOString(),
  };
});

registerMigration('user:login', migration);
```

### Automatic Migration

Events are automatically migrated when using `migrateEvent`:

```typescript
import { migrateEvent } from '@core/events/versioning';

const oldEvent = {
  id: '1',
  channel: 'user:login',
  data: { timestamp: 1234567890 },
  timestamp: Date.now(),
  version: '1.0.0',
};

const migratedEvent = migrateEvent('user:login', oldEvent);
// Returns event with migrated data and updated version
```

## Schema Versioning

### Registering Version Schemas

```typescript
import { registerSchema } from '@core/events/versioning';

registerSchema('user:login', {
  version: '1.0.0',
  schema: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
    },
  },
});

registerSchema('user:login', {
  version: '2.0.0',
  schema: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      email: { type: 'string' },
    },
  },
});
```

### Getting Schema for Version

```typescript
import { getSchemaForVersion, getLatestVersion, getVersionHistory } from '@core/events/versioning';

// Get schema for specific version
const schema = getSchemaForVersion('user:login', '1.0.0');

// Get latest version
const latest = getLatestVersion('user:login'); // '2.0.0'

// Get version history
const history = getVersionHistory('user:login');
// Returns array of VersionSchema sorted by version
```

## Version Filtering

### Filter Events by Version

```typescript
import { shouldProcessEvent } from '@core/events/versioning';

const event = {
  id: '1',
  channel: 'user:login',
  data: {},
  timestamp: Date.now(),
  version: '1.0.0',
};

// Exact version
shouldProcessEvent(event, { exact: '1.0.0' }); // true

// Minimum version
shouldProcessEvent(event, { minVersion: '2.0.0' }); // false

// Maximum version
shouldProcessEvent(event, { maxVersion: '1.5.0' }); // false

// Range
shouldProcessEvent(event, { minVersion: '1.0.0', maxVersion: '2.0.0' }); // true
```

## Version Comparison

```typescript
import { getVersionDifference, isVersionCompatible } from '@core/events/versioning';

getVersionDifference('1.0.0', '2.0.0'); // 'major'
getVersionDifference('1.0.0', '1.1.0'); // 'minor'
getVersionDifference('1.0.0', '1.0.1'); // 'patch'
getVersionDifference('1.0.0', '1.0.0'); // 'same'

isVersionCompatible('1.0.0', '1.0.0'); // true
isVersionCompatible('1.0.0', '2.0.0'); // false
```

## Creating Versioned Events

```typescript
import { createVersionedEvent } from '@core/events/versioning';

const event = createVersionedEvent(
  'user:login',
  { userId: '123' },
  '2.0.0',
  { defaultVersion: '1.0.0' }
);
```

## Registry Management

```typescript
import { clearVersionRegistry } from '@core/events/versioning';

// Clear specific channel
clearVersionRegistry('user:login');

// Clear all channels
clearVersionRegistry();
```

## Best Practices

1. **Use semantic versioning** (major.minor.patch) for clear compatibility tracking
2. **Register migrations** before emitting events with new versions
3. **Maintain backward compatibility** by supporting older versions during migration periods
4. **Document version changes** in your event schemas
5. **Use version filtering** to prevent breaking changes in consumers
