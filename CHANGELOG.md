# Changelog

## 1.1.0

- Align output presets with current 6.9-inch iPhone and 13-inch iPad master sizes.
- Export opaque JPEGs that meet App Store Connect's no-alpha requirement.
- Preserve the source orientation automatically.
- Replace blocking pixel-by-pixel sharpening and base64 duplication with asynchronous blob encoding.
- Cancel stale processing runs when options change.
- Add decoded-image limits, clearer upload validation, and stronger error handling.
- Refresh the interface, accessibility, metadata, documentation, dependencies, and CI runtime.
- Resolve all known dependency advisories reported by `pnpm audit` at release time.
