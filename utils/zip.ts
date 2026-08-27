import { zipSync } from 'fflate';

export interface ZipEntry {
  name: string;
  bytes: Uint8Array;
}

/**
 * Bundles files into a zip, in memory.
 *
 * PDFs and JPEGs are already compressed, so entries are stored rather than
 * deflated: level 0 costs nothing in size and saves the time (and memory)
 * of a pointless second pass over what can be hundreds of megabytes.
 */
export const createZip = (entries: ZipEntry[]): Uint8Array => {
  const files: Record<string, [Uint8Array, { level: 0 }]> = {};
  const used = new Map<string, number>();

  for (const entry of entries) {
    // Two ranges can produce the same name; zip readers handle duplicates
    // inconsistently, so disambiguate here.
    const count = used.get(entry.name) ?? 0;
    used.set(entry.name, count + 1);
    const name = count === 0 ? entry.name : entry.name.replace(/(\.[^.]+)$/, ` (${count})$1`);
    files[name] = [entry.bytes, { level: 0 }];
  }

  return zipSync(files, { level: 0 });
};

export const downloadZip = (bytes: Uint8Array, fileName: string) => {
  const blob = new Blob([bytes as BlobPart], { type: 'application/zip' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName.endsWith('.zip') ? fileName : `${fileName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
