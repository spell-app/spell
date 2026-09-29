/** The four candidates:  file name under `src/`, custom element tag, and label. */
export type Candidate = { id: "today" | "module" | "mask" | "fetch"; tag: string; label: string }

/** Candidates in table order. */
export const CANDIDATES: readonly Candidate[] = [
  { id: "today", tag: "x-icon-today", label: "1. today (chunked JS)" },
  { id: "module", tag: "x-icon-module", label: "2. one ES module per icon" },
  { id: "mask", tag: "x-icon-mask", label: "3a. SVG file as CSS mask" },
  { id: "fetch", tag: "x-icon-fetch", label: "3b. SVG file, fetch + inline" }
]

/** Source file (without `.ts`) that builds each candidate. */
export const SOURCE: Record<Candidate["id"], string> = {
  today: "today",
  module: "per-module",
  mask: "svg-mask",
  fetch: "svg-fetch"
}

/** One icon of the fixed list. */
export type ListedIcon = { name: string; variant: "solid" | "regular" | "brands" }

/**
 * The 50 distinct icons every page draws (first N for N = 1, 10, 50).
 * - The first 10 already hold both kinds of oddball:  2 brands (github, apple) and 2 regular (heart, bell).
 * - Spread across the alphabet, so `today` hits many different solid chunks.
 */
export const ICONS: readonly ListedIcon[] = [
  ["house", "solid"],
  ["github", "brands"],
  ["user", "solid"],
  ["heart", "regular"],
  ["gear", "solid"],
  ["apple", "brands"],
  ["bell", "regular"],
  ["magnifying-glass", "solid"],
  ["envelope", "solid"],
  ["star", "solid"],
  ["check", "solid"],
  ["xmark", "solid"],
  ["plus", "solid"],
  ["minus", "solid"],
  ["trash", "solid"],
  ["pen", "solid"],
  ["download", "solid"],
  ["upload", "solid"],
  ["lock", "solid"],
  ["unlock", "solid"],
  ["calendar", "solid"],
  ["clock", "solid"],
  ["camera", "solid"],
  ["image", "solid"],
  ["file", "solid"],
  ["folder", "solid"],
  ["cloud", "solid"],
  ["sun", "solid"],
  ["moon", "solid"],
  ["bolt", "solid"],
  ["fire", "solid"],
  ["leaf", "solid"],
  ["key", "solid"],
  ["link", "solid"],
  ["globe", "solid"],
  ["cart-shopping", "solid"],
  ["credit-card", "solid"],
  ["chart-line", "solid"],
  ["code", "solid"],
  ["bug", "solid"],
  ["wrench", "solid"],
  ["flag", "solid"],
  ["tag", "solid"],
  ["bookmark", "solid"],
  ["phone", "solid"],
  ["music", "solid"],
  ["play", "solid"],
  ["pause", "solid"],
  ["rocket", "solid"],
  ["shield", "solid"]
].map(([name, variant]) => ({ name, variant }) as ListedIcon)
