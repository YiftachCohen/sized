# Sized

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

![Sized – Generate iOS App Store screenshots in all required sizes](public/og.jpg)

Generate iOS App Store screenshots in all required sizes — entirely in the browser. No uploads, no servers, no external APIs.

**[Live Demo →](https://ycstudios.dev/)**

![Screenshot](docs/screenshot.png)

## Features

- Drag-and-drop, paste, or file-pick image input
- Generates all four required App Store screenshot sizes at once
- Two fit modes: **contain** (with configurable background color) or **cover** (crop to fill)
- Download individually or batch-download as a `.zip`
- 100% client-side — images never leave your browser

## Output Sizes

| Device        | Resolution  |
|---------------|-------------|
| 6.9" iPhone   | 1260 × 2736 |
| 6.5" iPhone   | 1284 × 2778 |
| 5.5" iPhone   | 1242 × 2208 |
| 12.9" iPad    | 2048 × 2732 |

## Getting Started

```bash
git clone https://github.com/YiftachCohen/sized.git
cd sized
pnpm install
pnpm dev
```

## Scripts

| Command        | Description                          |
|----------------|--------------------------------------|
| `pnpm dev`     | Start dev server with hot reload     |
| `pnpm build`   | Type-check and build for production  |
| `pnpm preview` | Preview the production build locally |
| `pnpm test`    | Run tests                            |
| `pnpm lint`    | Run Biome linter                     |
| `pnpm lint:fix`| Auto-fix lint issues                 |

## Tech Stack

React, TypeScript, Vite, Tailwind CSS, Canvas API, JSZip

## License

[MIT](LICENSE)
