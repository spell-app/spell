import { P } from "spell-parser/parser"

/**
 * The tokens only a SPELLX file has, spell's tag-shaped form (epic `elemental-spell` P6):  see `SP.SpellxTokenizer`.
 * - A tag's head, `<property "suit" one-of="...">`, is ONE token, its lines and all:  `SpellxTagToken`.
 * - A closer, `</>` or `</property>`:  `SpellxCloserToken`.
 * - A line of prose, or a note's text:  `SpellxProseToken`, a comment as code spell writes it.
 * - The rest of a spellx file -- each body's spell, a drawing's markup -- is spell's own tokens.
 */

/**
 * A spellx tag's head, start to its `>` or `/>`:  `<property "suit" one-of="clubs, diamonds" alias="is a (suit)">`.
 * - One token, though it may run over several lines:  so a tag line and its indented body are a line and its
 *   block, as an outline item and its body are.
 * - What it says is `tag`, read as it was tokenized;  its name, attribute values and phrase are tokens too,
 *   tokenized where they sit in the file (`nested`), for `SP.SpellxTwin` to read as spell.
 * - `error`:  what's wrong with it, in the file's language, e.g. a word spellx doesn't know.
 */
export class SpellxTagToken extends P.Token<string, SpellxTagTokenProps> {
  /** What the head says. */
  get tag(): SpellxTag {
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
/** Extra `record` props for `SpellxTagToken`. */
export type SpellxTagTokenProps = Prettify<P.TokenProps<string>> & {
  /** What the head says. */
  tag: SpellxTag
}

/**
 * What a spellx tag's head says.
 * - `category`:  what kind of tag it is, by the language's spellx words (`SP.SpellxWords`);
 *   `start` for the line the tokenizer adds after a notebook, starting it (no text of its own, P16);
 *   `code` for a chunk of code spell, the bare prefix (`<spell>`, `<encanto>`);  `unknown` for a word spellx doesn't know.
 * - `kind`:  what it means, in English:  `property`, `view`, `on`, `otherwise if` ...
 */
export type SpellxTag = {
  /** What kind of tag it is. */
  category: "template" | "declaration" | "note" | "handler" | "control" | "code" | "start" | "unknown"
  /** What it means, in English, e.g. `property`, or `view` for `<spell-view>`;  its word for an unknown tag. */
  kind: string
  /** Its word as written, e.g. `property`, `spell-view`, `otherwise if`. */
  word: string
  /** Its name:  a quoted name (`<property "suit">`), or its `name=`. */
  name?: SpellxText
  /** Its attributes, in order:  one may repeat (`alias=` twice is two aliases). */
  attributes: SpellxAttribute[]
  /** A handler's or control's phrase:  `mouse down` in `<on mouse down>`. */
  phrase?: SpellxText
  /** Ends in `/>`:  nothing goes inside it. */
  selfClosing: boolean
}

/** A run of a spellx file's text:  as written, where it is, and tokenized as spell. */
export type SpellxText = {
  /** The text, as written, without any quotes around it. */
  text: string
  /** Where it starts in the file:  its first character after any quote. */
  start: number
  /** Its spell tokens, positioned in the file;  a quoted name's or value's also as ONE `TextToken`, quotes and all. */
  tokens?: P.Token[]
  /** The text, quotes and all, as one `TextToken`:  when it was quoted. */
  quoted?: P.TextToken
}

/** One attribute of a spellx tag:  `one-of="clubs, diamonds"`. */
export type SpellxAttribute = {
  /** Its name, in English:  `one-of`, for Spanish's `uno-de`. */
  name: string
  /** Its name as written. */
  word: string
  /** Its value, if it has one. */
  value?: SpellxText
  /** Where the attribute starts. */
  start: number
} & Pick<SpellxText, "tokens">

/** A spellx closer:  `</>`, or `</property>` with its word. */
export class SpellxCloserToken extends P.Token<string, SpellxCloserTokenProps> {
  /** Its word, e.g. `property`;  `undefined` for `</>`. */
  get word(): string | undefined {
    return this.record.word
  }
}
/** Extra `record` props for `SpellxCloserToken`. */
export type SpellxCloserTokenProps = Prettify<P.TokenProps<string>> & {
  /** Its word, e.g. `property`;  none for `</>`. */
  word?: string
}

/**
 * A line of spellx prose, or of a note's text:  a comment, as code spell would write it (`// ...`).
 * - Prose is a line a template holds that isn't a tag (Q12), or a `<description>`'s or `<comment>`'s text (Q14).
 * - A `CommentToken`, so a line of it is a comment line:  `comment` reads it, and it compiles to `// ...`.
 * - A note's own head line, `<description>`, is an empty one;  its closer, `</description>`, a closer.
 */
export class SpellxProseToken extends P.CommentToken {
  /** The note it's part of, if any:  `description`, `comment`. */
  get note(): SpellxNoteKind | undefined {
    return (this.record as SpellxProseTokenProps).note
  }
}
/** Extra `record` props for `SpellxProseToken`. */
export type SpellxProseTokenProps = P.CommentTokenProps & {
  /** The note it's part of, if any. */
  note?: SpellxNoteKind
}

/** A spellx note:  a member's long `<description>`, or a `<comment>` among its lines. */
type SpellxNoteKind = "description" | "comment"

/**
 * What's wrong at `token`, as the spellx tokenizer found it:  a word spellx doesn't know, a tag never closed ...
 * - Its own field, not the token's `error`, which spell's tokenizer uses for its own (a JSX element's `No end >`).
 * - `SP.SpellxTwin.errorsIn()` reports them, on their line.
 */
export function spellxErrorOf(token: P.Token): string | undefined {
  return (token.record as SpellxErrorRecord).spellxError
}

/** Note `message` as what's wrong at `token`, after anything noted already -- see `spellxErrorOf()`. */
export function addSpellxError(token: P.Token, message: string) {
  const record = token.record as SpellxErrorRecord
  record.spellxError = record.spellxError ? `${record.spellxError};  ${message}` : message
}

/** A token's `record`, with what the spellx tokenizer found wrong there. */
type SpellxErrorRecord = P.TokenProps & { spellxError?: string }

/**
 * Is `token` (a JSX element or fragment) inside a `<spell>` chunk of a spellx file:  CODE spell, as written?
 * - There a drawing names tags as code spell does (`<div>`, `<button>`), never a pack's component (epic
 *   `elemental-spell` J83):  `SpellJSX` reads them so.
 * - Noted by the spellx tokenizer as it unwraps the chunk:  `markCodeSpell()`.
 */
export function isCodeSpell(token: P.Token): boolean {
  return !!(token.record as CodeSpellRecord).codeSpell
}

/**
 * Note every JSX element and fragment in `token` (a chunk's line or block, and what's inside it) as code spell.
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

/** Is `token` a spellx tag's head of `category`? */
export function isSpellxTag(token: unknown, category?: SpellxTag["category"]): token is SpellxTagToken {
  return token instanceof SpellxTagToken && (!category || token.tag.category === category)
}
