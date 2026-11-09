import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { STORIES_TAG, MARKDOWN_TAG, rawTextOf } from "spell/parser/spell/rules/JSX/JSX.shared"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/** The tags this rule reads in a type's outline:  its description, and a page's stories. */
const DESCRIPTION_TAGS: ReadonlySet<string> = new Set([MARKDOWN_TAG, STORIES_TAG])

/** Each `<story "S1" done>...</story>` in a stories block, in English or Spanish:  all a block may hold. */
const STORY_TAGS = /<(story|historia)\b[^>]*>[^]*?<\/\1>/g

/**
 * `markdown_description` rule:  a type's description, as markdown, in its outline (epic `drawable-thing`, P14).
 *
 * ```spell
 * a card is a thing
 *   <markdown>
 *     A playing card:  a **rank** and a **suit**.
 *   </markdown>
 *   - it has a rank as a number
 * ```
 *
 * - The markdown is never read as spell:  the tokenizer takes a `<markdown>` element's contents as raw text
 *   (`rawTextTags`), and the indent its lines share comes off.
 * - Shown where the type's docstring shows, when it has no comment docstring:
 *   hover, and the Type Explorer's description -- see lsp's `SpellLanguageService.docsOf()`.
 * - Compiles to its class's `static description = "..."`:  the program has it too.
 * - Plain text:  a `{...}` in it is NOT a hole, since there's no thing to read it from.
 * - Only in a type's outline:  anywhere else, a parse error that says where it goes.
 *   - In a drawing, a `<markdown>` block is drawn instead:  `markdown_block`;  in a method, alone on its line too,
 *     so a drawing that's only prose draws it (epic `notebook` P2).
 * - A page's STORIES are the same, by their own tag (epic `mockup` P6):  what it must let people do, kept with it for
 *   good, compiled to `static stories = "..."`;  a site's editor reads and writes them, the running page draws nothing.
 *
 * ```spell
 * a "film page" is a page
 *   <stories>
 *     <story "S1">see a film's opening crawl</story>
 *     <story "S2" done>As a fan, I want to see who's in a film, so that I can find their other films</story>
 *   </stories>
 * ```
 *
 *   - One tag a story (epic `mockup` P17):  its words, then two blank lines and its description, if it has one.
 *   - Spanish:  `<historia "H1" hecha>`.  Anything else in the block is refused, saying what to write.
 *   - spellx writes the block `<stories>`, or `<spell-stories>`, its twin this block.
 */
export class MarkdownDescription extends P.TokenType<never, MarkdownDescriptionData> {
  @proto static alias = "statement"
  @proto static tokenType = P.JSXElementToken
  @proto static priority = Priority.declaration

  /** A `<markdown>` or `<stories>` element, alone on its line -- refused outside a type's outline. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const [element] = tokens
    if (!(element instanceof P.JSXElementToken) || !DESCRIPTION_TAGS.has(element.tagName)) return undefined
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    // in a method, a drawing's:  a `<markdown>` block alone is what it draws (`markdown_block`;  epic `notebook` P2)
    for (let at: P.Scope | undefined = scope; at; at = at.parentScope) if (at instanceof P.MethodScope) return undefined
    const type = scope instanceof P.SubjectScope ? scope.subjectType : undefined
    if (!type) {
      return SpellStatement.refuse(match, SP.Language.of(scope).parserMessage("markdown-outside-outline"))
    }
    match.data.typeName = type.name
    match.data.markdown = rawTextOf(element)
    if (element.tagName === STORIES_TAG) {
      match.data.isStories = true
      const stray = match.data.markdown.replace(STORY_TAGS, "").trim()
      if (stray) {
        return SpellStatement.refuse(
          match,
          SP.Language.of(scope).parserMessage("stories-not-tags", { text: stray.split("\n")[0]!.trim() })
        )
      }
    }
    return match
  }

  /** `static description = "..."` in the type's class, or `static stories = "..."`. */
  getAST(match: P.MatchFor<this>) {
    const { typeName = "", markdown = "", isStories } = match.data
    return new P.ASTStaticDefinition(match, {
      type: new P.ASTTypeExpression(match, { name: typeName }),
      name: isStories ? "stories" : "description",
      value: new P.ASTStringLiteral(match, { value: markdown, quote: '"' })
    })
  }

  /** The description in `match`, if it's a `markdown_description` match:  for editors, e.g. hover. */
  static descriptionOf(match: P.Match | undefined): string | undefined {
    return match?.is(MarkdownDescription) && !match.data.isStories ? match.data.markdown : undefined
  }
}

/** What `markdown_description` keeps on its match. */
type MarkdownDescriptionData = {
  /** Name of the type it describes, e.g. `Card`. */
  typeName?: string
  /** Its markdown, e.g. `A playing card:  a **rank** and a **suit**.` */
  markdown?: string
  /** Whether it's a page's `<stories>`, not its description:  `static stories`. */
  isStories?: boolean
}
