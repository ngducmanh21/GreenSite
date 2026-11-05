/** GreenSite Brand Identity / Concept 01 — user-supplied reference. */
export const BRAND_COLORS = {
  forest: "#123C2C",
  green: "#2F9E44",
  lime: "#B8E65C",
  ivory: "#F5F7F2",
  amber: "#F2B544",
} as const;

// Viewport coordinates on the original, unchanged 1536 × 1024 reference board.
// Using the original artwork avoids re-generating or changing the mascot identity.
export const BRAND_ART = {
  "mascot-tablet": [1094, 4, 433, 441],
  "mascot-face": [1192, 16, 306, 269],
  "mascot-wave": [35, 686, 209, 316],
  "mascot-reading": [251, 687, 188, 315],
  "mascot-celebrate": [443, 683, 208, 319],
  "mascot-alert": [650, 687, 242, 315],
  solar: [33, 466, 235, 172],
  battery: [280, 462, 225, 176],
  grid: [517, 439, 176, 199],
  construction: [706, 432, 265, 207],
  analytics: [986, 463, 242, 176],
  diesel: [1237, 460, 265, 180],
} as const;
export type BrandAsset = keyof typeof BRAND_ART;
