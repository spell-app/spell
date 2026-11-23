import type { SkeletonSpec } from "spell/element/vocabulary.types"

/**
 * The looks of what waits, as words:  what `loading="..."` says, on a `<for>`, an element or a site.
 * - Solid-free:  the compiler reads them too (`lookOfWords()`), and `waiting.ts` draws them.
 * - Part of `core`.
 */

/**
 * How what waits looks meanwhile:  `core.drawLooking()`'s, a site's (`SiteBase`), or a `<for loading>`'s.
 * - `look`:  a spinner (the default), a skeleton of `<ui-placeholder>` shapes roughly like what's coming, or nothing.
 * - `text`:  what a spinner says, and what a skeleton announces.
 * - `skeleton`:  a skeleton's own shape, `skeleton: header, 3 line paragraph` (`SkeletonText`'s words, parsed as it
 *   compiles), or the element's own (its vocabulary's `skeleton`);  none, the shape of what's coming (`WaitingShape`).
 * - `own`:  the element whose own loading state stands in for a spinner (`core.drawLooking()`'s `ownsState`).
 */
export type WaitingLook = {
  look: "spinner" | "skeleton" | "none"
  text?: string
  skeleton?: SkeletonSpec
  own?: {
    readonly hasSlots: boolean
    hold(drawing?: () => unknown): void
    fail(words: string, drawing?: () => unknown): void
  }
  /** Its element's `<loading>` and `<failed>` (`core.drawLooking()`'s `riders`). */
  riders?: {
    waiting?: () => unknown
    failed?: (error: string) => unknown
    slots?: boolean
  }
}

/** The look words, in each language a program is written in:  any other text is a spinner's words. */
const LOOKS: Readonly<Record<string, WaitingLook["look"]>> = {
  spinner: "spinner",
  skeleton: "skeleton",
  none: "none",
  cargador: "spinner",
  esqueleto: "skeleton",
  nada: "none"
}

/**
 * `said` as a look:  one of `LOOKS`' words, else a spinner saying it;  `""`, a plain spinner.
 * - A skeleton with its own shape comes compiled (`lookCompiled()`):  `{"look":"skeleton","skeleton":{...}}`.
 *   A page never parses skeleton text:  `skeleton: ...` said any other way is a skeleton of what's coming.
 */
export function lookSaid(said: unknown): WaitingLook {
  const text = typeof said === "string" ? said : typeof said === "number" ? `${said}` : ""
  if (text.startsWith(COMPILED_LOOK)) return JSON.parse(text) as WaitingLook
  const colon = text.indexOf(":")
  const head = (colon === -1 ? text : text.slice(0, colon)).trim()
  const look = Object.hasOwn(LOOKS, head) ? LOOKS[head] : undefined
  if (look && (colon === -1 || look === "skeleton")) return { look }
  return text ? { look: "spinner", text } : { look: "spinner" }
}

/** How a compiled look starts:  see `lookSaid()`. */
const COMPILED_LOOK = '{"look":'

/**
 * `look` as Spell compiles it, for `lookSaid()`:  `{"look":"skeleton","skeleton":{...}}`.
 * - The compiler parses a skeleton's words with `SkeletonText`, so a page never does.
 */
export function lookCompiled(look: WaitingLook): string {
  return JSON.stringify(look)
}

/**
 * `said`, an element's or a `<for>`'s `loading`, as it compiles:  a skeleton's shape parsed (`parseSkeleton`, the
 * kit's `SkeletonText.parse()`), else `tagSkeleton`, the element's own, for a bare `skeleton`;  any other words as they are.
 * - `skeleton: header, 3 line paragraph` => `{"look":"skeleton","skeleton":{"parts":[...]}}` (`lookCompiled()`).
 * - throws what `parseSkeleton` throws, for words that aren't a skeleton
 */
export function lookOfWords(
  said: string,
  parseSkeleton: (text: string) => SkeletonSpec,
  tagSkeleton?: SkeletonSpec
): string {
  const colon = said.indexOf(":")
  const head = (colon === -1 ? said : said.slice(0, colon)).trim()
  if (!Object.hasOwn(LOOKS, head) || LOOKS[head] !== "skeleton") return said
  if (colon !== -1) return lookCompiled({ look: "skeleton", skeleton: parseSkeleton(said.slice(colon + 1)) })
  return tagSkeleton ? lookCompiled({ look: "skeleton", skeleton: tagSkeleton }) : said
}
