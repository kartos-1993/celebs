import {
  ConfirmUploadInput,
  MediaAsset,
  PresignFileInput,
  PresignFileResponse,
} from '@celebs/shared-types';

import { axiosClient } from './axios/axios-client';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface ApiErrorBody {
  message?: string;
  errors?: Array<{ field?: string; message?: string }>;
}

/**
 * Aggregate upload failure carrying one error per file, in input order.
 * (The app tsconfig targets ES2020, where the built-in `AggregateError` type
 * is unavailable, so the shape is declared explicitly: `message` joins every
 * per-file message, `errors` keeps them individually addressable.)
 */
export class UploadAggregateError extends Error {
  readonly errors: Error[];

  constructor(errors: Error[]) {
    super(errors.map((error) => error.message).join('. '));
    this.name = 'UploadAggregateError';
    this.errors = errors;
  }
}

/** Narrows an unknown throw into a per-file list of errors. */
export function aggregateErrors(value: unknown): Error[] {
  if (value instanceof UploadAggregateError && Array.isArray(value.errors)) return value.errors;
  return [];
}

/**
 * Pulls a human-readable message out of an axios/API error:
 * prefers the server's field validation message, then its message,
 * then the JS error, then the caller's fallback.
 */
export function extractApiErrorMessage(error: unknown, fallback: string): string {
  const candidate = error as
    | { response?: { data?: ApiErrorBody }; data?: ApiErrorBody }
    | undefined;
  const body = candidate?.response?.data ?? candidate?.data;

  if (Array.isArray(body?.errors)) {
    const parts = body.errors
      .map((entry) => entry?.message)
      .filter((msg): msg is string => Boolean(msg));
    if (parts.length > 0) return parts.join('. ');
  }
  if (body?.message && body.message !== 'Validation failed') return body.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * Encodes an image File to WebP in the browser (Daraz/Shein-style).
 * PDF files are preserved; failures fall back to the original file.
 */
export async function encodeToWebP(
  file: File,
): Promise<{ file: File; mimeType: string; originalName: string }> {
  if (file.type === 'application/pdf') {
    return { file, mimeType: file.type, originalName: file.name };
  }
  if (!file.type.startsWith('image/')) {
    return { file, mimeType: (file.type || 'image/jpeg') as string, originalName: file.name };
  }
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const webpBlob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.82),
    );
    if (!webpBlob) throw new Error('canvas.toBlob returned null');
    const webpName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
    const webpFile = new File([webpBlob], webpName, { type: 'image/webp' });
    return { file: webpFile, mimeType: 'image/webp', originalName: webpName };
  } catch {
    return { file, mimeType: (file.type || 'image/jpeg') as string, originalName: file.name };
  }
}

/**
 * Uploads a single file directly to Cloudflare R2 via a presigned PUT URL,
 * then confirms the upload with the backend to enqueue optimization.
 * Images are browser-encoded to WebP before presign (zero API impact).
 */
export async function directUploadFile(
  file: File,
  folder = 'celebs/products',
  scope: ConfirmUploadInput['scope'] = 'PRODUCT',
  existingKey?: string,
): Promise<string> {
  const encoded = await encodeToWebP(file);
  const uploadFile = encoded.file;
  const mimeType = encoded.mimeType as PresignFileInput['mimeType'];
  const originalName = encoded.originalName;

  // 1. Get presigned PUT URL (scope-aware, WebP-encoded)
  let presignData: PresignFileResponse | undefined;
  try {
    const presignRes = await axiosClient.post<ApiResponse<PresignFileResponse>>('/media/presign', {
      key: existingKey,
      originalname: originalName,
      mimeType,
      size: uploadFile.size,
      folder,
      scope,
    });
    presignData = presignRes.data?.data;
  } catch (error) {
    throw new Error(
      `"${file.name}" was rejected — ${extractApiErrorMessage(error, 'could not be queued for upload')}`,
    );
  }

  if (!presignData?.uploadUrl) {
    throw new Error(`"${file.name}" could not be queued for upload`);
  }

  // 2. Direct binary upload to Cloudflare R2
  const putRes = await fetch(presignData.uploadUrl, {
    method: 'PUT',
    body: uploadFile,
    headers: {
      'Content-Type': mimeType,
    },
  });

  if (!putRes.ok) {
    throw new Error(`"${file.name}" failed to transfer (status ${putRes.status})`);
  }

  // 3. Confirm upload with backend
  const confirmPayload: ConfirmUploadInput = {
    key: presignData.key,
    originalname: originalName,
    mimeType,
    size: uploadFile.size,
    scope,
  };

  try {
    const confirmRes = await axiosClient.post<ApiResponse<MediaAsset>>(
      '/media/confirm',
      confirmPayload,
    );
    return confirmRes.data?.data?.url || presignData.publicUrl;
  } catch (error) {
    throw new Error(
      `"${file.name}" uploaded but registration failed — ${extractApiErrorMessage(error, 'try again')}`,
    );
  }
}

/**
 * Backend caps batch presign requests at 12 files — stay under it and
 * process chunks sequentially to keep server load predictable.
 */
export const PRESIGN_BATCH_SIZE = 10;

/**
 * Per-file upload result. Exactly one of `url` / `error` is set, and `file`
 * keeps the ORIGINAL File instance so a failure can always be attributed to
 * the file the user actually picked.
 */
export interface UploadOutcome {
  file: File;
  url?: string;
  error?: Error;
}

function namedError(file: File, message: string): Error {
  return new Error(`"${file.name}" ${message}`);
}

function toError(value: unknown, file: File, fallback: string): Error {
  return value instanceof Error ? value : namedError(file, fallback);
}

/**
 * Splits a file list into sequential <=batchSize chunks.
 * Pure slicing helper; the caller still uploads chunks one at a time.
 */
export function splitIntoBatches<T>(items: T[], batchSize: number = PRESIGN_BATCH_SIZE): T[][] {
  const batches: T[][] = [];
  for (let start = 0; start < items.length; start += batchSize) {
    batches.push(items.slice(start, start + batchSize));
  }
  return batches;
}

/**
 * Uploads one already-encoded file to its presigned URL and confirms it with
 * the backend. Throws with a per-file message; the caller turns that into an
 * outcome so one bad file never discards its neighbours' URLs.
 */
async function uploadEncodedFile(
  source: File,
  encoded: { file: File; mimeType: string; originalName: string },
  item: PresignFileResponse,
  scope: ConfirmUploadInput['scope'],
): Promise<string> {
  const putRes = await fetch(item.uploadUrl, {
    method: 'PUT',
    body: encoded.file,
    headers: {
      'Content-Type': encoded.mimeType,
    },
  });

  if (!putRes.ok) {
    throw namedError(source, `failed to transfer (status ${putRes.status})`);
  }

  try {
    const confirmRes = await axiosClient.post<ApiResponse<MediaAsset>>('/media/confirm', {
      key: item.key,
      originalname: encoded.originalName,
      mimeType: encoded.mimeType as PresignFileInput['mimeType'],
      size: encoded.file.size,
      scope,
    });
    return confirmRes.data?.data?.url || item.publicUrl;
  } catch (error) {
    throw new Error(
      `"${source.name}" uploaded but registration failed — ${extractApiErrorMessage(error, 'try again')}`,
    );
  }
}

/**
 * Uploads a single (<=12 file) chunk and reports one outcome per file.
 * Settle-all semantics: the PUTs run in parallel, but a rejected one resolves
 * to that file's own error instead of aborting the whole chunk, and a chunk
 * that never got presign items attributes the batch error to each of its files.
 */
async function directUploadChunkOutcomes(
  files: File[],
  folder: string,
  scope: ConfirmUploadInput['scope'],
): Promise<UploadOutcome[]> {
  // Browser-encode all images to WebP before presign (parallel)
  const encodedFiles = await Promise.all(files.map((f) => encodeToWebP(f)));

  // 1. Request batch presigned URLs
  let presignItems: PresignFileResponse[];
  try {
    const batchRes = await axiosClient.post<ApiResponse<PresignFileResponse[]>>(
      '/media/batch-presign',
      {
        files: encodedFiles.map(({ file, mimeType, originalName }) => ({
          originalname: originalName,
          mimeType: mimeType as PresignFileInput['mimeType'],
          size: file.size,
          folder,
          scope,
        })),
      },
    );
    presignItems = batchRes.data?.data || [];
  } catch (error) {
    // One batch request covers the whole chunk, so its rejection belongs to
    // every file in it — each still gets its own named outcome.
    const message = extractApiErrorMessage(error, 'The server rejected this upload batch');
    return files.map((file) => ({ file, error: namedError(file, message) }));
  }

  // 2. Parallel upload and confirmation, settled per file
  const targets = encodedFiles.map((encoded, idx) => ({
    source: files[idx],
    encoded,
    item: presignItems[idx],
  }));
  const settled = await Promise.allSettled(
    targets.map(({ source, encoded, item }) =>
      item
        ? uploadEncodedFile(source, encoded, item, scope)
        : Promise.reject(namedError(source, 'was not accepted for upload')),
    ),
  );

  return settled.map((entry, idx) =>
    entry.status === 'fulfilled'
      ? { file: targets[idx].source, url: entry.value }
      : {
          file: targets[idx].source,
          error: toError(entry.reason, targets[idx].source, 'upload failed'),
        },
  );
}

/**
 * Uploads any number of files directly to Cloudflare R2 via presigned PUT
 * URLs, transparently splitting into <=10-file batches, and reports a
 * per-file outcome for every input file in input order. Never rejects for a
 * single file's failure — inspect the outcomes instead.
 */
export async function directUploadFiles(
  files: File[],
  folder = 'celebs/products',
  scope: ConfirmUploadInput['scope'] = 'PRODUCT',
): Promise<UploadOutcome[]> {
  if (!files.length) return [];

  const outcomes: UploadOutcome[] = [];
  for (const chunk of splitIntoBatches(files)) {
    outcomes.push(...(await directUploadChunkOutcomes(chunk, folder, scope)));
  }
  return outcomes;
}

/**
 * Throwing wrapper over `directUploadFiles` (unchanged contract for current
 * callers: an ordered URL list, or a rejection). Failures are aggregated into
 * an `UploadAggregateError` that carries the per-file entries, so the caller
 * can name every file that lost its URL.
 */
export async function directUploadBatch(
  files: File[],
  folder = 'celebs/products',
  scope: ConfirmUploadInput['scope'] = 'PRODUCT',
): Promise<string[]> {
  const outcomes = await directUploadFiles(files, folder, scope);
  const failures = outcomes.filter((outcome) => !outcome.url);
  if (failures.length > 0) {
    const errors = failures.map(
      (outcome) => outcome.error ?? namedError(outcome.file, 'upload failed'),
    );
    throw new UploadAggregateError(errors);
  }
  return outcomes.flatMap((outcome) => (outcome.url ? [outcome.url] : []));
}
