import { useCallback, useEffect } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface DropZoneProps {
  onFileAccepted: (file: File) => void;
  onError: (message: string) => void;
}

export function DropZone({ onFileAccepted, onError }: DropZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        onError('Please upload a PNG, JPEG, or WebP image');
        return;
      }

      if (acceptedFiles.length > 0) {
        onFileAccepted(acceptedFiles[0]);
      }
    },
    [onFileAccepted, onError]
  );

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.kind === 'file' && ALLOWED_TYPES.includes(item.type)) {
          const file = item.getAsFile();
          if (file) {
            onFileAccepted(file);
            return;
          }
        }
      }

      // Check if any files were in clipboard but wrong type
      const hasFiles = Array.from(items).some((item) => item.kind === 'file');
      if (hasFiles) {
        onError('Please paste a PNG, JPEG, or WebP image');
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [onFileAccepted, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        min-h-[400px] flex flex-col items-center justify-center
        border border-dashed rounded-lg cursor-pointer
        transition-all duration-200 ease-out
        ${
          isDragActive
            ? 'border-charcoal bg-slate-50'
            : 'border-slate-200 hover:border-slate-300 bg-white'
        }
      `}
    >
      <input {...getInputProps()} />

      <svg
        className={`w-12 h-12 mb-6 transition-colors duration-200 ${
          isDragActive ? 'text-charcoal' : 'text-slate-300'
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>

      <p className="text-sm font-light tracking-wide text-gray-500">
        {isDragActive ? (
          'Drop your image here'
        ) : (
          <>
            Drag and drop, paste, or{' '}
            <span className="text-charcoal underline underline-offset-2">browse</span>
          </>
        )}
      </p>

      <p className="mt-3 text-xs font-light tracking-wide text-gray-400">
        PNG, JPEG, or WebP up to 20MB
      </p>
    </div>
  );
}
