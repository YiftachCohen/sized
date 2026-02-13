import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ImageProcessorError,
  processImage,
  SCREENSHOT_SIZES,
  validateFile,
} from "./ImageProcessor";

// --- Canvas mocking ---

function createMockCanvasContext(): Record<string, unknown> {
  return {
    fillStyle: "",
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(4 * w * h),
      width: w,
      height: h,
    })),
    putImageData: vi.fn(),
  };
}

let mockCtx: Record<string, unknown>;
const originalCreateElement = document.createElement.bind(document);

beforeEach(() => {
  mockCtx = createMockCanvasContext();

  // Mock canvas getContext
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "canvas") {
      return {
        width: 0,
        height: 0,
        getContext: vi.fn(() => mockCtx),
        toDataURL: vi.fn(
          () =>
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        ),
      } as unknown as HTMLCanvasElement;
    }
    return originalCreateElement(tag);
  });

  // Mock URL.createObjectURL / revokeObjectURL
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:mock-url"),
    revokeObjectURL: vi.fn(),
  });
});

// Helper to create a mock File
function createMockFile(name: string, type: string, sizeBytes = 1024): File {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
}

// Helper to mock Image loading
function mockImageLoad(width = 800, height = 600) {
  vi.stubGlobal(
    "Image",
    class MockImage {
      width = width;
      height = height;
      src = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor() {
        // Trigger onload asynchronously
        setTimeout(() => this.onload?.(), 0);
      }
    }
  );
}

// --- Regex patterns (top-level for biome perf lint) ---

const FILENAME_PATTERN = /^screenshot_[\w.]+_\d+x\d+\.png$/;
const DATA_URL_PATTERN = /^data:image\/png;base64,/;

// --- Tests ---

describe("SCREENSHOT_SIZES", () => {
  it("contains exactly 4 device sizes", () => {
    expect(SCREENSHOT_SIZES).toHaveLength(4);
  });

  it("each size has required properties", () => {
    for (const size of SCREENSHOT_SIZES) {
      expect(size).toHaveProperty("name");
      expect(size).toHaveProperty("width");
      expect(size).toHaveProperty("height");
      expect(size).toHaveProperty("displayName");
      expect(size.width).toBeGreaterThan(0);
      expect(size.height).toBeGreaterThan(0);
    }
  });

  it("includes correct App Store resolutions", () => {
    const resolutions = SCREENSHOT_SIZES.map((s) => [s.width, s.height]);
    expect(resolutions).toContainEqual([1320, 2868]); // 6.9"
    expect(resolutions).toContainEqual([1284, 2778]); // 6.5"
    expect(resolutions).toContainEqual([1242, 2208]); // 5.5"
    expect(resolutions).toContainEqual([2048, 2732]); // 12.9" iPad
  });

  it("all sizes are portrait orientation", () => {
    for (const size of SCREENSHOT_SIZES) {
      expect(size.height).toBeGreaterThan(size.width);
    }
  });
});

describe("validateFile", () => {
  it("accepts PNG files", () => {
    const file = createMockFile("test.png", "image/png");
    expect(() => validateFile(file)).not.toThrow();
  });

  it("accepts JPEG files", () => {
    const file = createMockFile("test.jpg", "image/jpeg");
    expect(() => validateFile(file)).not.toThrow();
  });

  it("accepts WebP files", () => {
    const file = createMockFile("test.webp", "image/webp");
    expect(() => validateFile(file)).not.toThrow();
  });

  it("rejects GIF files", () => {
    const file = createMockFile("test.gif", "image/gif");
    expect(() => validateFile(file)).toThrow(ImageProcessorError);
    expect(() => validateFile(file)).toThrow(
      "Please upload a PNG, JPEG, or WebP image"
    );
  });

  it("rejects SVG files", () => {
    const file = createMockFile("test.svg", "image/svg+xml");
    expect(() => validateFile(file)).toThrow(ImageProcessorError);
  });

  it("rejects non-image files", () => {
    const file = createMockFile("test.pdf", "application/pdf");
    expect(() => validateFile(file)).toThrow(ImageProcessorError);
  });

  it("rejects files exceeding 20MB", () => {
    const file = createMockFile("large.png", "image/png", 20 * 1024 * 1024 + 1);
    expect(() => validateFile(file)).toThrow(ImageProcessorError);
    expect(() => validateFile(file)).toThrow("Image too large");
  });

  it("accepts files exactly at 20MB", () => {
    const file = createMockFile("exact.png", "image/png", 20 * 1024 * 1024);
    expect(() => validateFile(file)).not.toThrow();
  });

  it("accepts small files", () => {
    const file = createMockFile("tiny.png", "image/png", 100);
    expect(() => validateFile(file)).not.toThrow();
  });
});

describe("ImageProcessorError", () => {
  it("has correct name", () => {
    const error = new ImageProcessorError("test message");
    expect(error.name).toBe("ImageProcessorError");
  });

  it("has correct message", () => {
    const error = new ImageProcessorError("test message");
    expect(error.message).toBe("test message");
  });

  it("is an instance of Error", () => {
    const error = new ImageProcessorError("test");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("processImage", () => {
  it("rejects invalid file type before processing", async () => {
    const file = createMockFile("test.gif", "image/gif");
    await expect(
      processImage(file, { fitMode: "contain", backgroundColor: "#ffffff" })
    ).rejects.toThrow("Please upload a PNG, JPEG, or WebP image");
  });

  it("rejects oversized file before processing", async () => {
    const file = createMockFile("big.png", "image/png", 21 * 1024 * 1024);
    await expect(
      processImage(file, { fitMode: "contain", backgroundColor: "#ffffff" })
    ).rejects.toThrow("Image too large");
  });

  it("returns 4 processed images (one per screenshot size)", async () => {
    mockImageLoad(1000, 1500);
    const file = createMockFile("test.png", "image/png");
    const results = await processImage(file, {
      fitMode: "contain",
      backgroundColor: "#ffffff",
    });

    expect(results).toHaveLength(4);
  });

  it("each result has correct filename format", async () => {
    mockImageLoad(1000, 1500);
    const file = createMockFile("test.png", "image/png");
    const results = await processImage(file, {
      fitMode: "contain",
      backgroundColor: "#ffffff",
    });

    for (const result of results) {
      expect(result.filename).toMatch(FILENAME_PATTERN);
    }
  });

  it("each result contains required fields", async () => {
    mockImageLoad(1000, 1500);
    const file = createMockFile("test.png", "image/png");
    const results = await processImage(file, {
      fitMode: "contain",
      backgroundColor: "#ffffff",
    });

    for (const result of results) {
      expect(result).toHaveProperty("blob");
      expect(result).toHaveProperty("dataUrl");
      expect(result).toHaveProperty("filename");
      expect(result).toHaveProperty("size");
      expect(result.dataUrl).toMatch(DATA_URL_PATTERN);
    }
  });

  it("calls progress callback with correct percentages", async () => {
    mockImageLoad(1000, 1500);
    const file = createMockFile("test.png", "image/png");
    const onProgress = vi.fn();

    await processImage(
      file,
      { fitMode: "contain", backgroundColor: "#ffffff" },
      onProgress
    );

    expect(onProgress).toHaveBeenCalledTimes(4);
    expect(onProgress).toHaveBeenNthCalledWith(1, 25);
    expect(onProgress).toHaveBeenNthCalledWith(2, 50);
    expect(onProgress).toHaveBeenNthCalledWith(3, 75);
    expect(onProgress).toHaveBeenNthCalledWith(4, 100);
  });

  it("works without progress callback", async () => {
    mockImageLoad(1000, 1500);
    const file = createMockFile("test.png", "image/png");
    const results = await processImage(file, {
      fitMode: "contain",
      backgroundColor: "#ffffff",
    });

    expect(results).toHaveLength(4);
  });

  it("uses contain fit mode - fills background and draws image", async () => {
    mockImageLoad(800, 600); // landscape image
    const file = createMockFile("test.png", "image/png");

    await processImage(file, {
      fitMode: "contain",
      backgroundColor: "#ff0000",
    });

    // Background should be filled with the specified color
    expect(mockCtx.fillRect).toHaveBeenCalled();
    expect(mockCtx.fillStyle).toBe("#ff0000");
    expect(mockCtx.drawImage).toHaveBeenCalled();
  });

  it("uses transparent background - calls clearRect instead of fillRect", async () => {
    mockImageLoad(800, 600);
    const file = createMockFile("test.png", "image/png");

    await processImage(file, {
      fitMode: "contain",
      backgroundColor: "transparent",
    });

    expect(mockCtx.clearRect).toHaveBeenCalled();
  });

  it("uses cover fit mode - draws image", async () => {
    mockImageLoad(800, 600);
    const file = createMockFile("test.png", "image/png");

    await processImage(file, {
      fitMode: "cover",
      backgroundColor: "#ffffff",
    });

    expect(mockCtx.drawImage).toHaveBeenCalled();
  });

  it("applies sharpening filter during processing", async () => {
    mockImageLoad(800, 600);
    const file = createMockFile("test.png", "image/png");

    await processImage(file, {
      fitMode: "contain",
      backgroundColor: "#ffffff",
    });

    // Sharpening reads pixel data and writes it back
    expect(mockCtx.getImageData).toHaveBeenCalled();
    expect(mockCtx.putImageData).toHaveBeenCalled();
  });

  it("result sizes match SCREENSHOT_SIZES", async () => {
    mockImageLoad(1000, 1500);
    const file = createMockFile("test.png", "image/png");
    const results = await processImage(file, {
      fitMode: "contain",
      backgroundColor: "#ffffff",
    });

    const resultSizeNames = results.map((r) => r.size.name);
    const expectedNames = SCREENSHOT_SIZES.map((s) => s.name);
    expect(resultSizeNames).toEqual(expectedNames);
  });
});
