export interface ScreenshotSize {
  displayName: string;
  height: number;
  name: string;
  platform: "iPhone" | "iPad";
  width: number;
}

export interface ProcessedImage {
  blob: Blob;
  filename: string;
  size: ScreenshotSize;
}

export type FitMode = "contain" | "cover";

export interface ProcessingOptions {
  backgroundColor: string;
  fitMode: FitMode;
}

export type ProgressCallback = (percent: number) => void;
