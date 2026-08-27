<p align="center">
  <img src="public/logo.svg" width="88" height="88" alt="SqribPDF" />
</p>

<h1 align="center">SqribPDF</h1>

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

A fully client-side PDF editor. Drop in one or more PDFs, reorder/rotate/delete pages across them, insert blank pages with text, and export a single merged PDF. **Files never leave the browser** — nothing is uploaded, no account is needed, and it keeps working offline.

## Features

- Merge multiple PDFs into a single document
- Compress a document by re-encoding its images, without touching text or layout
- Drag-to-reorder pages across all loaded files
- Rotate or delete individual pages
- Insert blank pages with a basic rich-text editor (bold/italic/underline/list)
- Rename and export the result as a new PDF

## Tech stack

- React 19 + TypeScript, bundled with Vite
- Tailwind CSS v4 (`@tailwindcss/vite`)
- [`pdf-lib`](https://github.com/Hopding/pdf-lib) for PDF creation, page copying, and export
- [`pdf.js`](https://mozilla.github.io/pdf.js/) (`pdfjs-dist`, bundled) for rendering page thumbnails and previews
- [`@dnd-kit`](https://dndkit.com/) for drag-and-drop reordering
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) for tests

## Design system

Colour, type and radii live as tokens in [`index.css`](index.css). Every token is
declared once as a plain custom property and exposed to Tailwind through
`@theme inline`, so a single utility class resolves correctly in either theme.

**Never hard-code a colour in a component** — add a token instead. A raw
palette class like `bg-gray-200` will not follow the theme and will break dark
mode.

- Palette: "ink & ledger" — a deep pine-green accent, chosen because the PDF
  category is uniformly red (Adobe, iLovePDF, Smallpdf).
- Type: Archivo (display) and IBM Plex Sans (UI), both self-hosted so no font
  CDN is contacted at runtime.
- Theming: `prefers-color-scheme` by default; an explicit choice is stamped as
  `data-theme` on the root element and persisted in `localStorage`.
- All foreground/background token pairs meet WCAG AA (4.5:1) in both themes.

## Run locally

**Prerequisites:** Node.js 22 (see `.nvmrc`).

```bash
npm install
npm run dev
```

The dev server starts on http://localhost:3000.

## Test

```bash
npm test         # run the test suite once
npm run typecheck # type-check without emitting
```

## Build

```bash
npm run build      # produces dist/
npm run preview    # serves the built bundle locally
```
