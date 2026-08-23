import React from 'react';

interface LogoProps {
  /** Rendered size in pixels, applied to both width and height. */
  size?: number;
  className?: string;
}

/**
 * The product mark: a page with a folded corner and two lines of text,
 * behind a second page rotated slightly to suggest reordering/merging.
 * Kept inline rather than loaded from /logo.svg so it costs no extra
 * request and inherits the surrounding layout.
 */
export const Logo: React.FC<LogoProps> = ({ size = 40, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    className={className}
    role="img"
    aria-label="PDF Editor Pro"
  >
    <rect x="16" y="8" width="32" height="42" rx="4" fill="#111827" opacity=".12" transform="rotate(-8 32 29)" />
    <rect x="10" y="6" width="36" height="46" rx="5" fill="#FFFFFF" stroke="#111827" strokeWidth="3" />
    <path d="M36 6 L46 6 L46 16 Z" fill="#2563EB" />
    <rect x="18" y="26" width="20" height="4" rx="2" fill="#111827" opacity=".45" />
    <rect x="18" y="34" width="14" height="4" rx="2" fill="#111827" opacity=".45" />
  </svg>
);
