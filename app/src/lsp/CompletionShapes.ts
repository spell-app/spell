import { InsertTextFormat, type Command, type CompletionItem } from "vscode-languageserver"

import { withoutAccents } from "spell/util/string"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

/** What the editor runs to show the suggestion list again, the moment a completion is written:  VS Code's and Monaco's. */
const SHOW_SUGGESTIONS: Command = { title: "", command: "editor.action.triggerSuggest" }

/**
 * How each of spell's own tags is written, by what it means (`SP.spellTagsIn()`):
 * - `action`:  a button for one of the program's actions, `<action "auto play" />`
 * - `divider`, `slot` (`<children />`):  hold nothing
 * - `context_menu`:  holds its `<action>`s, a line each
 */
const SPELL_TAG_SHAPES: Record<string, TagShape | undefined> = {
  action: "named",
  divider: "closed",
  slot: "closed",
  context_menu: "holds"
}

/****************
 * ### `CompletionShapes`
 * How a tag or an attribute chosen from the suggestion list is written WHOLE, the caret where you type next
 * (epic `editor` I70):  the ONE table of shapes, as snippets, so Monaco and VS Code write the same.
 * - `<act` => `<action "|" />`, the program's actions listed at once;  `<divider />|`;  `<content>`, a line in, `</>`.
 * - `<segment col` => `color="|"`, its words listed at once;  `fluid` alone, as it takes no value.
 * - What's already written after the caret is never doubled:  then only the name is (`isWrittenAfter()`).
 * - A space typed after a tag's name writes the rest of it by the same shapes, `<action ` => `<action "|" />`,
 *   `<segment ` => `<segment |></segment>`:  `spaceAfterTag()`, for the app's typing helps (`SpellTyping`).
 * - Each snippet leaves out the `<`:  the editor replaces only the word being typed, after it.
 * - Closing tags are `</>`, as the examples write them (the app folder's AGENTS.md, "Writing an example").
 * - A tag that closes itself always has a space before its `/>`:  `<divider />`, `<icon | />` (Owen, I70 C4).
 * - STATIC and instance-free on purpose:  pure text, no parse, so its test needs no project.
 ****************/
export class CompletionShapes {
  /**
   * The completion fields that write spell's own tag `tag`, meaning `meaning` (`action`, `divider` ...), whole;
   * `after` is the line's text after the caret.
   */
  static spellTag(tag: string, meaning: string, after: string): Partial<CompletionItem> {
    return CompletionShapes.tag(tag, SPELL_TAG_SHAPES[meaning] ?? "holds", after)
  }

  /**
   * The completion fields that write a component's tag `help.tag` whole, as `scope`'s language reads it:
   * - holds nothing (no default slot):  `<icon | />`, its attributes listed at once
   * - its quoted word is its contents (`button`, `header`, `label` ...):  `<button>|</>`, a few words on one line
   * - a quoted word names it (`tab`, `panel`, `example`, `tree-node`):  `<tab "|">`, a line in, `</>`
   * - anything else holds things:  `<content>`, a line in, `</>`
   * - The quoted-word tags are the tokenizer's (`P.Tokenizer.quotedNameTags`), each language's spellings.
   */
  static componentTag(scope: P.Scope, help: SP.ComponentTagHelp, after: string): Partial<CompletionItem> {
    return CompletionShapes.tag(help.tag, CompletionShapes.componentShape(scope, help), after)
  }

  /**
   * The completion fields that write attribute `help.name` whole:  `color="|"`, its words listed at once if it has
   * any;  one that takes no value (`bare`) by its name alone.
   * - Only the name when an `=` already follows it.
   * - `picksValues`:  the editor can pick its value (a colour, an icon;  epic `editor` T61),
   *   so a picked one with no words lists too, for its Pick row.
   */
  static attribute(help: SP.ComponentAttributeHelp, after: string, picksValues = false): Partial<CompletionItem> {
    if (help.bare || /^[\p{L}\p{M}\d_-]*\s*=/u.test(after)) return {}
    return {
      insertText: `${help.name}="$1"`,
      insertTextFormat: InsertTextFormat.Snippet,
      ...((help.values.length || (picksValues && help.picker)) && { command: SHOW_SUGGESTIONS })
    }
  }

  /**
   * Is the tag being typed already written on after the caret, `after`:  its `>` or `/>`, its attributes, its quoted
   * word?  Then a chosen tag writes only its name.
   * - Only the rest of the word, the line's end, or another tag after it:  it isn't.
   */
  static isWrittenAfter(after: string): boolean {
    return !/^[\p{L}\p{M}\d_-]*\s*(?:<|$)/u.test(after)
  }

  /**
   * What a space typed right after a tag's name writes (epic `editor` T68):  the rest of the tag, by its shape,
   * the caret where you type next.  The completion fields for it, as a snippet:
   * - a quoted name names it (`action`, `tab`):  its quotes, `<action "|" />`, `<tab "|"></tab>`
   * - it holds nothing (`divider`, `icon`):  `<icon | />`
   * - the program's own view (`<column>`, `<stock-pile>`):  named by its id, `<column "|" />` (I149)
   * - anything else, a tag of `scope`'s pack, or one nothing knows:
   *   its closing tag written out, the caret before its `>`, `<segment |></segment>`
   * - A shape that lists next when chosen (`<action`'s actions, `<icon`'s attributes) lists here too.
   * - The shape is the one choosing the tag from the suggestion list writes (`spellTag()`, `componentTag()`),
   *   but its closing tag is written out in full, on the same line (Owen, T68):  the caret's in the tag, not under it.
   * - `scope`:  any scope of the file's language, its components' help from its packs (`SP.ComponentPacks`);
   *   help that hasn't loaded yet leaves a component as "anything else".
   */
  static spaceAfterTag(scope: P.Scope, tag: string): Partial<CompletionItem> {
    const shape = CompletionShapes.shapeOf(scope, tag)
    // oxfmt-ignore
    const snippet =
      shape === "named" ? `"$1" />`
      : shape === "named-holds" ? `"$1"></${tag}>`
      : shape === "closed" || shape === "attributes" ? `$0 />`
      : /* shape === "words" || shape === "holds" */ `$0></${tag}>`
    return {
      insertText: snippet,
      insertTextFormat: InsertTextFormat.Snippet,
      ...(LISTS_NEXT.includes(shape) && { command: SHOW_SUGGESTIONS })
    }
  }

  /**
   * The shape tag `tag` is written in, as `scope`'s language reads it:  spell's own tag's (`SPELL_TAG_SHAPES`),
   * else its component's, else `holds`.
   */
  private static shapeOf(scope: P.Scope, tag: string): TagShape {
    const meaning = SP.spellTagsIn(scope).find((each) => each.tag === tag)?.meaning
    if (meaning) return SPELL_TAG_SHAPES[meaning] ?? "holds"
    // the program's own view (`<column>` => `column`):  named by its id, it draws itself, so it closes itself (I149)
    if (scope.getType(SP.typeName(tag))) return "named"
    const packs = (scope.parser as SP.SpellParser | undefined)?.packs ?? SP.ComponentPacks.DEFAULT
    const help = SP.ComponentPacks.help(SP.Language.of(scope).lang, packs)?.tags.find((each) => each.tag === tag)
    return CompletionShapes.componentShape(scope, help ?? { tag })
  }

  /**
   * The shape a component's tag `help.tag` is written in:
   * - holds nothing (no default slot):  `attributes`
   * - its quoted word is its contents (`button`, `header`, `label` ...):  `words`
   * - a quoted word names it (`tab`, `panel`, `example`, `tree-node`):  `named-holds`
   * - anything else:  `holds`
   * - The quoted-word tags are the tokenizer's (`P.Tokenizer.quotedNameTags`), each language's spellings.
   */
  private static componentShape(scope: P.Scope, help: SP.ComponentTagHelp): TagShape {
    const quoted = (scope.parser as SP.SpellParser | undefined)?.spellTokenizer.quotedNameTags ?? {}
    const quotedWord = quoted[help.tag] ?? quoted[withoutAccents(help.tag)]
    // oxfmt-ignore
    return help.empty ? "attributes"
      : quotedWord === P.QUOTED_CONTENTS ? "words"
      : quotedWord ? "named-holds"
      : "holds"
  }

  /** The completion fields that write `tag` whole, in `shape`, unless `after` shows it's written already. */
  private static tag(tag: string, shape: TagShape, after: string): Partial<CompletionItem> {
    if (CompletionShapes.isWrittenAfter(after)) return {}
    // oxfmt-ignore
    const snippet =
      shape === "named" ? `${tag} "$1" />`
      : shape === "closed" ? `${tag} />$0`
      : shape === "attributes" ? `${tag} $0 />`
      : shape === "words" ? `${tag}>$0</>`
      : shape === "named-holds" ? `${tag} "$1">\n\t$0\n</>`
      : /* shape === "holds" */ `${tag}>\n\t$0\n</>`
    return {
      insertText: snippet,
      insertTextFormat: InsertTextFormat.Snippet,
      ...(LISTS_NEXT.includes(shape) && { command: SHOW_SUGGESTIONS })
    }
  }
}

/**
 * How a tag is written whole, chosen from the suggestion list:
 * - `named`:  a quoted word names it, and it holds nothing, `<action "|" />`
 * - `closed`:  it holds nothing, `<divider />|`
 * - `attributes`:  it holds nothing, the caret where its attributes go, `<icon | />`
 * - `words`:  a few words, on its line, `<button>|</>`
 * - `named-holds`:  a quoted word names it, and it holds things, `<tab "|">`, a line in, `</>`
 * - `holds`:  it holds things, `<content>`, a line in, `</>`
 */
export type TagShape = "named" | "closed" | "attributes" | "words" | "named-holds" | "holds"

/** The shapes whose next words are listed the moment they're written:  an action's name, a tag's attributes. */
const LISTS_NEXT: readonly TagShape[] = ["named", "attributes"]
