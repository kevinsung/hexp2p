import React from 'react';

// Monochrome media-player style glyphs for the move-history navigation bar.
// Each icon is a decorative inline SVG that inherits the button's font size
// (1em) and text color (currentColor); the button itself carries the label
// via aria-label. Left-facing variants are the right-facing shapes mirrored
// across the vertical center of the 24x24 viewBox.

function IconSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function Mirror({ children }: { children: React.ReactNode }) {
  // Flip horizontally about the viewBox center so right-facing shapes can be
  // reused for the left-facing icons.
  return <g transform="translate(24 0) scale(-1 1)">{children}</g>;
}

// Shared right-facing shapes.
const singleTriangle = <polygon points="7,4 19,12 7,20" />;
const doubleTriangle = (
  <>
    <polygon points="3,4 12,12 3,20" />
    <polygon points="12,4 21,12 12,20" />
  </>
);
const triangleWithBar = (
  <>
    <polygon points="5,4 16,12 5,20" />
    <rect x="17" y="4" width="2.5" height="16" />
  </>
);

export function StepForwardIcon() {
  return <IconSvg>{singleTriangle}</IconSvg>;
}

export function StepBackIcon() {
  return (
    <IconSvg>
      <Mirror>{singleTriangle}</Mirror>
    </IconSvg>
  );
}

export function FastForwardIcon() {
  return <IconSvg>{doubleTriangle}</IconSvg>;
}

export function RewindIcon() {
  return (
    <IconSvg>
      <Mirror>{doubleTriangle}</Mirror>
    </IconSvg>
  );
}

export function SkipToEndIcon() {
  return <IconSvg>{triangleWithBar}</IconSvg>;
}

export function SkipToStartIcon() {
  return (
    <IconSvg>
      <Mirror>{triangleWithBar}</Mirror>
    </IconSvg>
  );
}
