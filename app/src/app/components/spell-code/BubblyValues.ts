/****************
 * ### `BubblyValues`
 * The bubbly look's settings as plain values, light and dark:  what VS Code draws it with (epic `language` P51),
 * as it can't load CSS.
 * - Read from the look's one sheet, `bubbly.css`:  each `--bubbly-` setting it declares, worked out in each scheme.
 * - Its colours worked out as the browser would (`light-dark()`, `color-mix()` in sRGB, `var()`), to `#rrggbb`
 *   (`#rrggbbaa` when see-through);  a size or font as written.
 * - And each part of speech's band and pill colours (`parts`), as each block works out its own from its hue.
 * - GENERATED into `bubbly.values.json`, beside the sheet:  `yarn tsx scripts/bubbly-values.ts [--check]`;
 *   its test fails while the file is stale.
 * - STATIC and instance-free:  a sheet's text in, its table out.
 ****************/
export class BubblyValues {
  /** The table of `css`, the look's sheet. */
  static of(css: string): BubblyValuesTable {
    const declared = BubblyValues.declared(css)
    const settings: BubblyValuesTable["settings"] = {}
    for (const name of declared.keys()) {
      if (PER_BLOCK.has(name)) continue
      settings[name] = { light: worked(name, "light", declared), dark: worked(name, "dark", declared) }
    }
    const parts: BubblyValuesTable["parts"] = {}
    for (const part of PARTS_OF_SPEECH) {
      const own = new Map(declared).set(HUE, `var(--bubbly-${part})`)
      parts[part] = Object.fromEntries(
        [...PER_BLOCK].map((name) => [name, { light: worked(name, "light", own), dark: worked(name, "dark", own) }])
      )
    }
    return { settings, parts }
  }

  /** Each `--bubbly-` setting `css` declares, its first value:  later ones are a nested block's own. */
  private static declared(css: string): Map<string, string> {
    const declared = new Map<string, string>()
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "")
    for (const [, name, value] of withoutComments.matchAll(/(--bubbly-[\w-]+)\s*:\s*([^;{}]+);/g))
      if (!declared.has(name!)) declared.set(name!, value!.replace(/\s+/g, " ").trim())
    return declared
  }
}

/** `BubblyValues.of()`'s table. */
export type BubblyValuesTable = {
  /** each `--bubbly-` setting, light and dark */
  settings: Record<string, SchemeValues>
  /** each part of speech's band and pill colours, which each block works out from its hue */
  parts: Record<string, Record<string, SchemeValues>>
}

/** A value in each scheme. */
export type SchemeValues = { light: string; dark: string }

/** A colour scheme. */
type Scheme = keyof SchemeValues

/** The hue each block sets. */
const HUE = "--bubbly-hue"

/** The settings each block works out from its own hue. */
const PER_BLOCK = new Set([HUE, "--bubbly-pill", "--bubbly-input"])

/** The parts of speech, each a hue of its own. */
const PARTS_OF_SPEECH = ["thing", "action", "property", "plain"]

/** Named colours the sheet uses. */
const NAMED: Record<string, RGBA> = { white: [255, 255, 255, 1], black: [0, 0, 0, 1], transparent: [0, 0, 0, 0] }

/** A colour:  red, green, blue 0-255, alpha 0-1. */
type RGBA = [number, number, number, number]

/** Setting `name` worked out in `scheme`:  a colour as hex, anything else as written. */
function worked(name: string, scheme: Scheme, declared: Map<string, string>): string {
  const value = evaluate(declared.get(name) ?? "", scheme, declared, 0)
  return Array.isArray(value) ? hex(value) : value
}

/** `text` worked out:  a colour, or the text with its `var()`s filled in. */
function evaluate(text: string, scheme: Scheme, declared: Map<string, string>, depth: number): RGBA | string {
  if (depth > 20) return text
  const value = text.trim()
  const call = /^([\w-]+)\((.*)\)$/s.exec(value)
  if (call && call[1] === "var") {
    const [name, fallback] = splitArguments(call[2]!)
    const found = declared.get(name!.trim())
    return found !== undefined
      ? evaluate(found, scheme, declared, depth + 1)
      : evaluate(fallback ?? "", scheme, declared, depth + 1)
  }
  if (call && call[1] === "light-dark") {
    const [light, dark] = splitArguments(call[2]!)
    return evaluate(scheme === "light" ? light! : dark!, scheme, declared, depth + 1)
  }
  if (call && call[1] === "color-mix") {
    const [, first, second] = splitArguments(call[2]!)
    const [colorA, shareA] = mixPart(first!, scheme, declared, depth)
    const [colorB, shareB] = mixPart(second!, scheme, declared, depth)
    if (colorA && colorB) {
      const a = shareA ?? (shareB !== undefined ? 1 - shareB : 0.5)
      const b = shareB ?? 1 - a
      return mix(colorA, a, colorB, b)
    }
    return value
  }
  if (NAMED[value]) return NAMED[value]!
  if (/^#[\da-f]{3,8}$/i.test(value)) return parseHex(value)
  // anything else (a size, a font, a `calc()`):  as written, its `var()`s filled in
  return value.replace(/var\((--[\w-]+)\)/g, (whole, name: string) => {
    const found = declared.has(name) ? evaluate(declared.get(name)!, scheme, declared, depth + 1) : whole
    return Array.isArray(found) ? hex(found) : found
  })
}

/** One side of a `color-mix()`:  its colour, and its share (0-1) when it says one. */
function mixPart(
  text: string,
  scheme: Scheme,
  declared: Map<string, string>,
  depth: number
): [RGBA | undefined, number | undefined] {
  const share = /\s(\S+)$/.exec(text.trim())
  let colorText = text.trim()
  let amount: number | undefined
  if (share) {
    const worked = evaluate(share[1]!, scheme, declared, depth + 1)
    if (typeof worked === "string" && /^[\d.]+%$/.test(worked)) {
      amount = Number.parseFloat(worked) / 100
      colorText = colorText.slice(0, share.index)
    }
  }
  const color = evaluate(colorText, scheme, declared, depth + 1)
  return [Array.isArray(color) ? color : undefined, amount]
}

/** `a` and `b` mixed in sRGB, by their shares, with premultiplied alpha as the browser does. */
function mix(a: RGBA, shareA: number, b: RGBA, shareB: number): RGBA {
  const alpha = a[3] * shareA + b[3] * shareB
  const channel = (index: number) => (alpha === 0 ? 0 : (a[index]! * a[3] * shareA + b[index]! * b[3] * shareB) / alpha)
  return [channel(0), channel(1), channel(2), alpha]
}

/** `#rgb`, `#rrggbb`, `#rrggbbaa` as a colour. */
function parseHex(text: string): RGBA {
  let digits = text.slice(1)
  if (digits.length <= 4) digits = [...digits].map((digit) => digit + digit).join("")
  const byte = (index: number) => Number.parseInt(digits.slice(index * 2, index * 2 + 2), 16)
  return [byte(0), byte(1), byte(2), digits.length === 8 ? byte(3) / 255 : 1]
}

/** A colour as `#rrggbb`, or `#rrggbbaa` when see-through. */
function hex([red, green, blue, alpha]: RGBA): string {
  const two = (value: number) =>
    Math.round(Math.min(255, Math.max(0, value)))
      .toString(16)
      .padStart(2, "0")
  return `#${two(red)}${two(green)}${two(blue)}${alpha < 1 ? two(alpha * 255) : ""}`
}

/** A function's arguments, split at its top-level commas. */
function splitArguments(text: string): string[] {
  const parts: string[] = []
  let depth = 0
  let from = 0
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === "(") depth++
    else if (char === ")") depth--
    else if (char === "," && depth === 0) {
      parts.push(text.slice(from, index).trim())
      from = index + 1
    }
  }
  parts.push(text.slice(from).trim())
  return parts
}
