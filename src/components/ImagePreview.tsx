import type { ProcessedImage, FitMode } from '../types';
import { SCREENSHOT_SIZES } from '../utils/ImageProcessor';

interface ImagePreviewProps {
  originalFile: File;
  originalPreviewUrl: string;
  processedImages: ProcessedImage[];
  isProcessing: boolean;
  progress: number;
  fitMode: FitMode;
  backgroundColor: string;
  onFitModeChange: (mode: FitMode) => void;
  onBackgroundColorChange: (color: string) => void;
  onDownloadSingle: (image: ProcessedImage) => void;
  onDownloadAll: () => void;
  onClear: () => void;
}

const COLOR_PRESETS = [
  { value: '#FFFFFF', label: 'White' },
  { value: '#000000', label: 'Black' },
  { value: 'transparent', label: 'Transparent' },
];

export function ImagePreview({
  originalFile,
  originalPreviewUrl,
  processedImages,
  isProcessing,
  progress,
  fitMode,
  backgroundColor,
  onFitModeChange,
  onBackgroundColorChange,
  onDownloadSingle,
  onDownloadAll,
  onClear,
}: ImagePreviewProps) {
  const isCustomColor =
    !COLOR_PRESETS.some((p) => p.value === backgroundColor) && backgroundColor !== 'transparent';

  return (
    <div className="space-y-8">
      {/* Original image preview */}
      <div className="flex items-start gap-6">
        <div className="w-24 h-24 flex-shrink-0 rounded border border-slate-200 overflow-hidden bg-slate-50">
          <img
            src={originalPreviewUrl}
            alt="Original"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-normal tracking-wide text-charcoal truncate">
            {originalFile.name}
          </p>
          <p className="mt-1 text-xs font-light tracking-wide text-gray-400">
            {(originalFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
          <button
            onClick={onClear}
            className="mt-3 text-xs font-light tracking-wide text-gray-500 hover:text-charcoal underline underline-offset-2 transition-colors"
          >
            Upload different image
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-6 pt-6 border-t border-slate-100">
        {/* Fit mode toggle */}
        <div>
          <label className="block text-xs font-light tracking-wider text-gray-400 uppercase mb-3">
            Fit Mode
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => onFitModeChange('contain')}
              className={`px-4 py-2 text-sm font-light tracking-wide border transition-all duration-200 ${
                fitMode === 'contain'
                  ? 'border-charcoal text-charcoal bg-slate-50'
                  : 'border-slate-200 text-gray-500 hover:border-slate-300'
              }`}
            >
              Contain
            </button>
            <button
              onClick={() => onFitModeChange('cover')}
              className={`px-4 py-2 text-sm font-light tracking-wide border transition-all duration-200 ${
                fitMode === 'cover'
                  ? 'border-charcoal text-charcoal bg-slate-50'
                  : 'border-slate-200 text-gray-500 hover:border-slate-300'
              }`}
            >
              Cover
            </button>
          </div>
        </div>

        {/* Background color (only for contain mode) */}
        {fitMode === 'contain' && (
          <div>
            <label className="block text-xs font-light tracking-wider text-gray-400 uppercase mb-3">
              Background
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => onBackgroundColorChange(preset.value)}
                  className={`w-8 h-8 rounded border transition-all duration-200 ${
                    backgroundColor === preset.value
                      ? 'ring-2 ring-charcoal ring-offset-2'
                      : 'hover:scale-110'
                  } ${preset.value === 'transparent' ? 'checkerboard' : ''}`}
                  style={
                    preset.value !== 'transparent'
                      ? { backgroundColor: preset.value }
                      : undefined
                  }
                  title={preset.label}
                />
              ))}
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="color"
                  value={isCustomColor ? backgroundColor : '#808080'}
                  onChange={(e) => onBackgroundColorChange(e.target.value)}
                  className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                  title="Custom color"
                />
                <span className="text-xs font-light tracking-wide text-gray-400">Custom</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs font-light tracking-wide text-gray-400 text-center">
            Processing... {progress}%
          </p>
        </div>
      )}

      {/* Generated sizes */}
      {!isProcessing && processedImages.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-100">
          <label className="block text-xs font-light tracking-wider text-gray-400 uppercase">
            Generated Sizes
          </label>
          <div className="space-y-3">
            {SCREENSHOT_SIZES.map((size) => {
              const processed = processedImages.find((img) => img.size.name === size.name);
              return (
                <div
                  key={size.name}
                  className="flex items-center justify-between py-3 px-4 bg-slate-50/50 rounded border border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    {processed ? (
                      <svg
                        className="w-4 h-4 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300" />
                    )}
                    <div>
                      <p className="text-sm font-normal tracking-wide text-charcoal">
                        {size.displayName}
                      </p>
                      <p className="text-xs font-light tracking-wide text-gray-400">
                        {size.width} × {size.height} px
                      </p>
                    </div>
                  </div>
                  {processed && (
                    <button
                      onClick={() => onDownloadSingle(processed)}
                      className="btn-secondary text-xs"
                    >
                      Download
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Download all button */}
      {!isProcessing && processedImages.length > 0 && (
        <div className="pt-6">
          <button onClick={onDownloadAll} className="btn-primary w-full">
            Download All (.zip)
          </button>
        </div>
      )}
    </div>
  );
}
