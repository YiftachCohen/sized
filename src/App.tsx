import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { ImagePreview } from './components/ImagePreview';
import {
  processImage,
  downloadSingleImage,
  downloadAllAsZip,
  ImageProcessorError,
} from './utils/ImageProcessor';
import type { ProcessedImage, FitMode } from './types';

function App() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string>('');
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [fitMode, setFitMode] = useState<FitMode>('contain');
  const [backgroundColor, setBackgroundColor] = useState<string>('#FFFFFF');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = useCallback(async (file: File, fit: FitMode, bgColor: string) => {
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
        setError('An unexpected error occurred. Please try again.');
      }
      setProcessedImages([]);
    } finally {
      setIsProcessing(false);
    }
  }, []);

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
    setOriginalPreviewUrl('');
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
        setError('Failed to create download. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 pb-16">
        <Header />

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded">
            <p className="text-sm font-light tracking-wide text-red-700">{error}</p>
          </div>
        )}

        {/* Main content */}
        <div className="bg-white border border-slate-200 rounded-lg p-8">
          {!uploadedFile ? (
            <DropZone onFileAccepted={handleFileAccepted} onError={handleError} />
          ) : (
            <ImagePreview
              originalFile={uploadedFile}
              originalPreviewUrl={originalPreviewUrl}
              processedImages={processedImages}
              isProcessing={isProcessing}
              progress={progress}
              fitMode={fitMode}
              backgroundColor={backgroundColor}
              onFitModeChange={setFitMode}
              onBackgroundColorChange={setBackgroundColor}
              onDownloadSingle={handleDownloadSingle}
              onDownloadAll={handleDownloadAll}
              onClear={handleClear}
            />
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center">
          <p className="text-xs font-light tracking-wide text-gray-400">
            All processing happens in your browser. Images are never uploaded.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
