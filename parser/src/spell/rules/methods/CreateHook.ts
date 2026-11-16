import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Wording } from "spell/parser/spell/rules/expressions"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { CreateOneOfAKind } from "spell/parser/spell/rules/classes"
import type { MethodSignatureData } from "./methods.shared"
// Import directly to avoid circular import
import { MethodDefinition } from "./MethodDefinition"
import { ToDoSomething } from "./ToDoSomething"

/**
 * `create_hook` rule:  what runs as a thing is made, in its type's outline, e.g. `- when creating a task (with title as text):`.
 * - Spanish:  `- al crear una tarea (con título como texto):`.
 * - It names the type it sits in, as `to draw a card` does (Owen, 2026-11-11, epic `language`):
 *   another type there (`when creating a card` in a deck's outline) is refused, saying which to write.
 * - A one of a kind's says `it`, `- when creating it:` (`al crearlo`):  there's only ever one (`isOneOfAKind()`).
 *   - Or its own name, with or without `the`:  `- when creating solitaire:`, `- al crear el solitario:`
 *     (Owen, 2026-11-13, epic `language` P55).
 * - Any type's may name it with `the`, by its type's words or the built-in kind it is (epic `language` T129):
 *   `- when creating the deck:`, `- when creating the app:` in `solitaire is an app`, `- al crear la aplicación:`
 *   (`MethodDefinition.namesForItself()`).
 * - The older forms read too:  `- when created:`, `- al crearla:`.
 * - The type's `create()` hook, as `- to create it:` is:  core runs it once, after the thing's props are set,
 *   and hands it those props, so its `(with ...)` names read them (epic `spanish` P28).
 * - Its words are the language's `create_hook_words`:  `created` / `creating it`, `crearla` / `crear` ...;
 *   before the type, the verb those take `it` after:  `creating`, `crear`.
 * - A thing is made as any is:  `create a new task with title = "Shop"`, `a new task with ...`.
 * - Only in a type's outline;  anywhere else, or with other words, it isn't this rule:
 *   Spanish's `al ...` is also an event's handler (`al card click`), which it beats on the same words (`priority`).
 * - Registers no call rule:  nothing calls a hook by its words.
 */
export class CreateHook extends ToDoSomething {
  @proto static priority = Priority.specific
  // a hook, not an action:  never an undo step of its own
  @proto static undoableByDefault = false
  // a hook, so it can't be called off
  @proto static cancelable = false

  /** Only a `create_hook`'s words, in a type's outline. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match || !P.SubjectScope.of(scope)?.subjectType) return undefined
    const signature = (match.groups as { signature?: P.Match }).signature
    const words = signature?.inputText.split("(")[0]!.trim() ?? ""
    if (Wording.reads(scope, "create_hook_words", words, "create")) return match
    if (this.namesItself(words, scope)) return match
    return signature ? this.namingItsType(match, signature, words, scope) : undefined
  }

  /**
   * Are `words` the hook's verb, then a name for the thing it's made in (`MethodDefinition.namesForItself()`):
   * `creating solitaire`, `creating the solitaire`, `creating the app`, `crear la aplicación`?
   * - A one of a kind's name, `the` or not;  any other name only after `the`:  `creating a deck` is `namingItsType()`'s.
   */
  private namesItself(words: string, scope: P.Scope): boolean {
    const subject = P.SubjectScope.of(scope)!.subjectType!
    const oneOfAKind = CreateHook.isOneOfAKind(scope)
    const name = oneOfAKind ? CreateOneOfAKind.variableName(P.SubjectScope.of(scope)!.declaredBy!) : undefined
    return MethodDefinition.namesForItself(subject, scope).some(({ words: named }) => {
      if (!words.toLowerCase().endsWith(` ${named}`)) return false
      let verb = words.slice(0, -named.length).trim()
      const article = verb.split(" ").at(-1)!
      const hasThe = article !== verb && Wording.reads(scope, "definite_article", article)
      if (hasThe) verb = verb.slice(0, -article.length).trim()
      else if (named !== name) return false
      return this.readsHookVerb(verb, scope)
    })
  }

  /** Is `verb` the hook's verb, alone (`crear`) or as it reads before `it` (`creating it`)? */
  private readsHookVerb(verb: string, scope: P.Scope): boolean {
    // no `itWords` is `it` itself
    const itWords = [...(SP.Language.of(scope).words.itWords ?? [IT])]
    const readsVerb = (form: string) => Wording.reads(scope, "create_hook_words", form, "create")
    return !!verb && (readsVerb(verb) || itWords.some((it) => readsVerb(`${verb} ${it}`)))
  }

  /**
   * `match` when its words are the hook's verb, then its type:  `creating a deck`, `crear una baraja`;
   * refused when that type isn't the one it sits in;  else `undefined`.
   * - The verb is the one the language's `it` follows in `create_hook_words` (`creating it`, `crear la`).
   */
  private namingItsType(match: P.MatchFor<this>, signature: P.Match, words: string, scope: P.Scope) {
    // its type, the last of its words:  the item as written, as `processSignature()` may have run on its bits
    const { types, argMatches } = signature.data as MethodSignatureData
    const named = types.find((type) => !type.isSimple)
    const item = named && argMatches[named.argIndex]?.inputText.trim()
    if (!named || !item || !words.endsWith(item)) return undefined
    const verb = words.slice(0, -item.length).trim()
    if (!this.readsHookVerb(verb, scope)) return undefined
    const subjectScope = P.SubjectScope.of(scope)!
    const subject = subjectScope.subjectType!
    if (scope.getType(named.name) === subject) return match
    // the type's words as its declaration wrote them, `stock pile`
    const declared = (subjectScope.declaredBy?.groups as { type?: P.Match } | undefined)?.type
    const typeWords = `${declared?.raw ?? subject.name}`.replace(/"/g, "")
    const language = SP.Language.of(scope)
    return SpellStatement.refuse(
      match,
      language.parserMessage("create-hook-names-another-type", {
        verb,
        aType: language.withArticle("indefinite", typeWords, subject)
      })
    )
  }

  /**
   * Is the outline `scope` is in a one of a kind's (`solitaire is an app`)?
   * - Then its hook says `it`, `when creating it`:  there's only ever one, and its name may be no noun
   *   (`public servers is an app`).
   */
  static isOneOfAKind(scope: P.Scope): boolean {
    return !!P.SubjectScope.of(scope)?.declaredBy?.is(CreateOneOfAKind)
  }

  /** The type's `create()`, whatever its words:  its `(with ...)` kept. */
  processSignature(groups: P.MatchGroups, signature: MethodSignatureData, scope: P.Scope): MethodSignatureData {
    const processed = super.processSignature(groups, signature, scope)
    processed.methodBits = ["create"]
    return processed
  }

  /** Records the method, but no call rule:  nothing calls a hook by its words. */
  mutateScope(match: P.MatchFor<this>): void {
    this.addMethod(match)
  }

  /** Nothing to call ahead of it either. */
  callAhead(): void {}
}

/** `it`, the `it` variable's own name:  what a language with no `itWords` says (`SP.LanguageWords.itWords`). */
const IT = "it"
