// Brand tokens + status colors, ported from reference/ContentTracker.jsx.
import type { Brand } from "./types";

/* ---------------------------- color helpers ---------------------------- */
const hx = (h: string): number[] => {
  h = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const mix = (a: string, b: string, t: number): string => {
  const A = hx(a);
  const B = hx(b);
  return (
    "#" +
    A.map((v, i) =>
      Math.round(v + (B[i] - v) * t)
        .toString(16)
        .padStart(2, "0")
    ).join("")
  );
};

/** Light fill derived from a brand's dot color. */
export const tintOf = (dot: string): string => mix(dot, "#ffffff", 0.86);
/** Readable text color derived from a brand's dot color. */
export const textOf = (dot: string): string => mix(dot, "#000000", 0.5);

/**
 * Two-stop [light, dark] gradient derived from a brand's dot. Single-sourced
 * from `dot` (no invented palette) — Vivid theme only. Tuned subtle so launch
 * fills read as the brand color, not a rainbow.
 */
export const gradOf = (dot: string): [string, string] => [
  mix(dot, "#ffffff", 0.18),
  mix(dot, "#000000", 0.22),
];

/** The brand color at an arbitrary alpha (rgba) — faint surfaces, glows. */
export const tint = (hex: string, a: number): string => {
  const [r, g, b] = hx(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/** CSS `linear-gradient(...)` string from a brand's `grad` stops. */
export const gradCss = (grad: [string, string]): string =>
  `linear-gradient(135deg, ${grad[0]} 0%, ${grad[1]} 100%)`;

/* ------------------------------- brands -------------------------------- */
const BASE_BRANDS: Pick<Brand, "id" | "label" | "dot">[] = [
  { id: "wenger", label: "Wenger", dot: "#1C3B66" },
  { id: "jrclancy", label: "JRClancy", dot: "#2E6B3E" },
  { id: "gearboss", label: "GearBoss", dot: "#B22234" },
  { id: "cc", label: "Creative Conners", dot: "#E0721F" },
  { id: "txscenic", label: "Texas Scenic", dot: "#3E5871" },
  { id: "lutefish", label: "Lutefish", dot: "#0E7C86" },
  { id: "corp", label: "Corporate", dot: "#4A5568" },
];

export const BRANDS: Brand[] = BASE_BRANDS.map((b) => ({
  ...b,
  tint: tintOf(b.dot),
  text: textOf(b.dot),
  grad: gradOf(b.dot),
}));

export const brandById = (id: string): Brand | undefined =>
  BRANDS.find((b) => b.id === id);

/* ---------------------------- status colors ---------------------------- */
export type StatusColor = { bg: string; fg: string };

export const STATUS: Record<string, StatusColor> = {
  "In flight": { bg: "#E9F0F9", fg: "#14305C" },
  "Launching soon": { bg: "#FBEFD6", fg: "#8A5A0B" },
  "On track": { bg: "#E7F1E6", fg: "#1E4A28" },
  "In review": { bg: "#EEEDFB", fg: "#3C3489" },
  Planning: { bg: "#EEEEEA", fg: "#5F5E5A" },
  Complete: { bg: "#EEEEEA", fg: "#5F5E5A" },
};

export const STATUS_OPTS = Object.keys(STATUS);

// Quick-pick swatches for the brand modal (ported from the prototype).
export const SWATCHES = [
  "#1C3B66",
  "#2E6B3E",
  "#B22234",
  "#E0721F",
  "#3E5871",
  "#4A5568",
  "#6B3FA0",
  "#0E7C86",
  "#A8326E",
];
