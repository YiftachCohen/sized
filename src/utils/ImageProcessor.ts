import JSZip from "jszip";
import type {
  ProcessedImage,
  ProcessingOptions,
  ProgressCallback,
  ScreenshotSize,
} from "../types";

/**
 * Current master screenshot sizes accepted by App Store Connect. Apple scales
 * these down for smaller display classes, so one iPhone and one iPad output is
 * enough for apps that support both platforms.
 */
export const SCREENSHOT_SIZES: ScreenshotSize[] = [
  {
    displayName: '6.9" iPhone',
    height: 2868,
    name: "iphone_6_9",
    platform: "iPhone",
    width: 1320,
  },
  {
    displayName: '13" iPad',
    height: 2752,
    name: "ipad_13",
    platform: "iPad",
    width: 2064,
  },
];

export const MAX_FILE_SIZE = 20 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;
export const ACCEPTED_IMAGE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};
export const ALLOWED_TYPES = Object.keys(ACCEPTED_IMAGE_TYPES);
const JPEG_QUALITY = 0.96;

export class ImageProcessorError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ImageProcessorError";
  }
}

export function validateFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ImageProcessorError("Please upload a PNG, JPEG, or WebP image");
  }
  if (file.size === 0) {
    throw new ImageProcessorError("Image is empty. Please choose another file");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new ImageProcessorError(
      "Image too large. Please use an image under 20MB"
    );
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("Processing cancelled", "AbortError");
  }
}

function loadImage(
  file: File,
  signal?: AbortSignal
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    throwIfAborted(signal);

    const image = new Image();
    const url = URL.createObjectURL(file);

    const cleanUp = () => {
      URL.revokeObjectURL(url);
      signal?.removeEventListener("abort", handleAbort);
    };
    const handleAbort = () => {
      cleanUp();
      image.src = "";
      reject(new DOMException("Processing cancelled", "AbortError"));
    };

    image.onload = () => {
      cleanUp();
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;

      if (width <= 0 || height <= 0) {
        reject(new ImageProcessorError("Failed to read image dimensions"));
        return;
      }
      if (width * height > MAX_IMAGE_PIXELS) {
        reject(
          new ImageProcessorError(
            "Image dimensions are too large. Please use an image under 40 megapixels"
          )
        );
        return;
      }
      resolve(image);
    };
    image.onerror = () => {
      cleanUp();
      reject(new ImageProcessorError("Failed to load image"));
    };
    signal?.addEventListener("abort", handleAbort, { once: true });
    image.src = url;
  });
}

function orientSize(
  size: ScreenshotSize,
  isLandscape: boolean
): ScreenshotSize {
  if (!isLandscape) {
    return size;
  }
  return { ...size, height: size.width, width: size.height };
}

function encodeJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new ImageProcessorError("Browser failed to encode the image"));
        }
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

function resizeImage(
  image: HTMLImageElement,
  targetSize: ScreenshotSize,
  options: ProcessingOptions
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = targetSize.width;
  canvas.height = targetSize.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new ImageProcessorError("Failed to create canvas context");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  // JPEG has no alpha channel, which App Store Connect requires. Preserve
  // backwards compatibility if a caller still passes the old transparent value.
  context.fillStyle =
    options.backgroundColor === "transparent"
      ? "#ffffff"
      : options.backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  const imageAspect = imageWidth / imageHeight;
  const canvasAspect = canvas.width / canvas.height;
  const shouldFitWidth =
    options.fitMode === "contain"
      ? imageAspect > canvasAspect
      : imageAspect < canvasAspect;
  const drawWidth = shouldFitWidth ? canvas.width : canvas.height * imageAspect;
  const drawHeight = shouldFitWidth
    ? canvas.width / imageAspect
    : canvas.height;
  const drawX = (canvas.width - drawWidth) / 2;
  const drawY = (canvas.height - drawHeight) / 2;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  return encodeJpeg(canvas);
}

export async function processImage(
  file: File,
  options: ProcessingOptions,
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<ProcessedImage[]> {
  validateFile(file);
  throwIfAborted(signal);

  const image = await loadImage(file, signal);
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  const isLandscape = imageWidth > imageHeight;
  const results: ProcessedImage[] = [];

  for (const [index, baseSize] of SCREENSHOT_SIZES.entries()) {
    throwIfAborted(signal);
    const size = orientSize(baseSize, isLandscape);

    try {
      // biome-ignore lint/performance/noAwaitInLoops: sequential encoding bounds peak canvas memory
      const blob = await resizeImage(image, size, options);
      throwIfAborted(signal);
      results.push({
        blob,
        filename: `sized_${size.name}_${size.width}x${size.height}.jpg`,
        size,
      });
      onProgress?.(Math.round(((index + 1) / SCREENSHOT_SIZES.length) * 100));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      throw new ImageProcessorError(
        `Failed to process image for ${size.displayName}`,
        { cause: error }
      );
    }
  }

  return results;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSingleImage(image: ProcessedImage): void {
  triggerDownload(image.blob, image.filename);
}

export async function downloadAllAsZip(
  images: ProcessedImage[]
): Promise<void> {
  if (images.length === 0) {
    throw new ImageProcessorError("There are no screenshots to download");
  }

  try {
    const zip = new JSZip();
    for (const image of images) {
      zip.file(image.filename, image.blob);
    }
    const content = await zip.generateAsync({ type: "blob" });
    triggerDownload(content, "sized_app_store_screenshots.zip");
  } catch (error) {
    if (error instanceof ImageProcessorError) {
      throw error;
    }
    throw new ImageProcessorError(
      "Failed to create download. Please try again",
      { cause: error }
    );
  }
}
