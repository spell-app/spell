import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

/**
 * `AlonePage`:  what a project knows of a page alone in its file (epic `notebook` P10, Q11):
 * its name, read from its text before anything parses.
 * - The site's page lines, `go to the film page`, `the address of` and the site's refusal of a parameter the page
 *   lacks read this and nothing else.
 * - Declared in the project's scope as a page of that name;  the page's own declaration goes in its own scope.
 * - How it's parsed:  `P.IncrementalProject`, "a file ALONE".
 */
export class AlonePage implements P.FileHead {
  constructor(
    /**
     * The parser that read it:  its language makes the name's words singular.
     * - Or what finds it, once it's needed (`declareIn()`):  a head read before the grammar loaded
     *   (`SP.SpellProject.headFor()`).
     */
    private readonly reader: SP.SpellParser | (() => SP.SpellParser),
    /** The page's name, as its head says it:  `button usage`. */
    readonly words: string,
    /** Its file, as its `P.FileScope`'s `path`. */
    readonly path: string
  ) {}

  /** Its class's name:  `ButtonUsage`. */
  get className(): string {
    return P.classCase(this.words.trim().split(/\s+/).join("-"))
  }

  /** Same name:  nothing the project read has changed. */
  get key(): string {
    return this.words
  }

  /** SIDE EFFECT:  a type and its one instance, in `scope`:  journaled, so a re-parse takes them back. */
  declareIn(scope: P.Scope): void {
    const parser = typeof this.reader === "function" ? this.reader() : this.reader
    parser.inPlay(() => {
      scope.types!.add({ name: this.className, superType: "Page", alonePage: this.path })
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

/**
 * The name of the one page alone in page file `text`:  `undefined` when it isn't just one page, comments aside.
 * - Read from the lines at the file's left edge, its head among them, `"button api" is a notebook page`:
 *   everything inside a page is indented.
 */
export function alonePageName(text: string, language: SP.Language): string | undefined {
  const words = language.words.page ?? SP.Language.default.words.page!
  const head = new RegExp(words.plainPage.source, "iu")
  let name: string | undefined
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
    const page = head.exec(line)?.groups?.name
    if (!page || name) return undefined
    name = page
  }
  return name
}
