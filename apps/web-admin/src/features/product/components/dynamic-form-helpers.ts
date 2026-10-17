import type { FieldSpec } from '../types';

/** Deep-reads a dot-path value, tolerating flat dot-keys and missing segments. */
export function getValueAtPath(obj: Record<string, unknown>, path: string): unknown {
  if (!obj || !path) return undefined;
  if (path in obj) return obj[path];
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Maps every schema field name to its group (defaults to 'details'). */
export function buildNameToGroup(fields: FieldSpec[]): Record<string, string> {
  const map: Record<string, string> = {};
  fields.forEach((field) => {
    map[field.name] = field.group || 'details';
  });
  return map;
}

/** Resolves a watched RHF path to its owning schema field (exact, then root segment). */
export function resolveFieldName(path: string, nameToGroup: Record<string, string>): string {
  if (nameToGroup[path]) return path;
  const rootKey = path.split('.')[0];
  if (nameToGroup[rootKey]) return rootKey;
  return path;
}

/** Buckets schema fields by group (defaults to 'details'). */
export function groupFieldsByGroup(fields: FieldSpec[]): Record<string, FieldSpec[]> {
  const acc: Record<string, FieldSpec[]> = {};
  fields.forEach((field) => {
    const key = field.group || 'details';
    (acc[key] = acc[key] || []).push(field);
  });
  return acc;
}

/** Consistent order across categories: color → size → other variants. */
export function kindRank(field: FieldSpec): number {
  const name = field.name?.toLowerCase() ?? '';
  const label = field.label?.toLowerCase() ?? '';
  if (name.includes('color') || label.includes('color')) return 0;
  if (name.includes('size') || label.includes('size')) return 1;
  return 2;
}

/** Returns variant fields sorted color → size → others without mutating the input. */
export function sortVariantFields(fields: FieldSpec[]): FieldSpec[] {
  return [...fields].sort((a, b) => kindRank(a) - kindRank(b));
}

/** A server-provided default paired with the field that declares it. */
export interface ServerDefaultEntry {
  name: string;
  value: unknown;
  group: string;
}

/** Server defaults only apply to fields the seller has not filled in yet. */
const isUnset = (value: unknown): boolean => value === undefined || value === null || value === '';

/**
 * Server defaults that should be written into an untouched form, paired with
 * their owning group. Pure — the caller applies them, then re-validates the
 * returned names so an invalid default surfaces immediately.
 */
export function collectServerDefaults(
  fields: FieldSpec[],
  currentValues: Record<string, unknown>,
): ServerDefaultEntry[] {
  const entries: ServerDefaultEntry[] = [];
  for (const field of fields) {
    if (field.value === undefined || field.value === null) continue;
    if (!isUnset(currentValues[field.name])) continue;
    entries.push({ name: field.name, value: field.value, group: field.group || 'details' });
  }
  return entries;
}

/** Names of the schema fields the seller can currently see (validation scope). */
export function visibleFieldNames(fields: FieldSpec[]): string[] {
  return fields.filter((field) => field.visible !== false).map((field) => field.name);
}

/** Lower-cased schema field names, the shared lookup set for the checks below. */
function schemaNameSet(fields: FieldSpec[]): Set<string> {
  return new Set(fields.map((field) => field.name.toLowerCase()));
}

/** True when the category schema declares its own name/title input. */
export function schemaDeclaresName(fields: FieldSpec[]): boolean {
  const names = schemaNameSet(fields);
  return names.has('name') || names.has('productname') || names.has('title');
}

/** True when the category schema declares its own brand input. */
export function schemaDeclaresBrand(fields: FieldSpec[]): boolean {
  const names = schemaNameSet(fields);
  return names.has('brand') || names.has('productbrand');
}
