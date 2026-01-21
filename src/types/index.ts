export interface ScreenshotSize {
  name: string;
  width: number;
  height: number;
  displayName: string;
}

export interface ProcessedImage {
  blob: Blob;
  dataUrl: string;
  filename: string;
  size: ScreenshotSize;
}

export type FitMode = 'contain' | 'cover';

export interface ProcessingOptions {
  fitMode: FitMode;
  backgroundColor: string;
}

export type ProgressCallback = (percent: number) => void;
