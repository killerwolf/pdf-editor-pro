/**
 * Which dropped or picked files the editor will take.
 *
 * Images are accepted alongside PDFs because they are converted to
 * single-page PDFs on load, so they behave like any other page.
 */
export const isAcceptedUpload = (file: File): boolean =>
  file.type === 'application/pdf' || file.type.startsWith('image/');
