import type { FitMode, ProcessedImage } from "../types";
import { SCREENSHOT_SIZES } from "../utils/ImageProcessor";

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
  { value: "#FFFFFF", label: "White" },
  { value: "#000000", label: "Black" },
  { value: "transparent", label: "Transparent" },
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
    !COLOR_PRESETS.some((p) => p.value === backgroundColor) &&
    backgroundColor !== "transparent";

  return (
    <div className="space-y-8">
      {/* Original image preview */}
      <div className="flex items-start gap-6">
        <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-50">
          <img
            alt="Original"
            className="h-full w-full object-contain"
            height={96}
            src={originalPreviewUrl}
            width={96}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-normal text-charcoal text-sm tracking-wide">
            {originalFile.name}
          </p>
          <p className="mt-1 font-light text-gray-400 text-xs tracking-wide">
            {(originalFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
          <button
            className="mt-3 font-light text-gray-500 text-xs tracking-wide underline underline-offset-2 transition-colors hover:text-charcoal"
            onClick={onClear}
            type="button"
          >
            Upload different image
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-6 border-slate-100 border-t pt-6">
        {/* Fit mode toggle */}
        <div>
          <span className="mb-3 block font-light text-gray-400 text-xs uppercase tracking-wider">
            Fit Mode
          </span>
          <div className="flex gap-2">
            <button
              className={`border px-4 py-2 font-light text-sm tracking-wide transition-all duration-200 ${
                fitMode === "contain"
                  ? "border-charcoal bg-slate-50 text-charcoal"
                  : "border-slate-200 text-gray-500 hover:border-slate-300"
              }`}
              onClick={() => onFitModeChange("contain")}
              type="button"
            >
              Contain
            </button>
            <button
              className={`border px-4 py-2 font-light text-sm tracking-wide transition-all duration-200 ${
                fitMode === "cover"
                  ? "border-charcoal bg-slate-50 text-charcoal"
                  : "border-slate-200 text-gray-500 hover:border-slate-300"
              }`}
              onClick={() => onFitModeChange("cover")}
              type="button"
            >
              Cover
            </button>
          </div>
        </div>

        {/* Background color (only for contain mode) */}
        {fitMode === "contain" && (
          <div>
            <span className="mb-3 block font-light text-gray-400 text-xs uppercase tracking-wider">
              Background
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  className={`h-8 w-8 rounded border transition-all duration-200 ${
                    backgroundColor === preset.value
                      ? "ring-2 ring-charcoal ring-offset-2"
                      : "hover:scale-110"
                  } ${preset.value === "transparent" ? "checkerboard" : ""}`}
                  key={preset.value}
                  onClick={() => onBackgroundColorChange(preset.value)}
                  style={
                    preset.value !== "transparent"
                      ? { backgroundColor: preset.value }
                      : undefined
                  }
                  title={preset.label}
                  type="button"
                />
              ))}
              <div className="ml-2 flex items-center gap-2">
                <input
                  className="h-8 w-8 cursor-pointer rounded border border-slate-200"
                  onChange={(e) => onBackgroundColorChange(e.target.value)}
                  title="Custom color"
                  type="color"
                  value={isCustomColor ? backgroundColor : "#808080"}
                />
                <span className="font-light text-gray-400 text-xs tracking-wide">
                  Custom
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center font-light text-gray-400 text-xs tracking-wide">
            Processing... {progress}%
          </p>
        </div>
      )}

      {/* Generated sizes */}
      {!isProcessing && processedImages.length > 0 && (
        <div className="space-y-4 border-slate-100 border-t pt-6">
          <span className="block font-light text-gray-400 text-xs uppercase tracking-wider">
            Generated Sizes
          </span>
          <div className="space-y-3">
            {SCREENSHOT_SIZES.map((size) => {
              const processed = processedImages.find(
                (img) => img.size.name === size.name
              );
              return (
                <div
                  className="flex items-center justify-between rounded border border-slate-100 bg-slate-50/50 px-4 py-3"
                  key={size.name}
                >
                  <div className="flex items-center gap-3">
                    {processed ? (
                      <svg
                        aria-label="Completed"
                        className="h-4 w-4 text-green-600"
                        fill="none"
                        role="img"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M5 13l4 4L19 7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-slate-300" />
                    )}
                    <div>
                      <p className="font-normal text-charcoal text-sm tracking-wide">
                        {size.displayName}
                      </p>
                      <p className="font-light text-gray-400 text-xs tracking-wide">
                        {size.width} × {size.height} px
                      </p>
                    </div>
                  </div>
                  {processed && (
                    <button
                      className="btn-secondary text-xs"
                      onClick={() => onDownloadSingle(processed)}
                      type="button"
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
          <button
            className="btn-primary w-full"
            onClick={onDownloadAll}
            type="button"
          >
            Download All (.zip)
          </button>
        </div>
      )}
    </div>
  );
}
