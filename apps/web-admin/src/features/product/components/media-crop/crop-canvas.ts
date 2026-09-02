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
    // Continue to standard fetch
  }

  const fallbackRes = await fetch(url);
  return await fallbackRes.blob();
}

/**
 * Resolves a crop target into a local same-origin blob URL and its natural dimensions.
 */
export async function resolveCleanCropSource(target: CropTarget): Promise<ResolvedCropSource> {
  try {
    const blob = await fetchImageAsBlob(target);
    const blobUrl = URL.createObjectURL(blob);
    const dims = await loadImageDims(blobUrl);
    return {
      blobUrl,
      cleanup: () => URL.revokeObjectURL(blobUrl),
      naturalWidth: dims.width,
      naturalHeight: dims.height,
    };
  } catch {
    const fallbackUrl = target.url || (target.file ? URL.createObjectURL(target.file) : '');
    const dims = await loadImageDims(fallbackUrl);
    return {
      blobUrl: fallbackUrl,
      cleanup: () => {
        if (fallbackUrl.startsWith('blob:') && target.file) URL.revokeObjectURL(fallbackUrl);
      },
      naturalWidth: dims.width,
      naturalHeight: dims.height,
    };
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

  const outputWidth = Math.max(1200, Math.min(effectiveNaturalWidth, 2400));
  const outputHeight = Math.round(outputWidth / targetAspectRatio);

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
      canvas.toBlob((b) => resolve(b), 'image/webp', 0.9);
    });

    if (!croppedBlob) {
      throw new Error('Failed to generate cropped WebP blob');
    }

    const fallbackBase = defaultFileName ? defaultFileName.replace(/\.[^/.]+$/, '') : 'image';
    const safeBase = editedName.trim().slice(0, 40) || fallbackBase.slice(0, 40);
    const croppedFileName = `${safeBase}.webp`;
    return new File([croppedBlob], croppedFileName, { type: 'image/webp' });
  } finally {
    URL.revokeObjectURL(localBlobUrl);
  }
}
