import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

/**
 * `AlonePage`:  what a project knows of a page alone in its file (epic `notebook` P10, Q11):
 * its name and its properties, read from its text before anything parses.
 * - The site's page lines, `go to the film page`, `the address of` and the site's refusal of a parameter the page
 *   lacks read this and nothing else.
 * - Declared in the project's scope as a page of that name;  the page's own declaration goes in its own scope.
 * - How it's parsed:  `P.IncrementalProject`, "a file ALONE".
 */
export class AlonePage implements P.FileHead {
  constructor(
    /** The parser that read it:  its language makes the name's words singular. */
    private readonly parser: SP.SpellParser,
    /** The page's name, as its tag says it:  `button usage`. */
    readonly words: string,
    /** The properties the page declares, by the tag's first line of each:  `["film"]`. */
    readonly properties: string[],
    /** Its file, as its `P.FileScope`'s `path`. */
    readonly path: string
  ) {}

  /** Its class's name:  `ButtonUsage`. */
  get className(): string {
    return P.classCase(this.words.trim().split(/\s+/).join("-"))
  }

  /** Same name and same properties:  nothing the project read has changed. */
  get key(): string {
    return `${this.words}\t${this.properties.join()}`
  }

  /** SIDE EFFECT:  a type and its one instance, in `scope`:  journaled, so a re-parse takes them back. */
  declareIn(scope: P.Scope): void {
    this.parser.inPlay(() => {
      const [type] = scope.types!.add({ name: this.className, superType: "Page", alonePage: this.path })
      for (const property of this.properties) type!.declarePropertyAhead(property)
      const name = SP.SpellParser.oneOfAKindVariableName(this.words)
      if (!scope.variables?.get(name, "LOCAL_ONLY"))
        scope.variables?.add({ name, datatype: this.className, kind: "only", ahead: true })
    })
  }

  /** Its head now points at the page itself, so a name found through the project reaches it. */
  parsed(own: P.Scope): void {
    const own_type = own.types?.get(this.className, "LOCAL_ONLY")
    const head = own.parentScope?.types?.get(this.className)
    if (own_type && head) head.declaredBy = own_type.declaredBy
  }
}

/** The line of a page's file that opens a tag with a quoted name, at the file's top:  its word, its name. */
const TOP_TAG = /^<([\p{L}\p{N}-]+)[ \t]+"([^"]*)"/u

/**
 * The name of the one page alone in spellx file `text`:  `undefined` when it isn't just one page, comments aside.
 * - Read from the lines at the file's left edge:  everything inside a page is indented.
 * - Its opening tag says the language's word for a page (`page`, `notebook`, Spanish's), or its old spelling (`spell-page`).
 */
export function alonePageName(text: string, language: SP.Language): string | undefined {
  const words = language.words.spellx
  if (!words) return undefined
  const isPageWord = (word: string): boolean => {
    // short, `<page>` (epic `language` P41), or its old spelling, `<spell-page>`
    const short = word.startsWith(`${words.prefix}-`) ? word.slice(words.prefix.length + 1) : word
    const kind = words.templates[short]
    return (typeof kind === "string" ? kind : kind?.kind) === "page"
  }
  let name: string | undefined
  let opened = false
  let inComment = false
  for (const line of text.split("\n")) {
    if (inComment) {
      inComment = !line.includes("-->")
      continue
    }
    if (!line.trim() || line[0] === " " || line[0] === "\t") continue
    if (line.startsWith("<!--")) {
      inComment = !line.includes("-->")
      continue
    }
    if (line.startsWith("</")) {
      if (!name || !opened) return undefined
      opened = false
      continue
    }
    const tag = TOP_TAG.exec(line)
    if (!tag || name || !isPageWord(tag[1]!)) return undefined
    name = tag[2]!
    opened = !/\/>\s*$/.test(line)
  }
  return name && !opened ? name : undefined
}

/** The properties a page's own body declares:  each `<property "film">` one tab in. */
export function alonePageProperties(text: string, language: SP.Language): string[] {
  const words = Object.entries(language.words.spellx?.declarations ?? {}).flatMap(([word, kind]) =>
    kind === "property" ? [word] : []
  )
  const pattern = new RegExp(`^\\t<(?:${words.join("|")})[ \\t]+"([^"]+)"`, "gmu")
  return [...text.matchAll(pattern)].map((match) => match[1]!)
}
