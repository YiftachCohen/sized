import JSZip from 'jszip';
import type { ScreenshotSize, ProcessedImage, ProcessingOptions, ProgressCallback } from '../types';

export const SCREENSHOT_SIZES: ScreenshotSize[] = [
  { name: '6.7inch', width: 1290, height: 2796, displayName: '6.7" Display' },
  { name: '6.5inch', width: 1284, height: 2778, displayName: '6.5" Display' },
  { name: '5.5inch', width: 1242, height: 2688, displayName: '5.5" Display' },
  { name: '12.9inch_ipad', width: 2048, height: 2732, displayName: '12.9" iPad' },
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export class ImageProcessorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageProcessorError';
  }
}

export function validateFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ImageProcessorError('Please upload a PNG, JPEG, or WebP image');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new ImageProcessorError('Image too large. Please use an image under 20MB');
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageProcessorError('Failed to load image'));
    };

    img.src = url;
  });
}

function resizeImage(
  img: HTMLImageElement,
  targetSize: ScreenshotSize,
  options: ProcessingOptions
): { blob: Blob; dataUrl: string } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new ImageProcessorError('Failed to create canvas context');
  }

  canvas.width = targetSize.width;
  canvas.height = targetSize.height;

  // Fill background (transparent if 'transparent', otherwise use the color)
  if (options.backgroundColor === 'transparent') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const imgAspect = img.width / img.height;
  const canvasAspect = canvas.width / canvas.height;

  let drawWidth: number;
  let drawHeight: number;
  let drawX: number;
  let drawY: number;

  if (options.fitMode === 'contain') {
    // Fit entire image within canvas, maintaining aspect ratio
    if (imgAspect > canvasAspect) {
      drawWidth = canvas.width;
      drawHeight = canvas.width / imgAspect;
    } else {
      drawHeight = canvas.height;
      drawWidth = canvas.height * imgAspect;
    }
    drawX = (canvas.width - drawWidth) / 2;
    drawY = (canvas.height - drawHeight) / 2;
  } else {
    // Cover: fill canvas, cropping if necessary
    if (imgAspect > canvasAspect) {
      drawHeight = canvas.height;
      drawWidth = canvas.height * imgAspect;
    } else {
      drawWidth = canvas.width;
      drawHeight = canvas.width / imgAspect;
    }
    drawX = (canvas.width - drawWidth) / 2;
    drawY = (canvas.height - drawHeight) / 2;
  }

  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

  const dataUrl = canvas.toDataURL('image/png');

  // Convert dataUrl to Blob
  const byteString = atob(dataUrl.split(',')[1]);
  const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  const blob = new Blob([ab], { type: mimeString });

  return { blob, dataUrl };
}

export async function processImage(
  file: File,
  options: ProcessingOptions,
  onProgress?: ProgressCallback
): Promise<ProcessedImage[]> {
  validateFile(file);

  const img = await loadImage(file);
  const results: ProcessedImage[] = [];

  for (let i = 0; i < SCREENSHOT_SIZES.length; i++) {
    const size = SCREENSHOT_SIZES[i];

    try {
      const { blob, dataUrl } = resizeImage(img, size, options);

      results.push({
        blob,
        dataUrl,
        filename: `screenshot_${size.name}_${size.width}x${size.height}.png`,
        size,
      });

      if (onProgress) {
        onProgress(Math.round(((i + 1) / SCREENSHOT_SIZES.length) * 100));
      }
    } catch (error) {
      throw new ImageProcessorError(`Failed to process image for ${size.displayName}`);
    }
  }

  return results;
}

export function downloadSingleImage(image: ProcessedImage): void {
  const link = document.createElement('a');
  link.href = image.dataUrl;
  link.download = image.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadAllAsZip(images: ProcessedImage[]): Promise<void> {
  const zip = new JSZip();

  for (const image of images) {
    zip.file(image.filename, image.blob);
  }

  try {
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'ios_screenshots.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch {
    throw new ImageProcessorError('Failed to create download. Please try again');
  }
}
