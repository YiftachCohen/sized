import { type ChangeEvent, type MouseEvent, useCallback } from "react";
import type { FitMode, ProcessedImage } from "../types";

interface ImagePreviewProps {
  backgroundColor: string;
  fitMode: FitMode;
  isDownloading: boolean;
  isProcessing: boolean;
  onBackgroundColorChange: (color: string) => void;
  onClear: () => void;
  onDownloadAll: () => void;
  onDownloadSingle: (image: ProcessedImage) => void;
  onFitModeChange: (mode: FitMode) => void;
  originalFile: File;
  originalPreviewUrl: string;
  processedImages: ProcessedImage[];
  progress: number;
}

const COLOR_PRESETS = [
  { label: "White", value: "#FFFFFF" },
  { label: "Light gray", value: "#F2F2F7" },
  { label: "Graphite", value: "#1C1C1E" },
  { label: "Black", value: "#000000" },
];

function formatFileSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function ImagePreview({
  originalFile,
  originalPreviewUrl,
  processedImages,
  isProcessing,
  isDownloading,
  progress,
  fitMode,
  backgroundColor,
  onFitModeChange,
  onBackgroundColorChange,
  onDownloadSingle,
  onDownloadAll,
  onClear,
}: ImagePreviewProps) {
  const customColor = COLOR_PRESETS.some(
    ({ value }) => value === backgroundColor
  )
    ? "#808080"
    : backgroundColor;
  const handleFitModeClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const { mode } = event.currentTarget.dataset;
      if (mode === "contain" || mode === "cover") {
        onFitModeChange(mode);
      }
    },
    [onFitModeChange]
  );
  const handlePresetClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const { color } = event.currentTarget.dataset;
      if (color) {
        onBackgroundColorChange(color);
      }
    },
    [onBackgroundColorChange]
  );
  const handleCustomColorChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onBackgroundColorChange(event.target.value.toUpperCase());
    },
    [onBackgroundColorChange]
  );
  const handleDownloadClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const image = processedImages.find(
        ({ size }) => size.name === event.currentTarget.dataset.output
      );
      if (image) {
        onDownloadSingle(image);
      }
    },
    [onDownloadSingle, processedImages]
  );

  return (
    <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="border-slate-200 border-b p-6 sm:p-8 lg:border-r lg:border-b-0">
        <div className="mb-7 flex items-start gap-4">
          <div className="checkerboard h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200">
            <img
              alt="Uploaded screenshot"
              className="h-full w-full object-contain"
              height={80}
              src={originalPreviewUrl}
              width={80}
            />
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <p className="truncate font-medium text-sm">{originalFile.name}</p>
            <p className="mt-1 text-slate-500 text-xs">
              {formatFileSize(originalFile.size)} · stays on this device
            </p>
            <button
              className="mt-3 text-slate-600 text-xs underline decoration-slate-300 underline-offset-4 transition hover:text-charcoal"
              onClick={onClear}
              type="button"
            >
              Choose another image
            </button>
          </div>
        </div>

        <fieldset className="border-slate-200 border-t pt-6">
          <legend className="sr-only">Image fit mode</legend>
          <div className="mb-3 flex items-center justify-between">
            <span className="font-medium text-xs uppercase tracking-[0.14em]">
              Image fit
            </span>
            <span className="text-slate-400 text-xs">
              Aspect ratio is locked
            </span>
          </div>
          <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
            {(
              [
                ["contain", "Fit", "Show the whole image"],
                ["cover", "Fill", "Crop to the frame"],
              ] as const
            ).map(([mode, label, description]) => (
              <button
                aria-pressed={fitMode === mode}
                className={`rounded-md px-3 py-2 text-sm transition ${
                  fitMode === mode
                    ? "bg-white font-medium text-charcoal shadow-sm"
                    : "text-slate-500 hover:text-charcoal"
                }`}
                data-mode={mode}
                key={mode}
                onClick={handleFitModeClick}
                title={description}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-7">
          <legend className="mb-3 font-medium text-xs uppercase tracking-[0.14em]">
            Background
          </legend>
          <div className="flex flex-wrap items-center gap-3">
            {COLOR_PRESETS.map((preset) => (
              <button
                aria-label={`${preset.label} background`}
                aria-pressed={backgroundColor === preset.value}
                className={`h-9 w-9 rounded-full border border-slate-200 transition hover:scale-105 ${
                  backgroundColor === preset.value
                    ? "ring-2 ring-accent ring-offset-2"
                    : ""
                }`}
                data-color={preset.value}
                key={preset.value}
                onClick={handlePresetClick}
                style={{ backgroundColor: preset.value }}
                title={preset.label}
                type="button"
              />
            ))}
            <label className="relative grid h-9 w-9 cursor-pointer place-items-center overflow-hidden rounded-full border border-slate-200 bg-spectrum text-transparent transition hover:scale-105">
              <span className="sr-only">Custom background color</span>
              <input
                aria-label="Custom background color"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                onChange={handleCustomColorChange}
                type="color"
                value={customColor}
              />
            </label>
          </div>
          <p className="mt-3 text-slate-500 text-xs leading-relaxed">
            Exports use JPEG because App Store screenshots cannot contain an
            alpha channel.
          </p>
        </fieldset>
      </section>

      <section aria-busy={isProcessing} className="p-6 sm:p-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="font-medium text-xs uppercase tracking-[0.14em]">
              Master outputs
            </p>
            <p className="mt-1.5 text-slate-500 text-xs">
              App Store Connect scales these for smaller displays.
            </p>
          </div>
          {!isProcessing && processedImages.length > 0 && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 text-xs">
              Ready
            </span>
          )}
        </div>

        {isProcessing ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-6">
            <div
              aria-label={`Processing ${progress}%`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progress}
              className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200"
              role="progressbar"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-4 font-medium text-sm">Preparing screenshots</p>
            <p className="mt-1 text-slate-500 text-xs">{progress}% complete</p>
          </div>
        ) : (
          <div className="space-y-3">
            {processedImages.map((image) => (
              <article
                className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-slate-300"
                key={image.size.name}
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d={
                        image.size.platform === "iPhone"
                          ? "M9 2h6a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm2 17h2"
                          : "M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm5 17h2"
                      }
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium text-sm">
                      {image.size.displayName}
                    </h2>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 uppercase tracking-wide">
                      Master
                    </span>
                  </div>
                  <p className="mt-1 text-slate-500 text-xs tabular-nums">
                    {image.size.width} × {image.size.height} · JPEG
                  </p>
                </div>
                <button
                  aria-label={`Download ${image.size.displayName}`}
                  className="btn-secondary shrink-0"
                  data-output={image.size.name}
                  onClick={handleDownloadClick}
                  type="button"
                >
                  Download
                </button>
              </article>
            ))}
          </div>
        )}

        {!isProcessing && processedImages.length > 0 && (
          <button
            className="btn-primary mt-5 w-full"
            disabled={isDownloading}
            onClick={onDownloadAll}
            type="button"
          >
            {isDownloading ? "Building ZIP…" : "Download both as ZIP"}
          </button>
        )}
      </section>
    </div>
  );
}
