<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# PDF Editor Pro

A fully client-side PDF editor. Drop in one or more PDFs, reorder/rotate/delete pages across them, insert blank pages with text, and export a single merged PDF. Files never leave the browser.

## Features

- Merge multiple PDFs into a single document
- Drag-to-reorder pages across all loaded files
- Rotate or delete individual pages
- Insert blank pages with a basic rich-text editor (bold/italic/underline/list)
- Rename and export the result as a new PDF

## Tech stack

- React 19 + TypeScript, bundled with Vite
- Tailwind CSS v4 (`@tailwindcss/vite`)
- [`pdf-lib`](https://github.com/Hopding/pdf-lib) for PDF creation, page copying, and export
- [`pdf.js`](https://mozilla.github.io/pdf.js/) (loaded from CDN in `index.html`) for rendering page thumbnails and previews
- [`@dnd-kit`](https://dndkit.com/) for drag-and-drop reordering

## Run locally

**Prerequisites:** Node.js 22 (see `.nvmrc`).

```bash
npm install
npm run dev
```

The dev server starts on http://localhost:3000.

## Build

```bash
npm run build      # produces dist/
npm run preview    # serves the built bundle locally
```
