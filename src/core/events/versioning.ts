/**
 * Event Versioning Support
 * Provides backward compatibility and migration for event schemas
 * @author The Base Event Team
 * @since 1.0.0
 */

import type { BaseEvent } from "./typing";

export type Version = string;

export interface VersionedEvent<T = unknown> extends BaseEvent<T> {
  version: Version;
}

export interface VersionMigration {
  from: Version;
  to: Version;
  migrate: (data: unknown) => unknown;
}

export interface VersionSchema {
  version: Version;
  schema?: Record<string, unknown>;
}

export interface VersionSubscription {
  version?: Version;
  versions?: Version[];
}

const migrationRegistry = new Map<string, Map<Version, VersionMigration>>();
const schemaRegistry = new Map<string, VersionSchema[]>();

export function registerMigration(
  channel: string,
  migration: VersionMigration
): void {
  if (!migrationRegistry.has(channel)) {
    migrationRegistry.set(channel, new Map());
  }

  migrationRegistry.get(channel)!.set(migration.from, migration);
}

export function migrateEvent<T>(
  channel: string,
  event: VersionedEvent<T>
): VersionedEvent<T> {
  const migrations = migrationRegistry.get(channel);
  if (!migrations) {
    return event;
  }

  let currentVersion = event.version;
  let migratedData: unknown = event.data;

  while (migrations.has(currentVersion)) {
    const migration = migrations.get(currentVersion)!;
    migratedData = migration.migrate(migratedData);

    if (migration.to === currentVersion) {
      break;
    }
    currentVersion = migration.to;
  }

  return {
    ...event,
    version: currentVersion,
    data: migratedData as T,
  };
}

export function getMigrationPath(
  channel: string,
  fromVersion: Version,
  toVersion: Version
): Version[] {
  const migrations = migrationRegistry.get(channel);
  if (!migrations) {
    return [];
  }

  const path: Version[] = [fromVersion];
  let currentVersion = fromVersion;

  while (migrations.has(currentVersion) && currentVersion !== toVersion) {
    const migration = migrations.get(currentVersion)!;
    currentVersion = migration.to;
    path.push(currentVersion);

    if (path.length > 20) {
      break;
    }
  }

  return currentVersion === toVersion ? path : [];
}

export function registerSchema(channel: string, schema: VersionSchema): void {
  if (!schemaRegistry.has(channel)) {
    schemaRegistry.set(channel, []);
  }

  const schemas = schemaRegistry.get(channel)!;
  schemas.push(schema);
  schemas.sort((a, b) => a.version.localeCompare(b.version));
}

export function getSchemaForVersion(
  channel: string,
  version: Version
): VersionSchema | undefined {
  const schemas = schemaRegistry.get(channel);
  if (!schemas || schemas.length === 0) {
    return undefined;
  }

  for (let i = schemas.length - 1; i >= 0; i--) {
    if (schemas[i].version <= version) {
      return schemas[i];
    }
  }

  return schemas[0];
}

export function getLatestVersion(channel: string): Version | undefined {
  const schemas = schemaRegistry.get(channel);
  if (!schemas || schemas.length === 0) {
    return undefined;
  }

  return schemas[schemas.length - 1].version;
}

export function getVersionHistory(channel: string): VersionSchema[] {
  return schemaRegistry.get(channel) || [];
}

export function createMigration(
  from: Version,
  to: Version,
  transform: (data: unknown) => unknown
): VersionMigration {
  return {
    from,
    to,
    migrate: transform,
  };
}

export function isVersionCompatible(
  eventVersion: Version,
  expectedVersion: Version
): boolean {
  return eventVersion === expectedVersion;
}

export function getVersionDifference(
  version1: Version,
  version2: Version
): "major" | "minor" | "patch" | "same" | "unknown" {
  const v1Parts = version1.split(".").map(Number);
  const v2Parts = version2.split(".").map(Number);

  if (v1Parts[0] !== v2Parts[0]) {
    return "major";
  }
  if (v1Parts[1] !== v2Parts[1]) {
    return "minor";
  }
  if (v1Parts[2] !== v2Parts[2]) {
    return "patch";
  }
  if (v1Parts.join(".") === v2Parts.join(".")) {
    return "same";
  }

  return "unknown";
}

export interface VersionFilterOptions {
  exact?: Version;
  minVersion?: Version;
  maxVersion?: Version;
}

export function shouldProcessEvent(
  event: VersionedEvent,
  filter: VersionFilterOptions
): boolean {
  if (filter.exact) {
    return event.version === filter.exact;
  }

  if (filter.minVersion) {
    if (event.version < filter.minVersion) {
      return false;
    }
  }

  if (filter.maxVersion) {
    if (event.version > filter.maxVersion) {
      return false;
    }
  }

  return true;
}

export function getVersionSubscribers(
  subscribers: Map<string, Set<unknown>>,
  version?: Version,
  versions?: Version[]
): Set<unknown> {
  if (!version && (!versions || versions.length === 0)) {
    return new Set();
  }

  const result = new Set<unknown>();

  for (const [_channel, callbacks] of subscribers) {
    for (const callback of callbacks) {
      result.add(callback);
    }
  }

  return result;
}

export function clearVersionRegistry(channel?: string): void {
  if (channel) {
    migrationRegistry.delete(channel);
    schemaRegistry.delete(channel);
  } else {
    migrationRegistry.clear();
    schemaRegistry.clear();
  }
}

export interface VersionedEventConfig {
  defaultVersion?: Version;
  autoMigrate?: boolean;
  strictVersioning?: boolean;
}

export function createVersionedEvent<T>(
  channel: string,
  data: T,
  version: Version,
  config?: VersionedEventConfig
): VersionedEvent<T> {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    channel,
    data,
    timestamp: Date.now(),
    version: version || config?.defaultVersion || "1.0.0",
  };
}
