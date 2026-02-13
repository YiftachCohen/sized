import JSZip from "jszip";
import type {
  ProcessedImage,
  ProcessingOptions,
  ProgressCallback,
  ScreenshotSize,
} from "../types";

export const SCREENSHOT_SIZES: ScreenshotSize[] = [
  { name: "6.9inch", width: 1260, height: 2736, displayName: '6.9" Display' },
  { name: "6.5inch", width: 1284, height: 2778, displayName: '6.5" Display' },
  { name: "5.5inch", width: 1242, height: 2208, displayName: '5.5" Display' },
  {
    name: "12.9inch_ipad",
    width: 2048,
    height: 2732,
    displayName: '12.9" iPad',
  },
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export class ImageProcessorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageProcessorError";
  }
}

export function validateFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ImageProcessorError("Please upload a PNG, JPEG, or WebP image");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new ImageProcessorError(
      "Image too large. Please use an image under 20MB"
    );
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
      reject(new ImageProcessorError("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Apply sharpening convolution filter to canvas
 * Uses unsharp mask kernel: [0,-1,0], [-1,5,-1], [0,-1,0]
 */
function applySharpen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity = 0.3
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const copy = new Uint8ClampedArray(data);

  // Sharpening kernel (unsharp mask)
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const kernelSize = 3;
  const half = Math.floor(kernelSize / 2);

  for (let y = half; y < height - half; y++) {
    for (let x = half; x < width - half; x++) {
      let r = 0,
        g = 0,
        b = 0;

      // Apply convolution
      for (let ky = 0; ky < kernelSize; ky++) {
        for (let kx = 0; kx < kernelSize; kx++) {
          const px = x + kx - half;
          const py = y + ky - half;
          const idx = (py * width + px) * 4;
          const weight = kernel[ky * kernelSize + kx];

          r += copy[idx] * weight;
          g += copy[idx + 1] * weight;
          b += copy[idx + 2] * weight;
        }
      }

      const idx = (y * width + x) * 4;

      // Blend original with sharpened based on intensity
      data[idx] = Math.min(
        255,
        Math.max(0, copy[idx] + (r - copy[idx]) * intensity)
      );
      data[idx + 1] = Math.min(
        255,
        Math.max(0, copy[idx + 1] + (g - copy[idx + 1]) * intensity)
      );
      data[idx + 2] = Math.min(
        255,
        Math.max(0, copy[idx + 2] + (b - copy[idx + 2]) * intensity)
      );
      // Alpha channel unchanged
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function resizeImage(
  img: HTMLImageElement,
  targetSize: ScreenshotSize,
  options: ProcessingOptions
): { blob: Blob; dataUrl: string } {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new ImageProcessorError("Failed to create canvas context");
  }

  canvas.width = targetSize.width;
  canvas.height = targetSize.height;

  // Enable high-quality image scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Fill background (transparent if 'transparent', otherwise use the color)
  if (options.backgroundColor === "transparent") {
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

  if (options.fitMode === "contain") {
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

  // Apply subtle sharpening to improve upscaled image quality
  applySharpen(ctx, canvas.width, canvas.height, 0.3);

  const dataUrl = canvas.toDataURL("image/png");

  // Convert dataUrl to Blob
  const byteString = atob(dataUrl.split(",")[1]);
  const mimeString = dataUrl.split(",")[0].split(":")[1].split(";")[0];
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
    } catch {
      throw new ImageProcessorError(
        `Failed to process image for ${size.displayName}`
      );
    }
  }

  return results;
}

export function downloadSingleImage(image: ProcessedImage): void {
  const link = document.createElement("a");
  link.href = image.dataUrl;
  link.download = image.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadAllAsZip(
  images: ProcessedImage[]
): Promise<void> {
  const zip = new JSZip();

  for (const image of images) {
    zip.file(image.filename, image.blob);
  }

  let url: string | undefined;
  try {
    const content = await zip.generateAsync({ type: "blob" });
    url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ios_screenshots.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch {
    throw new ImageProcessorError(
      "Failed to create download. Please try again"
    );
  } finally {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }
}
