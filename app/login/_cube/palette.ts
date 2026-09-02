// Sticker palette for the Core Engine cube.
//
// The six required face colours, tuned away from a toy cube: slightly
// desaturated, deeper, with a hint of warmth so they read as anodised panels
// rather than plastic stickers under the scene lighting.

export const FACE_COLORS = {
  px: "#c23b34", // right  — red
  nx: "#d1791f", // left   — orange
  py: "#e9eaee", // up     — white
  ny: "#d8b12b", // down   — yellow
  pz: "#2f62d8", // front  — blue
  nz: "#1f9d5b", // back   — green
} as const;

export type FaceKey = keyof typeof FACE_COLORS;

/** Dark anodised body of every cubie. */
export const BODY_COLOR = "#08090c";

/** Core Engine brand teal — used for ambient light and the solved glow. */
export const ACCENT = "#5eead4";

/** Red used for the failed-authentication pulse. */
export const DENY = "#ff5468";

export const STICKER_EMISSIVE_IDLE = 0.05;
export const STICKER_EMISSIVE_SOLVED = 0.36;
