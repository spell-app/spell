import { P } from "spell/parser/parser"

/**
 * The tokens only a PAGE has, beside plain Spell's own (epic `language` P47):  see `SP.PageTokenizer`.
 * - A page's head, `"button api" is a notebook page`, and the tags its body draws with:
 *   `<if>`, `<otherwise>`, `<for>`, `<html>`, `<spell>` -- each ONE `PageTagToken`.
 * - A closer, `</>` or `</if>`:  `PageCloserToken`.
 * - A line of prose in a page's body, drawn as markdown:  `PageProseToken`, a comment as code spell writes it.
 * - A comment on lines of its own, `<!-- ... -->`:  `PageCommentToken`.
 * - The rest of a page file -- its markup, the spell inside `{...}` -- is spell's own tokens.
 */

/**
 * A page's head, or one of the tags its body draws with:  `<for film in its films loading="Wait">`.
 * - One token, though it may run over several lines:  so a tag line and its indented body are a line and its
 *   block, as an outline item and its body are.
 * - What it says is `tag`, read as it was tokenized;  its name, attribute values and phrase are tokens too,
 *   tokenized where they sit in the file (`nested`), for `SP.PageTwin` to read as spell.
 */
export class PageTagToken extends P.Token<string, PageTagTokenProps> {
  /** What the head says. */
  get tag(): PageTag {
    return this.record.tag
  }

  /** Its name's, attribute values' and phrase's tokens:  they move with it after an edit. */
  get nested(): P.Token[] {
    const { name, attributes, phrase } = this.tag
    return [name, ...attributes.map((it) => it.value), phrase].flatMap((text) =>
      text ? [...(text.tokens ?? []), ...(text.quoted ? [text.quoted] : [])] : []
    )
  }
}
/** Extra `record` props for `PageTagToken`. */
export type PageTagTokenProps = Prettify<P.TokenProps<string>> & {
  /** What the head says. */
  tag: PageTag
}

/**
 * What a page's head, or a tag in its body, says.
 * - `category`:
 *   - `page`:  the page's head, `"button api" is a notebook page`
 *   - `control`:  an if-chain's branch or a loop, `<if ...>`, `<otherwise>`, `<for ...>`, a loop's `<empty>`
 *   - `code`:  a block drawn or read as written, `<html>` (markup) or `<spell>` (plain Spell, `<encanto>` in Spanish)
 * - `kind`:  what it means, in English:  `page`, `if`, `for each`, `html`, `code` ...
 */
export type PageTag = {
  /** What kind of tag it is. */
  category: "page" | "control" | "code"
  /** What it means, in English, e.g. `otherwise if`, `html`. */
  kind: string
  /** Its word as written, e.g. `page`, `otherwise if`, `para`. */
  word: string
  /** A page's name, `"button api"`. */
  name?: PageText
  /** Its attributes, in order:  a page's flags (`notebook`, `locked`), a loop's (`loading=`, `as=` ...). */
  attributes: PageAttribute[]
  /** A control's phrase:  `film in its films` in `<for film in its films>`. */
  phrase?: PageText
  /** Ends in `/>`:  nothing goes inside it. */
  selfClosing: boolean
}

/**
 * The page flag that has the editor show a page in place, editable, by its English name:
 * `"x" is a notebook page`.
 * - The language doesn't need it:  every page draws its body.
 */
export const PAGE_DRAWS_BODY_FLAG = "notebook"

/** A run of a page file's text:  as written, where it is, and tokenized as spell. */
export type PageText = {
  /** The text, as written, without any quotes around it. */
  text: string
  /** Where it starts in the file:  its first character after any quote. */
  start: number
  /** Its spell tokens, positioned in the file;  a quoted name's or value's also as ONE `TextToken`, quotes and all. */
  tokens?: P.Token[]
  /** The text, quotes and all, as one `TextToken`:  when it was quoted. */
  quoted?: P.TextToken
}

/** One attribute of a page's tag:  a page's `notebook`, a loop's `loading="Wait"`. */
export type PageAttribute = {
  /** Its name, in English:  `notebook`, for Spanish's `cuaderno`. */
  name: string
  /** Its name as written. */
  word: string
  /** Its value, if it has one. */
  value?: PageText
  /** Where the attribute starts. */
  start: number
  /** It as written, `columns="4"`:  `<for>` hands on what isn't its own to what's around its items. */
  raw?: string
} & Pick<PageText, "tokens">

/** A closer in a page's body:  `</>`, or `</if>` with its word. */
export class PageCloserToken extends P.Token<string, PageCloserTokenProps> {
  /** Its word, e.g. `if`;  `undefined` for `</>`. */
  get word(): string | undefined {
    return this.record.word
  }
}
/** Extra `record` props for `PageCloserToken`. */
export type PageCloserTokenProps = Prettify<P.TokenProps<string>> & {
  /** Its word, e.g. `if`;  none for `</>`. */
  word?: string
}

/**
 * A line of prose in a page's body:  a comment, as code spell would write it (`// ...`), drawn as markdown.
 * - A `CommentToken`, so a line of it is a comment line:  `comment` reads it.
 * - `SP.PageTwin` gathers each run of them into a `<markdown>` block of the page's drawing.
 */
export class PageProseToken extends P.CommentToken {}

/**
 * A line of a page file's COMMENT, `<!-- ... -->`, on a line of its own (Owen, 2026-10-26):  never drawn.
 * - A comment over several lines is a token per line:  its first line's from `<!--`, its last line's to `-->`.
 * - A `CommentToken` written as its code-spell twin is, `// ...`:  `commentSymbol` `//`, `value` its line's text
 *   without `<!--` and `-->`.
 * - Not prose:  a page draws its prose as markdown (`PageProseToken`), never this.
 * - Inside markup, a comment is the markup's own, `P.JSXCommentToken`.
 */
export class PageCommentToken extends P.CommentToken {}

/**
 * What's wrong at `token`, as the page tokenizer found it:  a closer that closes nothing, a tag never closed ...
 * - Its own field, not the token's `error`, which spell's tokenizer uses for its own (a JSX element's `No end >`).
 * - `SP.PageTwin.errorsIn()` reports them, on their line.
 */
export function pageErrorOf(token: P.Token): string | undefined {
  return (token.record as PageErrorRecord).pageError
}

/** Note `message` as what's wrong at `token`, after anything noted already -- see `pageErrorOf()`. */
export function addPageError(token: P.Token, message: string) {
  const record = token.record as PageErrorRecord
  record.pageError = record.pageError ? `${record.pageError};  ${message}` : message
}

/** A token's `record`, with what the page tokenizer found wrong there. */
type PageErrorRecord = P.TokenProps & { pageError?: string }

/**
 * Is `token` (a JSX element or fragment) inside a page's `<spell>` or `<html>` block:  CODE spell, as written?
 * - There a drawing names tags as code spell does (`<div>`, `<button>`), never a pack's component (epic
 *   `elemental-spell` J83):  `SpellJSX` reads them so.
 * - Noted by the page tokenizer as it unwraps the block:  `markCodeSpell()`.
 */
export function isCodeSpell(token: P.Token): boolean {
  return !!(token.record as CodeSpellRecord).codeSpell
}

/**
 * Note every JSX element and fragment in `token` (a block's line, and what's inside it) as code spell.
 * - The ones a `{...}` holds are tokenized later, as their element parses:  `SpellJSX` reads them as its own.
 */
export function markCodeSpell(token: P.Token) {
  if (token instanceof P.JSXElementToken || token instanceof P.JSXFragmentToken) {
    ;(token.record as CodeSpellRecord).codeSpell = true
  }
  const record = token.record as { tokens?: unknown; children?: unknown; attributes?: unknown; value?: unknown }
  for (const inner of [record.tokens, record.children, record.attributes, record.value]) {
    if (inner instanceof P.Token) markCodeSpell(inner)
    else if (Array.isArray(inner)) for (const item of inner) if (item instanceof P.Token) markCodeSpell(item)
  }
}

/** A JSX token's `record`, with whether it's code spell. */
type CodeSpellRecord = P.TokenProps & { codeSpell?: boolean }

/** Is `token` a page's head, or one of its tags, of `category`? */
export function isPageTag(token: unknown, category?: PageTag["category"]): token is PageTagToken {
  return token instanceof PageTagToken && (!category || token.tag.category === category)
}
