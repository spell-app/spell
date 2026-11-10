import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

/**
 * Which tag each bare component name in a spellx file became, as its last parse chose (epic `notebook` P6).
 * - e.g. `<card>` => `<solitaire-card>` (the project's own view), `<button>` => `<ui-button>` (a pack's)
 * - The ONE answer for every code spell view of a `.spell` file:
 *   - the language server's (`LSP.SpellLanguageService.codeSpellOf()`)
 *   - the editor's code-spell tab
 *   - the Spell view of an example, on a page that draws its body
 *   - and the way back from that view (`SX.SpellxWriter.writeMarkup()`)
 * - Read off the parse:  each `jsxElement` match's `tagName`, the tag `SpellJSX.componentTagFor()` chose.
 *   - A name the parse didn't see (a file not parsed yet, or compiled from the cache):  the project's packs'.
 * - Kept per parse:  a new parse reads afresh.
 */
export class ComponentTags {
  /**
   * `file`'s component tags, from its last parse:  a `SP.SpellFile`, or what a test parsed (`parseSpellProject()`).
   * - NEVER throws.
   */
  static of(file: ComponentTagsFile): ComponentTags {
    const { match } = file
    const known = match && TAGS_READ.get(match)
    if (known) return known
    // the project's packs, as its parser has them (`SpellJSX.packsFor()`)
    const packs = (file.scope?.parser as SP.SpellParser | undefined)?.packs
    const tags = new ComponentTags(SP.Language.forFile(file.path).lang, packs)
    if (match) {
      tags.read(match)
      TAGS_READ.set(match, tags)
    }
    return tags
  }

  /** Each element's name and tag, by where it starts in the file. */
  private readonly byStart = new Map<number, { word: string; tag: string }>()
  /** Each bare name the parse turned into another tag, and that tag. */
  private readonly byWord = new Map<string, string>()

  private constructor(
    /** the file's language, `en` */
    readonly language: string,
    /** the packs its project draws with:  `undefined` for the default */
    readonly packs: readonly string[] | undefined
  ) {}

  /**
   * The tag the element written at `start` draws, if it's named `word` there:  else `word`'s tag (`tagFor()`).
   * - What `SX.CodeSpellWriter`'s `componentTag` option takes.
   */
  componentTag = (word: string, start: number): string | undefined => {
    const element = this.byStart.get(start)
    return element?.word === word ? element.tag : this.tagFor(word)
  }

  /** The tag bare name `word` draws:  as the parse chose it anywhere in the file, else its packs' (`ComponentPacks`). */
  tagFor(word: string): string | undefined {
    return this.byWord.get(word) ?? SP.ComponentPacks.tagFor(word, this.language, this.packs)
  }

  /** The bare name tag `tag` stands for:  `tagFor()` backwards.  `undefined` for a tag no bare name gives. */
  wordFor(tag: string): string | undefined {
    for (const [word, each] of this.byWord) if (each === tag) return word
    // a pack's own, by the name after its prefix:  `ui-button` is `button`
    const word = tag.replace(/^[\p{Ll}]+-/u, "")
    return word !== tag && this.tagFor(word) === tag ? word : undefined
  }

  /** Read every element of `match`, however deep:  in its matched tokens and in what its rules kept. */
  private read(match: P.Match) {
    const seen = new Set<P.Match>()
    const visit = (node: unknown) => {
      if (Array.isArray(node)) return node.forEach(visit)
      if (!(node instanceof P.Match) || seen.has(node)) return
      seen.add(node)
      const [element] = node.matched
      const { tagName } = (node.data ?? {}) as { tagName?: unknown }
      if (node.rule.name === "jsxElement" && element instanceof P.JSXElementToken && typeof tagName === "string") {
        this.byStart.set(element.start, { word: element.tagName, tag: tagName })
        if (tagName !== element.tagName) this.byWord.set(element.tagName, tagName)
      }
      node.matched.forEach(visit)
      Object.values(node.data ?? {}).forEach(visit)
    }
    visit(match)
  }
}

/** What `ComponentTags.of()` reads:  a file's path (its language), its last parse and its scope (its packs). */
export type ComponentTagsFile = {
  /** its path, `/Counter.es.spell`:  its language */
  path: string
  /** its last parse, if it's been parsed */
  match?: P.Match
  /** its file scope, whose parser knows its project's packs */
  scope?: P.Scope
}

/** What each parse's elements say, read once:  `ComponentTags.of()`. */
const TAGS_READ = new WeakMap<P.Match, ComponentTags>()
