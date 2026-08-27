import React from 'react';

interface LogoProps {
  /** Rendered size in pixels, applied to both width and height. */
  size?: number;
  className?: string;
}

/**
 * The product mark: a scribe's nib on a filled ground.
 *
 * "Sqrib" is the scribe — the one who keeps your documents at your own desk
 * rather than on someone else's server. A nib also sets us apart in a
 * category where every competitor draws a page icon, and it stays readable
 * at favicon size where a page-with-text glyph turns to mush.
 *
 * The nib is one compound path with `evenodd`, so the breather hole and
 * slit are genuinely transparent and the mark survives on any background.
 */
export const Logo: React.FC<LogoProps> = ({ size = 40, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    className={className}
    role="img"
    aria-label="SqribPDF"
  >
    <rect width="64" height="64" rx="15" fill="var(--accent)" />
    <path
      fillRule="evenodd"
      fill="var(--accent-on)"
      d="M26 14 L38 14 L46 30 L32 52 L18 30 Z
         M35.5 27.5 A3.5 3.5 0 1 1 28.5 27.5 A3.5 3.5 0 1 1 35.5 27.5 Z
         M30.3 30 L33.7 30 L32 51 Z"
    />
  </svg>
);

interface WordmarkProps {
  /** Size of the mark in pixels; the text scales alongside it. */
  size?: number;
  className?: string;
}

/**
 * Mark plus name. "Sqrib" is the brand and "PDF" the category descriptor —
 * the same construction iLovePDF and Smallpdf use, and the reason the
 * display form is SqribPDF rather than the all-caps SQRIBPDF, which loses
 * legibility below about 20px.
 */
export const Wordmark: React.FC<WordmarkProps> = ({ size = 28, className }) => (
  <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
    <Logo size={size} />
    <span
      className="font-display font-semibold tracking-tight text-ink"
      style={{ fontSize: size * 0.68 }}
    >
      Sqrib<span className="text-accent">PDF</span>
    </span>
  </span>
);
