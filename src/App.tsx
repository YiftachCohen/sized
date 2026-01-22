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
        </footer>
      </div>
    </div>
  );
}

export default App;
