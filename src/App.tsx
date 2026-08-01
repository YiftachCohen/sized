import { useCallback, useEffect, useState } from "react";
import { DropZone } from "./components/DropZone";
import { Header } from "./components/Header";
import { ImagePreview } from "./components/ImagePreview";
import type { FitMode, ProcessedImage } from "./types";
import {
  downloadAllAsZip,
  downloadSingleImage,
  ImageProcessorError,
  processImage,
} from "./utils/ImageProcessor";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function App() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState("");
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [fitMode, setFitMode] = useState<FitMode>("contain");
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const [debouncedBackgroundColor, setDebouncedBackgroundColor] =
    useState(backgroundColor);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedBackgroundColor(backgroundColor);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [backgroundColor]);

  useEffect(() => {
    if (!uploadedFile) {
      return;
    }

    const controller = new AbortController();
    let isCurrentRun = true;
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    processImage(
      uploadedFile,
      { backgroundColor: debouncedBackgroundColor, fitMode },
      (percent) => {
        if (isCurrentRun) {
          setProgress(percent);
        }
      },
      controller.signal
    )
      .then((results) => {
        if (isCurrentRun) {
          setProcessedImages(results);
        }
      })
      .catch((processingError: unknown) => {
        if (!isCurrentRun || isAbortError(processingError)) {
          return;
        }
        setProcessedImages([]);
        setError(
          processingError instanceof ImageProcessorError
            ? processingError.message
            : "An unexpected error occurred. Please try again."
        );
      })
      .finally(() => {
        if (isCurrentRun) {
          setIsProcessing(false);
        }
      });

    return () => {
      isCurrentRun = false;
      controller.abort();
    };
  }, [uploadedFile, fitMode, debouncedBackgroundColor]);

  useEffect(
    () => () => {
      if (originalPreviewUrl) {
        URL.revokeObjectURL(originalPreviewUrl);
      }
    },
    [originalPreviewUrl]
  );

  const handleFileAccepted = useCallback((file: File) => {
    setError(null);
    setUploadedFile(file);
    setOriginalPreviewUrl(URL.createObjectURL(file));
  }, []);

  const handleError = useCallback((message: string) => {
    setError(message);
  }, []);

  const handleClear = useCallback(() => {
    setUploadedFile(null);
    setOriginalPreviewUrl("");
    setProcessedImages([]);
    setIsProcessing(false);
    setProgress(0);
    setError(null);
  }, []);

  const handleDownloadAll = useCallback(async () => {
    setIsDownloading(true);
    setError(null);
    try {
      await downloadAllAsZip(processedImages);
    } catch (downloadError) {
      setError(
        downloadError instanceof ImageProcessorError
          ? downloadError.message
          : "Failed to create download. Please try again."
      );
    } finally {
      setIsDownloading(false);
    }
  }, [processedImages]);

  return (
    <div className="min-h-screen bg-canvas text-charcoal">
      <a
        className="sr-only z-50 rounded bg-charcoal px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
        href="#main"
      >
        Skip to generator
      </a>
      <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
        <Header />

        <main id="main">
          {error ? (
            <div
              className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800"
              role="alert"
            >
              <svg
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 9v4m0 4h.01M10.3 3.8 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
              <p className="text-sm">{error}</p>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel">
            {uploadedFile ? (
              <ImagePreview
                backgroundColor={backgroundColor}
                fitMode={fitMode}
                isDownloading={isDownloading}
                isProcessing={isProcessing}
                onBackgroundColorChange={setBackgroundColor}
                onClear={handleClear}
                onDownloadAll={handleDownloadAll}
                onDownloadSingle={downloadSingleImage}
                onFitModeChange={setFitMode}
                originalFile={uploadedFile}
                originalPreviewUrl={originalPreviewUrl}
                processedImages={processedImages}
                progress={progress}
              />
            ) : (
              <DropZone
                onError={handleError}
                onFileAccepted={handleFileAccepted}
              />
            )}
          </div>
        </main>

        <footer className="mt-8 flex flex-col items-center justify-between gap-4 text-slate-500 text-xs sm:flex-row">
          <p>Images stay on this device. No uploads, tracking, or accounts.</p>
          <div className="flex items-center gap-5">
            <a
              className="transition-colors hover:text-charcoal"
              href="https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/"
              rel="noopener noreferrer"
              target="_blank"
            >
              Apple specifications
            </a>
            <a
              aria-label="View Sized on GitHub"
              className="transition-colors hover:text-charcoal"
              href="https://github.com/YiftachCohen/sized"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
