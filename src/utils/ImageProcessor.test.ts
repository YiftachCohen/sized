import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  downloadAllAsZip,
  ImageProcessorError,
  MAX_FILE_SIZE,
  MAX_IMAGE_PIXELS,
  processImage,
  SCREENSHOT_SIZES,
  validateFile,
} from "./ImageProcessor";

function createMockCanvasContext() {
  return {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "",
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high" as ImageSmoothingQuality,
  };
}

let mockCtx: ReturnType<typeof createMockCanvasContext>;
let canvases: HTMLCanvasElement[];
const originalCreateElement = document.createElement.bind(document);
const OUTPUT_FILENAME_PATTERN = /^sized_[\w_]+_\d+x\d+\.jpg$/;

beforeEach(() => {
  vi.restoreAllMocks();
  mockCtx = createMockCanvasContext();
  canvases = [];

  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "canvas") {
      const canvas = {
        getContext: vi.fn(() => mockCtx),
        height: 0,
        toBlob: vi.fn((callback: BlobCallback, type?: string) => {
          callback(new Blob(["jpeg"], { type: type ?? "image/jpeg" }));
        }),
        width: 0,
      } as unknown as HTMLCanvasElement;
      canvases.push(canvas);
      return canvas;
    }
    return originalCreateElement(tag);
  });

  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:mock-url"),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function createMockFile(name: string, type: string, sizeBytes = 1024): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

function mockImageLoad(width = 1000, height = 2000) {
  vi.stubGlobal(
    "Image",
    class MockImage {
      width = width;
      height = height;
      naturalWidth = width;
      naturalHeight = height;
      src = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor() {
        setTimeout(() => this.onload?.(), 0);
      }
    }
  );
}

function mockImageError() {
  vi.stubGlobal(
    "Image",
    class MockImage {
      src = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor() {
        setTimeout(() => this.onerror?.(), 0);
      }
    }
  );
}

describe("SCREENSHOT_SIZES", () => {
  it("contains the current iPhone and iPad master sizes", () => {
    expect(SCREENSHOT_SIZES).toEqual([
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
    ]);
  });
});

describe("validateFile", () => {
  it.each(["image/png", "image/jpeg", "image/webp"])(
    "accepts %s input",
    (type) => {
      expect(() => validateFile(createMockFile("image", type))).not.toThrow();
    }
  );

  it("rejects unsupported input", () => {
    expect(() =>
      validateFile(createMockFile("test.svg", "image/svg+xml"))
    ).toThrow("Please upload a PNG, JPEG, or WebP image");
  });

  it("rejects files over the byte limit", () => {
    expect(() =>
      validateFile(createMockFile("large.png", "image/png", MAX_FILE_SIZE + 1))
    ).toThrow("Image too large");
  });

  it("rejects empty files", () => {
    expect(() =>
      validateFile(createMockFile("empty.png", "image/png", 0))
    ).toThrow("Image is empty");
  });
});

describe("processImage", () => {
  it("exports one submission-safe JPEG per master size", async () => {
    mockImageLoad();
    const results = await processImage(
      createMockFile("screen.png", "image/png"),
      {
        backgroundColor: "#ffffff",
        fitMode: "contain",
      }
    );

    expect(results).toHaveLength(2);
    for (const result of results) {
      expect(result.blob.type).toBe("image/jpeg");
      expect(result.filename).toMatch(OUTPUT_FILENAME_PATTERN);
      expect(result).not.toHaveProperty("dataUrl");
    }
    expect(canvases[0].toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      "image/jpeg",
      0.96
    );
  });

  it("reports progress for each master size", async () => {
    mockImageLoad();
    const onProgress = vi.fn();

    await processImage(
      createMockFile("screen.png", "image/png"),
      { backgroundColor: "#ffffff", fitMode: "contain" },
      onProgress
    );

    expect(onProgress.mock.calls).toEqual([[50], [100]]);
  });

  it("keeps portrait output for portrait input", async () => {
    mockImageLoad(1000, 2000);
    await processImage(createMockFile("portrait.png", "image/png"), {
      backgroundColor: "#ffffff",
      fitMode: "contain",
    });

    expect(canvases.map(({ width, height }) => [width, height])).toEqual([
      [1320, 2868],
      [2064, 2752],
    ]);
  });

  it("rotates target dimensions for landscape input", async () => {
    mockImageLoad(2000, 1000);
    const results = await processImage(
      createMockFile("landscape.png", "image/png"),
      {
        backgroundColor: "#ffffff",
        fitMode: "cover",
      }
    );

    expect(canvases.map(({ width, height }) => [width, height])).toEqual([
      [2868, 1320],
      [2752, 2064],
    ]);
    expect(results.map(({ size }) => [size.width, size.height])).toEqual([
      [2868, 1320],
      [2752, 2064],
    ]);
  });

  it("always paints an opaque background for JPEG output", async () => {
    mockImageLoad();
    await processImage(createMockFile("screen.png", "image/png"), {
      backgroundColor: "transparent",
      fitMode: "contain",
    });

    expect(mockCtx.fillStyle).toBe("#ffffff");
    expect(mockCtx.fillRect).toHaveBeenCalled();
  });

  it("rejects decoded images that exceed the pixel limit", async () => {
    mockImageLoad(MAX_IMAGE_PIXELS + 1, 1);

    await expect(
      processImage(createMockFile("huge.png", "image/png"), {
        backgroundColor: "#ffffff",
        fitMode: "contain",
      })
    ).rejects.toThrow("Image dimensions are too large");
  });

  it("reports a corrupt image cleanly", async () => {
    mockImageError();

    await expect(
      processImage(createMockFile("broken.png", "image/png"), {
        backgroundColor: "#ffffff",
        fitMode: "contain",
      })
    ).rejects.toThrow("Failed to load image");
  });

  it("can be cancelled before expensive work begins", async () => {
    mockImageLoad();
    const controller = new AbortController();
    controller.abort();

    await expect(
      processImage(
        createMockFile("screen.png", "image/png"),
        { backgroundColor: "#ffffff", fitMode: "contain" },
        undefined,
        controller.signal
      )
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(canvases).toHaveLength(0);
  });

  it("surfaces browser encoding failures", async () => {
    mockImageLoad();
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        return {
          getContext: vi.fn(() => mockCtx),
          height: 0,
          toBlob: vi.fn((callback: BlobCallback) => callback(null)),
          width: 0,
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tag);
    });

    await expect(
      processImage(createMockFile("screen.png", "image/png"), {
        backgroundColor: "#ffffff",
        fitMode: "contain",
      })
    ).rejects.toThrow('Failed to process image for 6.9" iPhone');
  });
});

describe("downloadAllAsZip", () => {
  it("rejects an empty download", async () => {
    await expect(downloadAllAsZip([])).rejects.toBeInstanceOf(
      ImageProcessorError
    );
  });
});
