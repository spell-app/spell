/**
 * What a property holds, read from its declaration:  `kindOf()`, the ONE reading the checker, the schema writer,
 * the lexicon reader and the sample rows all share (see `checking.ts`).
 * - Imports only `spell/util`, never the core's own modules:
 *   the sample rows (`placeSamples.ts`) load lazily, as a chunk of their own, and what they share with
 *   `spell-runtime.js` is bundled ONCE for every copy of the runtime on the page.
 *   Through the checker they dragged `core` itself into that shared chunk, so the runner's copies shared one `core`
 *   (from-console I37:  VS Code's runner showed a console nobody wrote to any more).
 */
import type { PropInfo } from "spell/util"

/**
 * What a property holds, as the checker and the schema writer both read it from its declaration.
 * - `text`, `number`, `choice`, `date`:  a value of that kind
 * - `thing`:  a thing of `className` (or a kind of it), by reference or written whole
 * - `list`:  an array, each item of `item`'s kind
 * - `any`:  declared with no kind the checker knows:  anything goes
 * - `oneOf`:  its legal values, when they're plain values
 */
export type Kind =
  | { kind: "text" | "number" | "choice" | "date" | "any"; oneOf?: readonly unknown[] }
  | { kind: "thing"; className: string }
  | { kind: "list"; item: Kind }

/** The kinds spell's runtime names that aren't classes, by name. */
const VALUE_KINDS = new Set(["text", "number", "choice", "date"])

/**
 * What a property declared as `info` holds -- see `Kind`.
 * - A declared `itemType` makes it a list;  a capitalised `type` is a class.
 */
export function kindOf(info: PropInfo | undefined): Kind {
  if (!info) return { kind: "any" }
  if (info.itemType) return { kind: "list", item: kindOf({ type: info.itemType }) }
  const type = info.type ?? ""
  const oneOf = legalValues(info)
  if (VALUE_KINDS.has(type)) return { kind: type as "text", ...(oneOf && { oneOf }) }
  if (/^[A-Z]/.test(type)) return { kind: "thing", className: type }
  return { kind: "any", ...(oneOf && { oneOf }) }
}

/** `info`'s legal values, when they're all plain values (text, numbers, yes or no):  else `undefined`. */
function legalValues(info: PropInfo): readonly unknown[] | undefined {
  const values = typeof info.oneOf === "function" ? info.oneOf() : info.oneOf
  if (!values?.length || !values.every((it) => it === null || typeof it !== "object")) return undefined
  return values
}
