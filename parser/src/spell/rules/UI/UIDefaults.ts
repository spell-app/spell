import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `ui_defaults` rule:  an app's widget defaults, a block of sample tags, one per widget (epic `language` P29).
 *
 * ```spell
 * <ui-defaults>
 *   <ui-button appearance="pill"/>
 *   <ui-segment appearance="raised"/>
 * </ui-defaults>
 * ```
 *
 * - Each sample's attributes are what every one of its widgets in the app has, unless it says otherwise:
 *   any attribute but what the widget shows (`label`, `value`, `text`).
 * - A Spanish file writes the same block in Spell UI's Spanish words:  `<es-boton apariencia="píldora"/>`
 *   (or `<botón>`, `<ui-botón>`).  It compiles to Spell UI's own names, which the page's root reads.
 * - `<ui-defaults source="@spell/library/theme/ui-defaults.spell"/>`:  another project's defaults file, its own
 *   `<ui-defaults>` block, found in that project's declarations, so it must be imported (`imports` in the project file).
 * - Checked by the component pack's names (`SP.ComponentPacks.readDefault()`):  an unknown widget, attribute or value
 *   is an error naming what it takes.  With no pack loaded (spell-parser's own tests), each is taken as written.
 * - Compiles to `core.useDefaults(file, { "ui-button": { appearance: "pill" } })`:  the app's element gives them to
 *   everything drawn inside it, as a `<ui-root defaults>` does.
 * - Its own block declares the table, so another project can name its file in `source`
 *   (`uiDefaults` in the declarations;  `SpellDeclarations.uiDefaultsIn()`).
 * - A file's top level:  in a `.spell` file too, where the block is markup, read as code spell reads it.
 */
export class UIDefaults extends P.TokenType<never, UIDefaultsData> {
  @proto static alias = "statement"
  @proto static tokenType = P.JSXElementToken
  @proto static priority = Priority.declaration

  /** A `<ui-defaults>` element:  its samples read, checked and turned into Spell UI's names -- else refused. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const [element] = tokens
    if (!(element instanceof P.JSXElementToken)) return undefined
    const language = SP.Language.of(scope)
    if (element.tagName !== language.words.defaultsTag) return undefined
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const file = fileOf(scope)
    const source = element.attributes?.find((attribute) => attribute.name === SOURCE_ATTRIBUTE)
    try {
      if (source) {
        const address = attributeValue(source)
        if (typeof address !== "string" || !address)
          throw new DefaultsProblem(language.parserMessage("ui-defaults-source"))
        if (element.children?.some(isSample)) {
          throw new DefaultsProblem(language.parserMessage("ui-defaults-source-and-samples"))
        }
        const table = SP.SpellDeclarations.uiDefaultsIn(scope, address)
        if (!table) {
          const project = SP.SpellLocation.isAddress(address) ? address.replace(/\/[^/]*\.[^/]*$/, "") : address
          throw new DefaultsProblem(language.parserMessage("ui-defaults-source-unknown", { source: address, project }))
        }
        match.data.file = address
        match.data.defaults = table
      } else {
        match.data.file = file
        match.data.defaults = UIDefaults.tableOf(element, language)
        match.data.declaresDefaults = match.data.defaults
      }
    } catch (error) {
      if (error instanceof DefaultsProblem) return SpellStatement.refuse(match, error.message)
      throw error
    }
    return match
  }

  /** `core.useDefaults(file, { tag: { attribute: value } })`. */
  getAST(match: P.MatchFor<this>) {
    const { file = "", defaults = {} } = match.data
    const table = new P.ASTObjectLiteral(match, { wrap: true })
    for (const [tag, attributes] of Object.entries(defaults)) {
      const values = new P.ASTObjectLiteral(match)
      for (const [attribute, value] of Object.entries(attributes)) values.addProp(attribute, literalFor(match, value))
      table.addProp(tag, values)
    }
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "useDefaults",
      args: [new P.ASTStringLiteral(match, { value: file, quote: '"' }), table]
    })
  }

  /**
   * `element`'s samples as a table, in the pack's own names:  tag => attribute => value.
   * - throws `DefaultsProblem`, in `language`'s words, at the first sample it can't read
   */
  static tableOf(element: P.JSXElementToken, language: SP.Language): SP.UIDefaultsTable {
    const table: Record<string, Record<string, string | number | boolean>> = {}
    for (const child of element.children ?? []) {
      if (child instanceof P.JSXCommentToken || child instanceof P.JSXEndTagToken) continue
      if (child instanceof P.JSXTextToken && !`${child.value}`.trim()) continue
      if (!(child instanceof P.JSXElementToken) || child.children?.some(isSample)) {
        throw new DefaultsProblem(language.parserMessage("ui-defaults-not-a-sample"))
      }
      for (const attribute of child.attributes ?? []) {
        const value = attributeValue(attribute)
        if (value === undefined) {
          throw new DefaultsProblem(
            language.parserMessage("ui-defaults-not-written", { tag: child.tagName, attribute: attribute.name })
          )
        }
        const sample = { tag: child.tagName, attribute: attribute.name, value }
        const reading = SP.ComponentPacks.readDefault(sample, language.lang) ?? sample
        if ("problem" in reading) throw new DefaultsProblem(UIDefaults.problemText(sample, reading, language))
        ;(table[reading.tag] ??= {})[reading.attribute] = reading.value
      }
    }
    return table
  }

  /** What's wrong with `sample`, in `language`'s words, from its pack's `reading`. */
  static problemText(sample: SP.DefaultSample, reading: SP.DefaultReading, language: SP.Language): string {
    const { attribute, value } = sample
    const quoted = (words: string[]) => words.map((word) => `"${word}"`).join(", ")
    if (!("problem" in reading)) return ""
    switch (reading.problem) {
      case "unknown-tag":
        return language.parserMessage("ui-defaults-unknown-tag", { tag: `<${sample.tag}>` })
      case "unknown-attribute":
        return language.parserMessage("ui-defaults-unknown-attribute", {
          tag: `<${reading.tag}>`,
          attribute,
          attributes: reading.attributes.join(", ")
        })
      case "content":
        return language.parserMessage("ui-defaults-content", { tag: `<${reading.tag}>`, attribute })
      case "bad-value": {
        const takes = reading.values.length
          ? quoted(reading.values)
          : language.parserMessage(`ui-defaults-takes-${reading.takes ?? "text"}`)
        return language.parserMessage("ui-defaults-bad-value", {
          tag: `<${reading.tag}>`,
          attribute,
          value: `${value}`,
          takes
        })
      }
    }
  }
}

/** What `ui_defaults` keeps on its match. */
type UIDefaultsData = {
  /** Where they're written:  the file, or the other project's file `source` names. */
  file?: string
  /** Its table, in the pack's own names. */
  defaults?: SP.UIDefaultsTable
  /** Its own block's table, for its declaration:  another project reads it by `source` (`SpellDeclarations`). */
  declaresDefaults?: SP.UIDefaultsTable
}

/** A sample the compiler can't read:  its message, in the file's language, is the line's error. */
class DefaultsProblem extends Error {}
DefaultsProblem.prototype.name = "DefaultsProblem"

/** The attribute naming another project's defaults file. */
const SOURCE_ATTRIBUTE = "source"

/** Is `token` a sample tag, an element? */
function isSample(token: P.Token): boolean {
  return token instanceof P.JSXElementToken
}

/**
 * `attribute`'s value as written:  text, a number, or `true` for one written bare (`fluid`);
 * `undefined` for a `{...}` expression, which a default can't be.
 */
function attributeValue(attribute: P.JSXAttributeToken): string | number | boolean | undefined {
  const value = attribute.value as P.Token | undefined
  if (value === undefined) return true
  if (value instanceof P.JSXExpressionToken) return undefined
  if (value instanceof P.NumberToken) return value.value
  if (value instanceof P.TextToken) return value.innerText
  return `${value.value}`
}

/** `value` as a literal. */
function literalFor(match: P.AnyMatch, value: string | number | boolean): P.ASTExpression {
  if (typeof value === "number") return new P.ASTNumericLiteral(match, { value })
  if (typeof value === "boolean") return new P.ASTBooleanLiteral(match, value)
  return new P.ASTStringLiteral(match, { value, quote: '"' })
}

/** The path of the file `scope` is in, e.g. `/Theme.spell`;  `""` outside one. */
function fileOf(scope: P.Scope): string {
  for (let at: P.Scope | undefined = scope; at; at = at.parentScope) {
    if (at instanceof P.FileScope) return at.path ?? ""
  }
  return ""
}
