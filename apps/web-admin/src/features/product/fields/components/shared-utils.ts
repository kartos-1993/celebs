import { ProductApiService } from '../../api';
import type { FieldSpec } from '../ui-registry';

import { UploadAggregateError } from '@/lib/media-upload';

export type ImageValue = File | string;

export const imageValueKey = (value: ImageValue) =>
  typeof value === 'string' ? value : `${value.name}-${value.size}-${value.lastModified}`;

export const uploadImageFiles = async (files: File[]) => {
  if (files.length === 0) return [];
  const results = await uploadImageFilesDetailed(files);
  const failures = results.filter((r) => !r.url);
  if (failures.length > 0) {
    const errors = failures.map(
      (r) => r.error ?? new Error(`"${r.file.name}" did not return a URL. Try again.`),
    );
    throw new UploadAggregateError(errors);
  }
  return results.flatMap((r) => (r.url ? [r.url] : []));
};

export const uploadErrorMessage = (error: unknown) => {
  if (error instanceof UploadAggregateError) {
    const named = error.errors
      .map((entry) => (entry instanceof Error ? entry.message : String(entry)))
      .filter(Boolean);
    if (named.length > 0) return named.join('. ');
    return error.message || 'Image upload failed. Try again.';
  }
  return error instanceof Error ? error.message : 'Image upload failed. Try again.';
};

/** Fallback accept shown on file inputs when no field rule provides one. */
export const FALLBACK_ACCEPT = 'image/*';

/**
 * Narrows a rule-shaped `accept` value (`Record<string, unknown>` from the API)
 * to a MIME list. Unknown/absent values collapse to undefined so callers can
 * tell "no rule" apart from an empty list.
 */
export function asAcceptList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === 'string');
}

/** Narrows a rule-shaped byte-size value to a number (undefined when absent). */
export function asByteLimit(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

/**
 * Resolves the file-input `accept` attribute from a field rule: the rule's
 * MIME list joined for the input, falling back to `image/*` only when the
 * rule is absent. Pure helper so both dropzones share one path.
 */
export function resolveAcceptAttr(accept?: string[]): string {
  if (Array.isArray(accept) && accept.length > 0) return accept.join(',');
  return FALLBACK_ACCEPT;
}

const EXTENSION_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  pdf: 'application/pdf',
};

/** Maps a file/URL name to its expected MIME via extension (undefined when unknown). */
export function mimeForExtension(name: string): string | undefined {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return EXTENSION_MIME[ext];
}

/**
 * Extension+MIME consistency check: rejects files whose extension names a
 * known type that disagrees with the declared `file.type`. Unknown
 * extensions pass (server magic-byte inspection is authoritative there).
 */
export function extensionMimeMismatch(file: File): string | null {
  const expected = mimeForExtension(file.name);
  if (!expected || !file.type) return null;
  if (file.type.toLowerCase() !== expected) {
    return `Invalid file type for "${file.name}" — expected ${expected}`;
  }
  return null;
}

/** Narrowing guard for File values (replaces loose `as File` casts). */
export function isFileValue(value: unknown): value is File {
  return value instanceof File;
}

/** Narrowing guard for string URL values. */
export function isUrlValue(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Narrows an unknown form value into an image list WITHOUT the old
 * `watch(name) as ImageValue[]` casts. Positions are preserved (an image form
 * field keeps a 1:1 index <-> preview mapping), and anything that is neither
 * a File nor a string becomes an empty slot instead of an `undefined` that
 * would blow up `URL.createObjectURL` downstream.
 */
export function toImageValues(value: unknown): ImageValue[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (isFileValue(item)) return item;
    return typeof item === 'string' ? item : '';
  });
}

export interface PerFileResult {
  file: File;
  url?: string;
  error?: Error;
}

const singleUploadInFlight = new Map<File, Promise<string>>();

function fileError(file: File, message: string): Error {
  return new Error(`"${file.name}" ${message}`);
}

/**
 * Idempotent single-file upload: concurrent callers holding the SAME File
 * instance share one in-flight request, so eager per-field uploads and
 * payload-time uploads never double-upload or race. The map entry is
 * removed on settle (success or failure).
 */
function uploadSingleFile(file: File): Promise<string> {
  const hit = singleUploadInFlight.get(file);
  if (hit) return hit;
  const task = ProductApiService.uploadFiles([file]).then((urls) => {
    const url = urls[0];
    if (!url) throw fileError(file, 'did not return a URL. Try again.');
    return url;
  });
  singleUploadInFlight.set(file, task);
  task.then(
    () => {
      if (singleUploadInFlight.get(file) === task) singleUploadInFlight.delete(file);
    },
    () => {
      if (singleUploadInFlight.get(file) === task) singleUploadInFlight.delete(file);
    },
  );
  return task;
}

/** Test-only reset for the in-flight dedupe map. */
export function __resetUploadInFlightForTests(): void {
  singleUploadInFlight.clear();
}

/**
 * Per-file settled upload: every file maps to its own result entry, so each
 * failure names its file. Order matches the input order.
 */
export async function uploadImageFilesDetailed(files: File[]): Promise<PerFileResult[]> {
  const settled = await Promise.allSettled(files.map((file) => uploadSingleFile(file)));
  return settled.map((entry, idx) => {
    const file = files[idx];
    if (entry.status === 'fulfilled') return { file, url: entry.value };
    const raw = entry.reason;
    const error = raw instanceof Error ? raw : fileError(file, 'upload failed. Try again.');
    if (!/"/.test(error.message)) return { file, error: fileError(file, error.message) };
    return { file, error };
  });
}

export const validateFileBasics = (
  file: File,
  options: { accept?: string[]; maxSize?: number },
) => {
  if (typeof options.maxSize === 'number' && file.size > options.maxSize) {
    return `Each image must be <= ${Math.round(options.maxSize / 1024 / 1024)}MB`;
  }
  if (Array.isArray(options.accept) && !options.accept.includes(file.type)) {
    return 'Invalid file type';
  }
  // Client-side hardening (no magic-byte access in the browser): the file
  // extension must agree with the declared MIME type, otherwise the payload
  // is lying about its kind (e.g. `evil.jpg` typed as `image/png`).
  const mismatch = extensionMimeMismatch(file);
  if (mismatch) return mismatch;
  return null;
};

/**
 * COVER ORDER CANONICAL CONTRACT (client + server share this rule):
 * cover = mainImages[0] ?? first-color-gallery-image. The first explicit
 * main/cover image always wins; only when no main image exists does the
 * first color gallery image become the cover. Every cover-derivation site
 * (color-branch fallback, size-only branch, effectiveMainImages) must follow
 * this order — never color-0-only shortcuts.
 */

/**
 * Merges freshly picked library URLs into the current value: drops blanks,
 * dedupes while preserving first-seen order, then caps at maxItems.
 * Pure list helper for picker-select handlers.
 */
export function mergeUniqueUrls(
  current: string[],
  incoming: string[],
  maxItems?: number,
): string[] {
  const merged = Array.from(new Set([...current.filter(Boolean), ...incoming]));
  return typeof maxItems === 'number' ? merged.slice(0, maxItems) : merged;
}

/**
 * Single-cover picker resolution: the newest pick wins outright.
 */
export function takeSingleUrl(urls: string[]): string[] {
  const [newest] = urls;
  return newest ? [newest] : [];
}

/** True for absolute http(s) URLs (library picks must be absolute). */
export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates one library URL pick against accept rules via its extension
 * (no File header exists for URL picks). Returns an error naming the URL,
 * or null when it passes.
 */
export function validateLibraryUrl(url: string, options: { accept?: string[] }): string | null {
  if (!isHttpUrl(url)) return `"${url}" is not a valid image URL`;
  if (Array.isArray(options.accept) && options.accept.length > 0) {
    const expected = mimeForExtension(url.split('?')[0] as string);
    if (expected && !options.accept.includes(expected))
      return `"${url}" is not an accepted image format`;
  }
  return null;
}

export interface UrlDimensionRule {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Decodes a remote image's dimensions via Image with a timeout. Rejects on
 * load failure or timeout — callers surface that as an error (never a
 * silent pass), except when no dimension rule applies (then don't call it).
 */
export function probeImageDimensions(
  url: string,
  timeoutMs = 5000,
): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`Could not inspect ${url} dimensions (timed out)`));
      }
    }, timeoutMs);
    const img = new Image();
    img.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
    };
    img.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Could not inspect ${url} dimensions`));
    };
    img.src = url;
  });
}

/** Checks decoded dimensions against min/max rules, returning an error or null. */
export function checkUrlDimensions(
  url: string,
  dims: { w: number; h: number },
  rule: UrlDimensionRule,
): string | null {
  if (typeof rule.minWidth === 'number' && dims.w < rule.minWidth)
    return `${url} width < ${rule.minWidth}px`;
  if (typeof rule.minHeight === 'number' && dims.h < rule.minHeight)
    return `${url} height < ${rule.minHeight}px`;
  if (typeof rule.maxWidth === 'number' && dims.w > rule.maxWidth)
    return `${url} width > ${rule.maxWidth}px`;
  if (typeof rule.maxHeight === 'number' && dims.h > rule.maxHeight)
    return `${url} height > ${rule.maxHeight}px`;
  return null;
}

/** True when any dimension bound is configured (else skip the Image decode). */
export function hasDimensionRule(rule: UrlDimensionRule): boolean {
  return (
    typeof rule.minWidth === 'number' ||
    typeof rule.minHeight === 'number' ||
    typeof rule.maxWidth === 'number' ||
    typeof rule.maxHeight === 'number'
  );
}

export function rulesFrom(field: FieldSpec) {
  const rules: Record<string, unknown> = {};
  if (field.required) {
    rules.required = `${field.label} is required`;
  }
  if (field.uiType === 'number') {
    if (field.rule?.min != null)
      rules.min = { value: field.rule.min, message: `Min ${field.rule.min}` };
    if (field.rule?.max != null)
      rules.max = { value: field.rule.max, message: `Max ${field.rule.max}` };
  }
  if (field.uiType === 'multiselect' || field.uiType === 'VariantList') {
    rules.validate = (v: unknown) =>
      !field.required || (Array.isArray(v) && v.length > 0) || `${field.label} is required`;
  }
  return rules;
}

export interface ErrorLike {
  message?: string;
  type?: string;
}

/**
 * React Hook Form stores errors as a NESTED tree (`errors.a.b.c.message`),
 * while fields registered under dynamic paths (e.g. `variants.colorMeta.Red.images`)
 * only know their dotted path. Resolve the path segment by segment.
 */
export function getPathError(errors: unknown, path: string): ErrorLike | undefined {
  if (!errors || typeof errors !== 'object') return undefined;
  const resolved = path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, errors);
  if (resolved && typeof resolved === 'object' && 'message' in (resolved as ErrorLike)) {
    return resolved as ErrorLike;
  }
  return undefined;
}
