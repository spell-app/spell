/**
 * How a kept value is written as text, read back, defaulted and checked:  `PrefStore`'s, and spell properties' defaults.
 * - Text people and plain scripts can read:  a string as itself (`dark`), anything else as JSON (`1`, `true`,
 *   `{"open":true}`).
 */
import type { ValueInfo } from "./persist.types"

////////////////
// ## Text
////////////////

/**
 * Text that reads back as JSON:  it starts with a quote, a brace or a bracket, or it's a number, `true`, `false` or
 * `null`, whole.
 * - A JSON number exactly:  `007` and `1.` are text.
 */
const JSON_TEXT = /^(?:["{[]|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$|true$|false$|null$)/

/**
 * `value` as kept text:  a string as itself, unless it would read back as something else;  anything else as JSON.
 * - e.g. `"dark"` => `dark`;  `"1"` => `"1"` (quoted);  `1` => `1`;  `{ open: true }` => `{"open":true}`
 * - throws `TypeError` for a value JSON can't keep:  a function, a symbol, `undefined`, a cycle
 */
export function textForValue(value: unknown): string {
  if (typeof value === "string" && !JSON_TEXT.test(value)) return value
  const text = JSON.stringify(value) as string | undefined
  if (text === undefined) throw new TypeError(`textForValue():  can't keep a ${typeof value} as text;  pass plain data`)
  return text
}

/**
 * The value kept as `text`:  JSON when it looks like it (see `textForValue()`), else the text itself.
 * - throws `SyntaxError` for text that starts like JSON but isn't (`{oops`), as `JSON.parse()` does
 */
export function valueForText(text: string): unknown {
  return JSON_TEXT.test(text) ? JSON.parse(text) : text
}

////////////////
// ## Defaults and checks
////////////////

/** Each type's default, for a declaration that names no default and no choices. */
const TYPE_DEFAULTS = new Map<string, unknown>([
  ["number", 0],
  ["text", ""],
  ["choice", false]
])

/** The JavaScript `typeof` for each type Spell's runtime names. */
const JS_TYPES = new Map<string, string>([
  ["number", "number"],
  ["text", "string"],
  ["choice", "boolean"]
])

/**
 * The default `info` declares:  its `default`, else its first choice, else its type's, else `undefined`.
 * - The types':  `number` 0, `text` "", `choice` false.
 * - e.g. `{ oneOf: ["light", "dark", "auto"] }` => `"light"`;  `{ type: "number" }` => `0`
 */
export function defaultFor(info: ValueInfo | undefined): unknown {
  if (!info) return undefined
  if (info.default !== undefined) return info.default
  const choices = choicesOf(info)
  if (choices?.length) return choices[0]
  return info.type === undefined ? undefined : TYPE_DEFAULTS.get(info.type)
}

/**
 * Is `value` one `info` allows:  one of its choices, and of its type?
 * - No declaration, or a type we don't know (a class's name):  anything is.
 */
export function isAllowed(info: ValueInfo | undefined, value: unknown): boolean {
  if (!info) return true
  const choices = choicesOf(info)
  if (choices && !choices.includes(value)) return false
  const jsType = info.type === undefined ? undefined : JS_TYPES.get(info.type)
  return jsType === undefined || typeof value === jsType
}

/** `info`'s choices, read now (`oneOf` may be a function), or `undefined` for none. */
export function choicesOf(info: ValueInfo): readonly unknown[] | undefined {
  return typeof info.oneOf === "function" ? info.oneOf() : info.oneOf
}
