# Architecture Notes

## Runtime Surfaces

- `ui/`: active Vite/React desktop frontend.
- `src-tauri/`: native commands, permissions, OS integration, and packaging.
- `components/context/`: shared React providers and cross-cutting UI context.
- `components/editor/`: screenshot editor and composition components.
- `components/overlays/`: canvas and selection overlays.
- `components/mockups/`: browser and OS chrome mockups.
- `components/dialogs/SettingsModal.jsx`: desktop settings and shortcut editor.
- `utils/color/`: color parsing, normalization, and palette helpers.
- `utils/core/`: generic math, debugging, drag, and editor-option helpers.
- `utils/export/`: export pipeline, DOM capture, and encoding helpers.
- `utils/image/`: screenshot layout, rendering, and image-specific presentation helpers.
- `utils/platform/`: Tauri/runtime integration, shortcuts, storage, and environment helpers.

## Rendering Flow

1. The editor state is assembled in the React UI.
2. `components/editor/ImageDisplay.jsx` renders the screenshot card, browser chrome, annotations, background frame, and export-only attributes.
3. Shared math and styling helpers are grouped by concern under `utils/` subfolders.

## Export Flow

1. `utils/export/imageProcessor.js` is the public export/copy entry point.
2. `utils/export/exportDomCapture.js` handles DOM-readiness waits, export-mode DOM attributes, and canvas replacement during capture.
3. `utils/export/exportPresentation.js` keeps export-specific presentation rules separate from preview behavior.
4. Post-capture cleanup trims transparent seams and applies any final encoding work.

## File Organization Heuristics

- Put helpers in the smallest domain folder that matches their job.
- Keep editor rendering in `components/editor/` and avoid mixing it with platform or context code.
- Keep Tauri/runtime glue in `utils/platform/`.
- Treat `ui/` as the default product surface.