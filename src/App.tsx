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

function App() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string>("");
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [fitMode, setFitMode] = useState<FitMode>("contain");
  const [backgroundColor, setBackgroundColor] = useState<string>("#FFFFFF");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = useCallback(
    async (file: File, fit: FitMode, bgColor: string) => {
      setIsProcessing(true);
      setProgress(0);
      setError(null);

      try {
        const results = await processImage(
          file,
          { fitMode: fit, backgroundColor: bgColor },
          (percent) => setProgress(percent)
        );
        setProcessedImages(results);
      } catch (err) {
        if (err instanceof ImageProcessorError) {
          setError(err.message);
        } else {
          setError("An unexpected error occurred. Please try again.");
        }
        setProcessedImages([]);
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  // Process image when file is uploaded or options change
  useEffect(() => {
    if (uploadedFile) {
      handleProcess(uploadedFile, fitMode, backgroundColor);
    }
  }, [uploadedFile, fitMode, backgroundColor, handleProcess]);

  const handleFileAccepted = (file: File) => {
    setError(null);
    setUploadedFile(file);
    setOriginalPreviewUrl(URL.createObjectURL(file));
  };

  const handleError = (message: string) => {
    setError(message);
  };

  const handleClear = () => {
    if (originalPreviewUrl) {
      URL.revokeObjectURL(originalPreviewUrl);
    }
    setUploadedFile(null);
    setOriginalPreviewUrl("");
    setProcessedImages([]);
    setProgress(0);
    setError(null);
  };

  const handleDownloadSingle = (image: ProcessedImage) => {
    downloadSingleImage(image);
  };

  const handleDownloadAll = async () => {
    try {
      await downloadAllAsZip(processedImages);
    } catch (err) {
      if (err instanceof ImageProcessorError) {
        setError(err.message);
      } else {
        setError("Failed to create download. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-6 pb-16">
        <Header />

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded border border-red-100 bg-red-50 p-4">
            <p className="font-light text-red-700 text-sm tracking-wide">
              {error}
            </p>
          </div>
        )}

        {/* Main content */}
        <div className="rounded-lg border border-slate-200 bg-white p-8">
          {uploadedFile ? (
            <ImagePreview
              backgroundColor={backgroundColor}
              fitMode={fitMode}
              isProcessing={isProcessing}
              onBackgroundColorChange={setBackgroundColor}
              onClear={handleClear}
              onDownloadAll={handleDownloadAll}
              onDownloadSingle={handleDownloadSingle}
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

        {/* Footer */}
        <footer className="mt-12 text-center">
          <p className="font-light text-gray-400 text-xs tracking-wide">
            All processing happens in your browser. Images are never uploaded.
          </p>
          <a
            className="mt-4 inline-block text-gray-300 transition-colors hover:text-gray-500"
            href="https://github.com/YiftachCohen/sized"
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="sr-only">View source on GitHub</span>
            <svg
              aria-hidden="true"
              fill="currentColor"
              height="20"
              viewBox="0 0 16 16"
              width="20"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </footer>
      </div>
    </div>
  );
}

export default App;
