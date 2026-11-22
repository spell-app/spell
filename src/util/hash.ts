/**
 * Hashes of text, the same in a page and in node, and synchronous:  what names a drawing in both
 * (the page server's `SRV.Drawings`, Spell UI's `GivenDrawings`;  epic `solid-2-final` P15).
 * - Imports nothing:  plain `node` loads it too.
 * - NOT in Spell UI's util barrel (`spell/ui/util`):  there it would be in every page's `core`;
 *   the drawings code imports it by file.
 */

/**
 * A hash of `text`, as 32 lowercase hex letters:  four rounds of FNV-1a, each its own seed and prime.
 * - Synchronous, unlike `crypto.subtle`.
 * - Not for security, only for naming text.
 */
export function textHash(text: string): string {
  const rounds = [0x811c9dc5, 0x9747b28c, 0x2f8a1c3d, 0x6b43a9b5]
  for (let at = 0; at < text.length; at++) {
    const code = text.charCodeAt(at)
    rounds[0] = Math.imul(rounds[0]! ^ code, 0x01000193)
    rounds[1] = Math.imul(rounds[1]! ^ code, 0x5bd1e995)
    rounds[2] = Math.imul(rounds[2]! ^ code, 0x27d4eb2f)
    rounds[3] = Math.imul(rounds[3]! ^ code, 0x165667b1)
  }
  return rounds.map((round) => (round >>> 0).toString(16).padStart(8, "0")).join("")
}

/**
 * A hash of `value`, any JSON value, its objects' keys in order (`textHash()`):
 * `{ a, b }` and `{ b, a }` hash alike, so two places building the same settings needn't build them in one order.
 */
export function stableHash(value: unknown): string {
  return textHash(JSON.stringify(value, (_key, each: unknown) => sortedKeys(each)))
}

/** `value` with its keys in order, when it's a plain object;  anything else as it is. */
function sortedKeys(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return Object.fromEntries(entries)
}
