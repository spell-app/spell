import { fileURLToPath } from "node:url"

import { VocabularyFiles } from "spell/element-tools/VocabularyFiles"
import type { AttributeSpec, ComponentVocabulary } from "spell/element/vocabulary.types"
import { SharedVocabulary } from "spell/ui/vocabulary"

/****************
 * ### `OldNames`
 * Rewrites the OLD attribute names Spell UI's tags still read (`AttributeSpec.replaces`) into their new ones, in a
 * page's text:  `<ui-button primary basic>` => `<ui-button color="primary" appearance="basic">` (epic `ui-gaps` P6).
 * - What `spell ui rename` runs, over HTML pages, Markdown, and the JSX and template strings in code.
 * - The old names come from the vocabularies themselves (`load()`), so it keeps no list of its own:
 *   a vocabulary that declares one more `replaces` teaches it one more rename.
 * - Tag by tag, attribute by attribute:  the rest of the text is left byte for byte.
 *   - written as markup (`<ui-button primary>`) and as escaped markup in a code sample (`&lt;ui-button primary&gt;`)
 *   - an old switch becomes its value (`primary` => `color="primary"`);  on an attribute of several words
 *     (`appearance`), each switch adds its word to the one attribute
 *   - written with the new name too, the new one wins, as in the browser:  the old one is dropped
 *   - a value it can't see (a JSX expression, `basic={x}`) is listed for a person, never guessed
 * - Three renames no vocabulary can say, made here:
 *   - the breadcrumb tags (epic `ui-gaps` P5):  only on a page that still writes `<ui-breadcrumb-section>`,
 *     since the old box's name is now the step's
 *   - a renamed tag (`RENAMED_TAGS`):  `<ui-docs-themes>` => `<ui-theme-menu>` (epic `debut` P17),
 *     `<ui-docs-toc>` => `<ui-toc>`, `<ui-docs-example>` => `<ui-example>` (epic `ui-gaps` P14),
 *     wherever the tag's name is written (markup, CSS selectors, its `--ui-docs-themes-*` tokens, query strings),
 *     dropping the attributes the new tag no longer takes (`for`)
 *   - the button's old `label` (a joined badge) is `badge`, where the same button still writes `content`
 *     (the old text);  a `label` alone could be either, so it's listed for a person (judgement call J21)
 * - Node only:  it imports every vocabulary, as `yarn site:data` does.
 * - spell ui rename: leave this file (its examples are the old names)
 ****************/
export class OldNames {
  /** Every tag's old names, by tag, then by old name. */
  readonly rules: ReadonlyMap<string, ReadonlyMap<string, OldNameRule>>

  constructor(vocabularies: readonly ComponentVocabulary[]) {
    const rules = new Map<string, Map<string, OldNameRule>>()
    for (const vocabulary of vocabularies) {
      const byOldName = new Map<string, OldNameRule>()
      const specs = SharedVocabulary.attributesFor(vocabulary)
      const current = new Set(specs.map(({ name }) => name))
      for (const spec of specs) {
        for (const old of spec.replaces ?? []) {
          const rule = OldNames.ruleFor(spec, old, current)
          // a key of today, written bare, is today's (`<ui-property-editor compact>`), never a word its section once took
          if (specs.some(({ name, kind }) => name === rule.from && kind === "keyOnly")) continue
          byOldName.set(rule.from, rule)
        }
      }
      if (byOldName.size) rules.set(vocabulary.tag, byOldName)
    }
    this.rules = rules
  }

  /** Every Spell UI vocabulary's old names (its `src/components/`). */
  static async load(): Promise<OldNames> {
    const families = await VocabularyFiles.read(COMPONENTS_FOLDER)
    return new OldNames(families.map(({ vocabulary }) => vocabulary))
  }

  ////////////////
  // ## Rewriting
  ////////////////

  /**
   * `text` with every old name rewritten, and what changed.
   * - `renames`:  one line per rewrite, `<ui-button> primary => color="primary"`
   * - `manual`:  what it left for a person, and why
   * - `markupOnly`:  only tags a browser draws, never escaped markup (`&lt;ui-button primary&gt;`):  for a page that
   *   QUOTES old names on purpose, a record of what was decided, say;  no breadcrumb swap, which can't tell a quoted
   *   tag from a drawn one;  a renamed tag only where it's drawn (`renameDrawnTags()`)
   */
  rewrite(text: string, { markupOnly = false }: OldNamesOptions = {}): OldNamesResult {
    const renames: string[] = []
    const manual: string[] = []
    let rewritten = OLD_BREADCRUMB_STEP.test(text) && !markupOnly ? OldNames.swapBreadcrumbs(text, renames) : text
    rewritten = markupOnly ? OldNames.renameDrawnTags(rewritten, renames) : OldNames.renameTags(rewritten, renames)
    const quoted = OldNames.quotedValues(rewritten)
    rewritten = rewritten.replace(
      START_TAG,
      (whole, open: string, tag: string, attributes: string, close: string, at: number) => {
        // a tag QUOTED in another tag's attribute (a title naming markup) is text, not a tag:  left as it is
        if (quoted.some(([start, end]) => at >= start && at < end)) return whole
        const escaped = open === ESCAPED_OPEN
        if (escaped && markupOnly) return whole
        const parsed = OldNames.parse(escaped ? attributes.replaceAll(ESCAPED_QUOTE, '"') : attributes)
        if (!parsed) return whole
        const changed = this.rewriteTag(tag, parsed.attributes, renames, manual)
        if (!changed) return whole
        const text = OldNames.unparse(parsed)
        return `${open}${tag}${escaped ? text.replaceAll('"', ESCAPED_QUOTE) : text}${close}`
      }
    )
    this.unreadTags(rewritten, markupOnly, manual)
    return { text: rewritten, renames, manual }
  }

  /**
   * Where `text`'s quoted attribute values are, as `[start, end)` offsets:  markup written INSIDE one
   * (`title="the tabs are <ui-tabs basic>"`) is text, and a rewrite there would add raw `"` that ends the value.
   * - Static:  pure, of the text alone.
   */
  private static quotedValues(text: string): [number, number][] {
    const ranges: [number, number][] = []
    for (const tag of text.matchAll(ANY_START_TAG)) {
      const head = tag[0]
      for (const value of head.matchAll(QUOTED_VALUE)) {
        const quote = value[1]!
        const start = tag.index + value.index + value[0].indexOf(quote) + 1
        ranges.push([start, start + quote.length - 2])
      }
    }
    return ranges
  }

  /**
   * The tags it couldn't read (a JSX handler with braces inside, `onClick={() => f({ a })}`) that still name an old
   * one:  listed for a person, as `manual`.
   */
  private unreadTags(text: string, markupOnly: boolean, manual: string[]) {
    for (const match of text.matchAll(ANY_TAG_START)) {
      const [, open, tag] = match
      if (markupOnly && open === ESCAPED_OPEN) continue
      const rules = this.rules.get(tag!)
      if (!rules) continue
      const start = match.index!
      START_TAG.lastIndex = start
      const read = START_TAG.exec(text)
      if (read?.index === start) continue
      const head = text.slice(start, start + UNREAD_TAG_LENGTH)
      const names = [...head.matchAll(ATTRIBUTE_NAME)].map(([, name]) => name!)
      const old = names.filter((name) => rules.has(name) && !rules.get(name)!.shadowed)
      if (old.length) manual.push(`<${tag}> it couldn't read, naming ${old.join(", ")}:  by hand`)
    }
  }

  /** Rewrite `attributes`, one tag's, in place;  `true` when anything changed. */
  private rewriteTag(tag: string, attributes: TagAttribute[], renames: string[], manual: string[]): boolean {
    let changed = tag === BUTTON && OldNames.oldButtonLabel(attributes, renames, manual)
    const rules = this.rules.get(tag)
    if (!rules) return changed
    for (const attribute of [...attributes]) {
      const rule = rules.get(attribute.name)
      if (!rule) continue
      if (attribute.value?.expression) {
        manual.push(`<${tag} ${attribute.name}={...}>:  ${OldNames.target(rule)}, by hand`)
        continue
      }
      const current = attributes.find((each) => each.name === rule.attribute)
      changed = true
      if (rule.value === undefined && !rule.values) {
        // a plain old name:  the same value under its new name;  written with both, the new one wins
        if (current) OldNames.remove(attributes, attribute)
        else attribute.name = rule.attribute
        renames.push(`<${tag}> ${rule.from} => ${rule.attribute}`)
        continue
      }
      const text = attribute.value?.text ?? ""
      // an old switch that shares its name with an attribute of today's (`link`, the old look and the new link):
      // only written bare is it the old one
      if (rule.shadowed && !BARE_WORDS.has(text.trim().toLowerCase())) continue
      const at = attributes.indexOf(attribute)
      OldNames.remove(attributes, attribute)
      if (FALSE_WORDS.has(text.trim().toLowerCase())) {
        renames.push(`<${tag}> ${rule.from}="${text}" dropped (off)`)
        continue
      }
      const word = OldNames.newWord(rule, text)
      if (rule.multiple && current?.value && !current.value.expression) {
        const words = new Set(current.value.text.split(/\s+/).filter(Boolean))
        words.add(word)
        current.value.text = [...words].join(" ")
      } else if (!current) {
        attributes.splice(at, 0, {
          space: attribute.space,
          name: rule.attribute,
          value: { text: word, quote: '"' }
        })
      }
      renames.push(`<${tag}> ${rule.from}${text ? `="${text}"` : ""} => ${rule.attribute}="${word}"`)
    }
    return changed
  }

  ////////////////
  // ## Statics
  ////////////////

  /** One `replaces` entry of `spec`, as a rule. */
  private static ruleFor(
    spec: AttributeSpec,
    old: NonNullable<AttributeSpec["replaces"]>[number],
    current: ReadonlySet<string>
  ): OldNameRule {
    const multiple = spec.kind === "multiple"
    if (typeof old === "string") return { from: old, attribute: spec.name, multiple, shadowed: false }
    const shadowed = current.has(old.from)
    return { from: old.from, attribute: spec.name, value: old.value, values: old.values, multiple, shadowed }
  }

  /** The new value an old switch's `text` stands for:  `values[text]`, its bare `value`, else the text itself. */
  private static newWord(rule: OldNameRule, text: string): string {
    const trimmed = text.trim()
    return rule.values?.[trimmed] ?? (BARE_WORDS.has(trimmed.toLowerCase()) ? (rule.value ?? trimmed) : trimmed)
  }

  /** What a rule writes, for a person's list:  `color="primary"`, or `link`. */
  private static target(rule: OldNameRule): string {
    return rule.value === undefined ? rule.attribute : `${rule.attribute}="${rule.value}"`
  }

  /**
   * The button's old `label` (a joined badge, `badge` now), where the button still writes its old `content`
   * (its text, `label` now):  both renamed;  a `label` alone is listed for a person.
   */
  private static oldButtonLabel(attributes: TagAttribute[], renames: string[], manual: string[]): boolean {
    const label = attributes.find((each) => each.name === LABEL)
    const content = attributes.find((each) => each.name === CONTENT)
    if (!label || attributes.some((each) => each.name === BADGE)) return false
    if (!content) {
      manual.push(`<ui-button label>:  a badge (badge=) or its text (label=)?  check by hand`)
      return false
    }
    label.name = BADGE
    content.name = LABEL
    renames.push(`<ui-button> label => badge, content => label`)
    return true
  }

  /** The two breadcrumb tags, swapped:  `<ui-breadcrumb>` => `<ui-breadcrumbs>`, then its sections => steps. */
  private static swapBreadcrumbs(text: string, renames: string[]): string {
    renames.push(`<ui-breadcrumb> => <ui-breadcrumbs>;  <ui-breadcrumb-section> => <ui-breadcrumb>`)
    return text
      .replace(BREADCRUMB_BOX, (_whole, open: string) => `${open}${BREADCRUMB_PLACEHOLDER}`)
      .replace(BREADCRUMB_STEP, (_whole, open: string) => `${open}ui-breadcrumb`)
      .replaceAll(BREADCRUMB_PLACEHOLDER, "ui-breadcrumbs")
  }

  /**
   * Every renamed tag (`RENAMED_TAGS`) under its new name, wherever its name is written:
   * - its start tags first, as markup or escaped, without the attributes it no longer takes
   * - then every other mention:  end tags, CSS selectors, its tokens (`--ui-docs-themes-gap`), quoted names
   * - never a path (`docs-components/ui-docs-themes/`):  its family's files moved and were renamed, by hand
   */
  private static renameTags(text: string, renames: string[]): string {
    let rewritten = text
    for (const [old, { tag, dropped }] of Object.entries(RENAMED_TAGS)) {
      const mention = new RegExp(`(?<![A-Za-z0-9.]|[\\w-]/)${old}(?![A-Za-z0-9/])`, "g")
      if (!mention.test(rewritten)) continue
      renames.push(`<${old}> => <${tag}>`)
      rewritten = rewritten.replace(
        START_TAG,
        (whole, open: string, name: string, attributes: string, close: string) => {
          if (name !== old) return whole
          const escaped = open === ESCAPED_OPEN
          const parsed = OldNames.parse(escaped ? attributes.replaceAll(ESCAPED_QUOTE, '"') : attributes)
          if (!parsed) return whole
          const kept = parsed.attributes.filter((attribute) => !dropped.includes(attribute.name))
          if (kept.length < parsed.attributes.length) renames.push(`<${tag}> ${dropped.join(", ")} dropped`)
          const text = OldNames.unparse({ attributes: kept, trailing: parsed.trailing })
          return `${open}${name}${escaped ? text.replaceAll('"', ESCAPED_QUOTE) : text}${close}`
        }
      )
      rewritten = rewritten.replace(mention, tag)
    }
    return rewritten
  }

  /**
   * Every renamed tag (`RENAMED_TAGS`) under its new name, only where a browser DRAWS it (`markupOnly`):
   * its start and end tags written as markup, `<ui-docs-example ...>` and `</ui-docs-example>`.
   * - Left as written:  escaped markup (`&lt;ui-docs-example&gt;`), a tag quoted in an attribute's value, a Markdown
   *   code span or fence, and every other mention (a selector, a token, a path):  a page's record of what was decided.
   * - Why (epic `ui-gaps` P14):  the epic folder's epic pages and details pages draw live examples
   *   among the record, and an old tag draws nothing.
   */
  private static renameDrawnTags(text: string, renames: string[]): string {
    let rewritten = text
    for (const [old, { tag, dropped }] of Object.entries(RENAMED_TAGS)) {
      // offsets of THIS text:  a rename before changed its length
      const quoted = [...OldNames.quotedValues(rewritten), ...OldNames.codeSpans(rewritten)]
      const isQuoted = (at: number) => quoted.some(([start, end]) => at >= start && at < end)
      const drawn = new RegExp(`<(/?)${old}(?=[\\s>/])`, "g")
      let count = 0
      rewritten = rewritten.replace(drawn, (whole, slash: string, at: number) => {
        if (isQuoted(at)) return whole
        count++
        return `<${slash}${tag}`
      })
      if (!count) continue
      renames.push(`<${old}> => <${tag}>`)
      if (dropped.length) {
        rewritten = rewritten.replace(
          START_TAG,
          (whole, open: string, name: string, attributes: string, close: string) => {
            if (name !== tag || open === ESCAPED_OPEN) return whole
            const parsed = OldNames.parse(attributes)
            if (!parsed) return whole
            const kept = parsed.attributes.filter((attribute) => !dropped.includes(attribute.name))
            if (kept.length === parsed.attributes.length) return whole
            renames.push(`<${tag}> ${dropped.join(", ")} dropped`)
            return `${open}${name}${OldNames.unparse({ attributes: kept, trailing: parsed.trailing })}${close}`
          }
        )
      }
    }
    return rewritten
  }

  /**
   * Where `text`'s Markdown code is, as `[start, end)` offsets:  its fenced blocks (```` ``` ````) and its inline
   * spans (`` `x` ``, on one line).
   * - Static:  pure, of the text alone.
   */
  private static codeSpans(text: string): [number, number][] {
    const ranges: [number, number][] = []
    for (const fence of text.matchAll(CODE_FENCE)) ranges.push([fence.index, fence.index + fence[0].length])
    for (const span of text.matchAll(CODE_SPAN)) ranges.push([span.index, span.index + span[0].length])
    return ranges
  }

  /**
   * A tag's attribute text as attributes, each keeping the space before it;  `undefined` when it isn't plain
   * attributes (a JSX spread, `{...props}`):  such a tag is left as it is.
   */
  private static parse(text: string): ParsedTag | undefined {
    const attributes: TagAttribute[] = []
    let rest = text
    while (rest.trim()) {
      const match = ATTRIBUTE.exec(rest)
      if (!match) return undefined
      const [whole, space, name, , quoted, single, expression, bare] = match
      const value =
        quoted !== undefined
          ? { text: quoted, quote: '"' }
          : single !== undefined
            ? { text: single, quote: "'" }
            : expression !== undefined
              ? { text: expression, quote: "", expression: true }
              : bare !== undefined
                ? { text: bare, quote: "" }
                : undefined
      attributes.push({ space: space ?? " ", name: name!, value })
      rest = rest.slice(whole.length)
    }
    return { attributes, trailing: rest }
  }

  /** `attributes` back as text, the inverse of `parse()`. */
  private static unparse({ attributes, trailing }: ParsedTag): string {
    const parts = attributes.map(({ space, name, value }) => {
      if (!value) return `${space}${name}`
      if (value.expression) return `${space}${name}={${value.text}}`
      return `${space}${name}=${value.quote}${value.text}${value.quote}`
    })
    return parts.join("") + trailing
  }

  /** Take `attribute` out of `attributes`, in place. */
  private static remove(attributes: TagAttribute[], attribute: TagAttribute) {
    const index = attributes.indexOf(attribute)
    if (index >= 0) attributes.splice(index, 1)
  }
}

/** Spell UI's family folders, where the vocabularies are. */
const COMPONENTS_FOLDER = fileURLToPath(new URL("../components", import.meta.url))

/**
 * A `ui-*` start tag, as markup or as escaped markup in a code sample:
 * its opening (`<` or `&lt;`), its name, its attribute text, its end (`>`, `/>`, `&gt;`).
 */
const START_TAG =
  /(<|&lt;)(ui-[a-z][a-z0-9-]*)((?:\s+[^\s=>&/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|\{[^{}]*\}|&quot;.*?&quot;|[^\s"'>&]+))?)*\s*)(\/?>|\/?&gt;)/g

/** Any element's start tag, its quoted attribute values whole (so a `>` inside one doesn't end it). */
const ANY_START_TAG = /<[a-zA-Z][\w:-]*(?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*\s*\/?>/g

/** A quoted attribute value, its quotes included. */
const QUOTED_VALUE = /=\s*("[^"]*"|'[^']*')/g

/** Where any `ui-*` tag starts, read or not. */
const ANY_TAG_START = /(<|&lt;)(ui-[a-z][a-z0-9-]*)(?=[\s>/&])/g

/** How much of an unread tag it looks through for old names. */
const UNREAD_TAG_LENGTH = 400

/** An attribute's name, in an unread tag's text:  ` basic=` or ` basic` on its own. */
const ATTRIBUTE_NAME = /\s([a-z][a-z0-9-]*)(?==|\s|>)/g

/** One attribute at the start of a tag's attribute text:  its space, name, and value (quoted, `{...}` or bare). */
const ATTRIBUTE = /^(\s+)([^\s=>/]+)(\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^{}]*)\}|([^\s"'>]+)))?/

/** Escaped markup's `<`. */
const ESCAPED_OPEN = "&lt;"

/** Escaped markup's `"`. */
const ESCAPED_QUOTE = "&quot;"

/** An old switch written this way is on, bare:  `basic`, `basic=""`, `basic="true"`. */
const BARE_WORDS = new Set(["", "true", "yes"])

/** An old switch written this way is off. */
const FALSE_WORDS = new Set(["false", "no", "0"])

/** The button, whose old `label` is `badge` now. */
const BUTTON = "ui-button"

/** The button's attributes in that rename. */
const LABEL = "label"
const CONTENT = "content"
const BADGE = "badge"

/** A page still writing the old breadcrumb step. */
const OLD_BREADCRUMB_STEP = /(?:<|&lt;)\/?ui-breadcrumb-section\b/

/** The old breadcrumb box's tag name, open or close, as markup or escaped. */
const BREADCRUMB_BOX = /(<\/?|&lt;\/?)ui-breadcrumb(?=[\s>/&])/g

/** The old breadcrumb step's tag name. */
const BREADCRUMB_STEP = /(<\/?|&lt;\/?)ui-breadcrumb-section(?=[\s>/&])/g

/** Holds the box's new name while the step takes its old one. */
const BREADCRUMB_PLACEHOLDER = "\u0001breadcrumbs"

/**
 * Tags renamed:  old tag => its new name, and the attributes it no longer takes.
 * - `<ui-docs-themes>`, the docs site's widget, became the real element `<ui-theme-menu>` (epic `debut` P17);
 *   its `for` (a family's themes, Fomantic's per-page filter) went with Fomantic's themes.
 * - `<ui-docs-toc>` and `<ui-docs-example>` became the real elements `<ui-toc>` and `<ui-example>` (epic `ui-gaps`
 *   P14);  each keeps every attribute, and its old `header` is `heading` (their vocabularies' `replaces`).
 * - The old names stay here only so a page another branch adds is rewritten once it merges:  out once those have.
 */
const RENAMED_TAGS: Readonly<Record<string, RenamedTag>> = {
  "ui-docs-themes": { tag: "ui-theme-menu", dropped: ["for"] },
  "ui-docs-toc": { tag: "ui-toc", dropped: [] },
  "ui-docs-example": { tag: "ui-example", dropped: [] }
}

/** A Markdown fenced code block, its fences included. */
const CODE_FENCE = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm

/** A Markdown code span on one line, its backticks included. */
const CODE_SPAN = /`[^`\n]+`/g

/** One old name of one tag, and what it becomes. */
export type OldNameRule = {
  /** the old name:  `primary` */
  readonly from: string
  /** the attribute it is now:  `color` */
  readonly attribute: string
  /** what it stands for written bare:  `primary` (an old switch) */
  readonly value?: string
  /** old text => new value:  `{ very: "very-basic" }` */
  readonly values?: Readonly<Record<string, string>>
  /** the new attribute takes several words (`appearance`):  each switch adds its own */
  readonly multiple: boolean
  /**
   * the old switch's name is an attribute of today's too (`link`:  the old "looks clickable" look, and where a click
   * goes):  only written bare is it the old switch
   */
  readonly shadowed: boolean
}

/** `OldNames.rewrite()`'s options. */
export type OldNamesOptions = {
  /** only tags a browser draws:  escaped markup, which quotes old names, is left */
  readonly markupOnly?: boolean
}

/** What `OldNames.rewrite()` made of a text. */
export type OldNamesResult = {
  /** the text, rewritten */
  readonly text: string
  /** one line per rewrite:  `<ui-button> primary => color="primary"` */
  readonly renames: readonly string[]
  /** what it left for a person, and why */
  readonly manual: readonly string[]
}

/** A renamed tag's new name (`RENAMED_TAGS`). */
type RenamedTag = {
  /** its name now:  `ui-theme-menu` */
  readonly tag: string
  /** the attributes it no longer takes, dropped as it's renamed:  `for` */
  readonly dropped: readonly string[]
}

/** One attribute of a tag being rewritten. */
type TagAttribute = {
  /** the space before it, kept as written */
  space: string
  /** its name */
  name: string
  /** its value;  none for a bare attribute */
  value?: { text: string; quote: string; expression?: boolean }
}

/** A tag's attributes, and the text after the last one (its closing space). */
type ParsedTag = {
  attributes: TagAttribute[]
  trailing: string
}
