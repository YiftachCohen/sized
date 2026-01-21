# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

iOS Screenshot Generator - a React + TypeScript web application for generating iOS App Store screenshots in multiple required sizes. All image processing happens client-side using Canvas API; no server-side processing or external APIs.

## Commands

```bash
pnpm dev      # Start Vite dev server with HMR
pnpm build    # TypeScript check + Vite production build
pnpm preview  # Preview production build locally
```

Package manager: pnpm

## Architecture

```
App.tsx (State Management)
    ├── Header.tsx           # Title/description
    ├── DropZone.tsx         # Drag-drop + clipboard paste file input
    └── ImagePreview.tsx     # Options, progress, previews, downloads
            ↓
    ImageProcessor.ts        # Canvas-based image processing utilities
```

**Data Flow:**
1. User drops/pastes/selects image → DropZone validates file
2. App triggers `ImageProcessor.processImage()` with fit mode + background color
3. Canvas API resizes to all target sizes (6.7", 6.5", 5.5" iPhone + 12.9" iPad)
4. Results displayed with individual download or batch .zip download (JSZip)

**Key Technical Details:**
- Processing runs in main thread (no Web Workers)
- Outputs PNG regardless of input format
- File validation: images only, max 20MB
- Fit modes: "contain" (with background) or "cover" (crop to fill)

## Output Sizes

| Device | Resolution |
|--------|------------|
| 6.7" iPhone | 1290×2796 |
| 6.5" iPhone | 1284×2778 |
| 5.5" iPhone | 1242×2688 |
| 12.9" iPad | 2048×2732 |

## Styling

Tailwind CSS with custom `charcoal` color (#333333). Custom component classes defined in `index.css`: `.btn-primary`, `.btn-secondary`, `.progress-bar`, `.checkerboard`.
