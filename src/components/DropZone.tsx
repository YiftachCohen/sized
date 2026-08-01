import { useCallback, useEffect } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import {
  ImageProcessorError,
  MAX_FILE_SIZE,
  validateFile,
} from "../utils/ImageProcessor";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

interface DropZoneProps {
  onError: (message: string) => void;
  onFileAccepted: (file: File) => void;
}

function getRejectionMessage(rejection: FileRejection): string {
  if (rejection.errors.some(({ code }) => code === "file-too-large")) {
    return "Image too large. Please use an image under 20MB";
  }
  return "Please upload a PNG, JPEG, or WebP image";
}

export function DropZone({ onFileAccepted, onError }: DropZoneProps) {
  const acceptFile = useCallback(
    (file: File) => {
      try {
        validateFile(file);
        onFileAccepted(file);
      } catch (error) {
        onError(
          error instanceof ImageProcessorError
            ? error.message
            : "That image could not be opened"
        );
      }
    },
    [onFileAccepted, onError]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      const [rejection] = rejectedFiles;
      if (rejection) {
        onError(getRejectionMessage(rejection));
        return;
      }
      const [file] = acceptedFiles;
      if (file) {
        acceptFile(file);
      }
    },
    [acceptFile, onError]
  );

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }

      const fileItems = Array.from(items).filter(
        (item) => item.kind === "file"
      );
      if (fileItems.length === 0) {
        return;
      }
      const fileItem = fileItems.find((item) =>
        ALLOWED_TYPES.includes(item.type)
      );
      if (!fileItem) {
        onError("Please paste a PNG, JPEG, or WebP image");
        return;
      }

      const file = fileItem.getAsFile();
      if (file) {
        event.preventDefault();
        acceptFile(file);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [acceptFile, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    onDrop,
  });

  return (
    <div className="p-3 sm:p-5">
      <div
        {...getRootProps({
          "aria-label": "Choose an image to resize",
        })}
        className={`group relative flex min-h-[440px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed px-6 text-center outline-none transition sm:min-h-[500px] ${
          isDragActive
            ? "border-accent bg-accent-soft"
            : "border-slate-300 bg-dropzone hover:border-slate-400 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        }`}
      >
        <input {...getInputProps({ "aria-label": "Upload image" })} />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
        />

        <div
          className={`mb-6 grid h-16 w-16 place-items-center rounded-2xl border bg-white shadow-sm transition duration-200 ${
            isDragActive
              ? "scale-105 border-accent text-accent"
              : "border-slate-200 text-slate-500 group-hover:-translate-y-0.5 group-hover:text-charcoal"
          }`}
        >
          <svg
            aria-hidden="true"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M4 16.5 8.6 12a2 2 0 0 1 2.8 0l4.1 4m-1.5-1.5 1.6-1.6a2 2 0 0 1 2.8 0L20 14.5M14 8h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        <h2 className="font-medium text-xl tracking-tight sm:text-2xl">
          {isDragActive ? "Drop it here" : "Drop an app screenshot"}
        </h2>
        <p className="mt-2 text-slate-500 text-sm">
          Or click to browse. You can paste from the clipboard too.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2 text-slate-500 text-xs">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            PNG, JPEG, WebP
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            Up to 20MB
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
            Portrait or landscape
          </span>
        </div>
      </div>
    </div>
  );
}
