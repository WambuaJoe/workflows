import type { SVGProps } from "react";

// Glyphs drawn for this project, for shapes no open-source set covers closely.

export type GlyphProps = Omit<SVGProps<SVGSVGElement>, "width" | "height"> & { size?: number };

function frame({ size = 20, ...props }: GlyphProps, viewBox = "0 0 20 20") {
  return { width: size, height: size, viewBox, "aria-hidden": true, focusable: false, ...props };
}

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** The app's logo mark: three linked loops. */
export function OptimaMark(props: GlyphProps) {
  return (
    <svg {...frame(props, "0 0 24 24")} fill="none" stroke="currentColor" strokeWidth={2.1}>
      <ellipse cx="7" cy="12" rx="2.7" ry="4.6" transform="rotate(40 7 12)" />
      <ellipse cx="12" cy="12" rx="2.7" ry="4.6" transform="rotate(40 12 12)" />
      <ellipse cx="17" cy="12" rx="2.7" ry="4.6" transform="rotate(40 17 12)" />
    </svg>
  );
}

/** Two nodes joined by an elbow, for the Automations nav item. */
export function AutomationsIcon({ size = 17, ...props }: GlyphProps) {
  return (
    <svg {...frame({ size, ...props })} fill="currentColor">
      <circle cx="5.5" cy="4.75" r="2.75" />
      <circle cx="5.5" cy="15" r="2.75" />
      <rect x="12" y="12.25" width="5.5" height="5.5" rx="1.4" />
      <path d="M5.5 7v5.5M8 15h4.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

/** Opposite corners with a link between them, for "Do this" chips. */
export function DoThisIcon({ size = 11, ...props }: GlyphProps) {
  return (
    <svg {...frame({ size, ...props })} {...STROKE} strokeWidth={2.4}>
      <path d="M4 9.5V6a2 2 0 0 1 2-2h3.5" />
      <path d="M16 10.5V14a2 2 0 0 1-2 2h-3.5" />
      <path d="M8.5 11.5 11.5 8.5" />
    </svg>
  );
}

/** A path splitting off to the side, for condition steps. */
export function ConditionIcon({ size = 12, ...props }: GlyphProps) {
  return (
    <svg {...frame({ size, ...props })} {...STROKE} strokeWidth={2}>
      <path d="M6 17V3.5" />
      <path d="M3.5 6 6 3.5 8.5 6" />
      <path d="M6 7h3.5a4 4 0 0 1 4 4v1.5" />
      <circle cx="13.5" cy="15" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** One node branching to two, for path steps. */
export function PathsIcon({ size = 12, ...props }: GlyphProps) {
  return (
    <svg {...frame({ size, ...props })} fill="currentColor">
      <circle cx="10" cy="4.5" r="2.5" />
      <circle cx="4.5" cy="15.5" r="2.5" />
      <circle cx="15.5" cy="15.5" r="2.5" />
      <path d="M10 7v3M10 10l-4 3.5M10 10l4 3.5" {...STROKE} strokeWidth={1.8} />
    </svg>
  );
}

/** A magnifier inside scan corners, for the zoom menu. */
export function ZoomScanIcon({ size = 18, ...props }: GlyphProps) {
  return (
    <svg {...frame({ size, ...props })} {...STROKE} strokeWidth={1.8}>
      <path d="M3 6.5v-2A1.5 1.5 0 0 1 4.5 3h2M13.5 3h2A1.5 1.5 0 0 1 17 4.5v2M17 13.5v2a1.5 1.5 0 0 1-1.5 1.5h-2M6.5 17h-2A1.5 1.5 0 0 1 3 15.5v-2" />
      <circle cx="9.5" cy="9.5" r="3" />
      <path d="m11.8 11.8 2 2" />
    </svg>
  );
}
