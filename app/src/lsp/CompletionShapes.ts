import { InsertTextFormat, type Command, type CompletionItem } from "vscode-languageserver"

import { withoutAccents } from "spell/util/string"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

/** What the editor runs to show the suggestion list again, the moment a completion is written:  VS Code's and Monaco's. */
const SHOW_SUGGESTIONS: Command = { title: "", command: "editor.action.triggerSuggest" }

/**
 * How each of spell's own tags is written, by what it means (`SP.spellTagsIn()`):
 * - `action`:  a button for one of the program's actions, `<action "auto play" />`
 * - `divider`, `slot` (`<children/>`):  hold nothing
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
 * - `<act` => `<action "|" />`, the program's actions listed at once;  `<divider/>|`;  `<content>`, a line in, `</>`.
 * - `<segment col` => `color="|"`, its words listed at once;  `fluid` alone, as it takes no value.
 * - What's already written after the caret is never doubled:  then only the name is (`isWrittenAfter()`).
 * - Each snippet leaves out the `<`:  the editor replaces only the word being typed, after it.
 * - Closing tags are `</>`, as the examples write them (the app folder's AGENTS.md, "Writing an example").
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
   * - holds nothing (no default slot):  `<icon |/>`, its attributes listed at once
   * - its quoted word is its contents (`button`, `header`, `label` ...):  `<button>|</>`, a few words on one line
   * - a quoted word names it (`tab`, `panel`, `example`, `tree-node`):  `<tab "|">`, a line in, `</>`
   * - anything else holds things:  `<content>`, a line in, `</>`
   * - The quoted-word tags are the tokenizer's (`P.Tokenizer.quotedNameTags`), each language's spellings.
   */
  static componentTag(scope: P.Scope, help: SP.ComponentTagHelp, after: string): Partial<CompletionItem> {
    const quoted = (scope.parser as SP.SpellParser | undefined)?.spellTokenizer.quotedNameTags ?? {}
    const quotedWord = quoted[help.tag] ?? quoted[withoutAccents(help.tag)]
    // oxfmt-ignore
    const shape: TagShape =
      help.empty ? "attributes"
      : quotedWord === P.QUOTED_CONTENTS ? "words"
      : quotedWord ? "named-holds"
      : "holds"
    return CompletionShapes.tag(help.tag, shape, after)
  }

  /**
   * The completion fields that write attribute `help.name` whole:  `color="|"`, its words listed at once if it has
   * any;  one that takes no value (`bare`) by its name alone.
   * - Only the name when an `=` already follows it.
   */
  static attribute(help: SP.ComponentAttributeHelp, after: string): Partial<CompletionItem> {
    if (help.bare || /^[\p{L}\p{M}\d_-]*\s*=/u.test(after)) return {}
    return {
      insertText: `${help.name}="$1"`,
      insertTextFormat: InsertTextFormat.Snippet,
      ...(help.values.length && { command: SHOW_SUGGESTIONS })
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

  /** The completion fields that write `tag` whole, in `shape`, unless `after` shows it's written already. */
  private static tag(tag: string, shape: TagShape, after: string): Partial<CompletionItem> {
    if (CompletionShapes.isWrittenAfter(after)) return {}
    // oxfmt-ignore
    const snippet =
      shape === "named" ? `${tag} "$1" />`
      : shape === "closed" ? `${tag}/>$0`
      : shape === "attributes" ? `${tag} $0/>`
      : shape === "words" ? `${tag}>$0</>`
      : shape === "named-holds" ? `${tag} "$1">\n\t$0\n</>`
      : /* shape === "holds" */ `${tag}>\n\t$0\n</>`
    const listsNext = shape === "named" || shape === "attributes"
    return {
      insertText: snippet,
      insertTextFormat: InsertTextFormat.Snippet,
      ...(listsNext && { command: SHOW_SUGGESTIONS })
    }
  }
}

/**
 * How a tag is written whole, chosen from the suggestion list:
 * - `named`:  a quoted word names it, and it holds nothing, `<action "|" />`
 * - `closed`:  it holds nothing, `<divider/>|`
 * - `attributes`:  it holds nothing, the caret where its attributes go, `<icon |/>`
 * - `words`:  a few words, on its line, `<button>|</>`
 * - `named-holds`:  a quoted word names it, and it holds things, `<tab "|">`, a line in, `</>`
 * - `holds`:  it holds things, `<content>`, a line in, `</>`
 */
export type TagShape = "named" | "closed" | "attributes" | "words" | "named-holds" | "holds"
