import { axiosClient } from '@/lib/axios/axios-client';

export interface NaturalDimensions {
  width: number;
  height: number;
}

export interface OffsetPosition {
  x: number;
  y: number;
}

export interface CropTarget {
  id?: string;
  key?: string;
  url: string;
  name: string;
  file?: File;
  folderId?: string | null;
}

export interface ResolvedCropSource {
  blobUrl: string;
  cleanup: () => void;
  naturalWidth: number;
  naturalHeight: number;
}

/**
 * Converts any image source (file, local blob, remote URL) into a local same-origin Blob
 * to guarantee that canvas operations are never tainted by cross-origin restrictions.
 *
 * Fails closed: when neither the authenticated proxy nor a direct CORS fetch
 * yields bytes, this THROWS. A last-resort bare `fetch(url)` would hand the
 * canvas a cross-origin source, which taints every `getImageData`/`toBlob`
 * call downstream — an unresolvable source is an error, not a fallback.
 * (TODO: the MediaCropDialog call site must surface this rejection; it is not
 * in this file's ownership.)
 */
export async function fetchImageAsBlob(target: CropTarget): Promise<Blob> {
  if (target.file) {
    return target.file;
  }

  const url = target.url;
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    const res = await fetch(url);
    return await res.blob();
  }

  // 1. Try authenticated backend proxy (same-origin /api/v1/media/proxy)
  try {
    const res = await axiosClient.get<Blob>('/media/proxy', {
      params: { url },
      responseType: 'blob',
    });
    if (res.data && res.data.size > 0) {
      return res.data;
    }
  } catch {
    // Continue to direct fallback
  }

  // 2. Try direct fetch
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) return blob;
    }
  } catch {
    // Continue to the fail-closed error below
  }

  throw new Error(
    `Could not load "${target.name || url}" for cropping — the image is unreachable.`,
  );
}

/**
 * Resolves a crop target into a local same-origin blob URL and its natural
 * dimensions. Rejects (rather than degrading to the raw remote URL) when the
 * source cannot be resolved, so a tainted canvas is impossible; the blob URL
 * is revoked on every failure path.
 */
export async function resolveCleanCropSource(target: CropTarget): Promise<ResolvedCropSource> {
  const blob = await fetchImageAsBlob(target);
  const blobUrl = URL.createObjectURL(blob);
  try {
    const dims = await loadImageDims(blobUrl);
    return {
      blobUrl,
      cleanup: () => URL.revokeObjectURL(blobUrl),
      naturalWidth: dims.width,
      naturalHeight: dims.height,
    };
  } catch (error) {
    URL.revokeObjectURL(blobUrl);
    throw error;
  }
}

function loadImageDims(src: string): Promise<NaturalDimensions> {
  return new Promise((resolve) => {
    if (!src) {
      resolve({ width: 1200, height: 1600 });
      return;
    }
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || 1200,
        height: img.naturalHeight || 1600,
      });
    };
    img.onerror = () => resolve({ width: 1200, height: 1600 });
    img.src = src;
  });
}

/**
 * Clamps the crop output width to [1200, 2400] and derives the height from
 * the target aspect ratio. Pure sizing helper.
 */
export function computeCropOutputSize(
  effectiveNaturalWidth: number,
  targetAspectRatio: number,
): { width: number; height: number } {
  const width = Math.max(1200, Math.min(effectiveNaturalWidth, 2400));
  return { width, height: Math.round(width / targetAspectRatio) };
}

/**
 * Derives the cropped WebP file name: trimmed edited name (max 40 chars),
 * falling back to the extension-stripped default name. Always `.webp`.
 */
export function buildCroppedFileName(editedName: string, defaultFileName?: string): string {
  const fallbackBase = defaultFileName ? defaultFileName.replace(/\.[^/.]+$/, '') : 'image';
  const safeBase = editedName.trim().slice(0, 40) || fallbackBase.slice(0, 40);
  return `${safeBase}.webp`;
}

export async function processCanvasCrop(params: {
  imgSrc: string;
  container: HTMLDivElement;
  img: HTMLImageElement;
  naturalDims: NaturalDimensions;
  targetAspectRatio: number;
  editedName: string;
  defaultFileName?: string;
}): Promise<File> {
  const { imgSrc, container, img, naturalDims, targetAspectRatio, editedName, defaultFileName } =
    params;

  const containerRect = container.getBoundingClientRect();
  const imgRect = img.getBoundingClientRect();

  const effectiveNaturalWidth = naturalDims.width || img.naturalWidth || 1200;
  const effectiveNaturalHeight = naturalDims.height || img.naturalHeight || 1600;

  const { width: outputWidth, height: outputHeight } = computeCropOutputSize(
    effectiveNaturalWidth,
    targetAspectRatio,
  );

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  const scaleX = effectiveNaturalWidth / (imgRect.width || 1);
  const scaleY = effectiveNaturalHeight / (imgRect.height || 1);

  const sourceX = (containerRect.left - imgRect.left) * scaleX;
  const sourceY = (containerRect.top - imgRect.top) * scaleY;
  const sourceWidth = containerRect.width * scaleX;
  const sourceHeight = containerRect.height * scaleY;

  // Obtain a guaranteed local same-origin Blob
  let blobSource: Blob;
  if (imgSrc.startsWith('blob:') || imgSrc.startsWith('data:')) {
    const res = await fetch(imgSrc);
    blobSource = await res.blob();
  } else {
    blobSource = await fetchImageAsBlob({ url: imgSrc, name: defaultFileName || 'image' });
  }

  const localBlobUrl = URL.createObjectURL(blobSource);

  try {
    const imageElement = new Image();
    await new Promise<void>((resolve, reject) => {
      imageElement.onload = () => resolve();
      imageElement.onerror = () => reject(new Error('Failed to load image element on canvas'));
      imageElement.src = localBlobUrl;
    });

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      imageElement,
      Math.max(0, sourceX),
      Math.max(0, sourceY),
      Math.min(effectiveNaturalWidth, sourceWidth),
      Math.min(effectiveNaturalHeight, sourceHeight),
      0,
      0,
      outputWidth,
      outputHeight,
    );

    const croppedBlob = await new Promise<Blob | null>((resolve) => {
      // WONTFIX: crop output format/quality is a product + infra decision
      // (WebP q0.9 here, WebP q0.82 in encodeToWebP — two different outputs
      // for the same pixel data). Do not "align" or tune either value here
      // without that decision; the fix would need one shared encoder with a
      // signed-off quality budget.
      canvas.toBlob((b) => resolve(b), 'image/webp', 0.9);
    });

    if (!croppedBlob) {
      throw new Error('Failed to generate cropped WebP blob');
    }

    const croppedFileName = buildCroppedFileName(editedName, defaultFileName);
    return new File([croppedBlob], croppedFileName, { type: 'image/webp' });
  } finally {
    URL.revokeObjectURL(localBlobUrl);
  }
}
