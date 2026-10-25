/**
 * What `<ui-emoji>`'s data and the script that writes it share.
 * - Plain data and pure functions, no imports:  node loads it (`scripts/gen-emoji.ts`), and so does the page
 *   (`EmojiData`).
 */

/**
 * Chunk key of a NORMALIZED emoji name (`EmojiData.normalize()`):  its first letter, else `0`.
 * - ONE rule for both sides:  `yarn gen:emoji` writes each chunk, `data/<set>/<key>.json`, and `EmojiData` loads the
 *   chunk a name is in.
 * - e.g. `smile` => `s`, `100` => `0`, `8ball` => `0`
 */
export function emojiChunkFor(name: string): string {
  const first = name[0] ?? ""
  return LETTER.test(first) ? first : DIGIT_CHUNK
}

/** A chunk letter. */
const LETTER = /^[a-z]$/

/** Chunk of names starting with anything but a letter. */
const DIGIT_CHUNK = "0"
