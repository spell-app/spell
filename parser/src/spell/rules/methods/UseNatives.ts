import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { CallNative } from "./CallNative"

/**
 * `use_natives` rule:  at the top of a Spell file, say which code file the functions its `call native` lines call
 * come from (epic `from-console` P10, Q15).
 * - e.g. `use copyText from clipboard.ts`
 * - e.g. `use copyText, pasteText from clipboard.ts`:  several, with commas
 * - e.g. `use all from clipboard.ts`:  every function it exports
 * - Spanish:  `usar copyText de clipboard.ts`, `usar todo de clipboard.ts`.
 * - So a reader sees, at the top of the file, where each native comes from.
 * - The file must still be listed in the project file, and must export each name:  else the line is refused.
 * - A name a `use` line names comes from its file, even when another code file exports one too;
 *   a name none names is looked for in every code file the project lists (`SP.NativeCode.find()`).
 * - Each target reads its own file:  Python swaps the ending, `clipboard.ts` => `clipboard.py`, beside it.
 * - Compiles to a comment, the line as written:  the imports themselves come from the calls.
 */
export class UseNatives extends SpellStatement<
  "all?|file|ending",
  { native?: SP.NativeCode; names?: string[] | "all" }
> {
  @proto static alias = "statement"

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const language = SP.Language.of(scope)
    const file = `${match.groups.file.value}.${match.groups.ending.value}`
    const native = SP.NativeCode.named(scope, file)
    if (!native) return SpellStatement.refuse(match, language.parserMessage("native-file-not-listed", { file }))
    // the tokens are already split at the commas:  each name is one word
    const names = match.groups.all ? "all" : CallNative.repeatedIn(match).map((name) => `${name.value}`)
    const missing = names === "all" ? undefined : names.find((name) => !native.exports(name))
    if (missing) {
      return SpellStatement.refuse(match, language.parserMessage("native-not-in-file", { name: missing, file }))
    }
    match.data.native = native
    match.data.names = names
    return match
  }

  /** SIDE EFFECT:  its file's `call native` lines take these names from its code file. */
  mutateScope(match: P.MatchFor<this>) {
    const { native, names } = match.data
    if (native && names) SP.NativeCode.useIn(match.scope, names, native)
  }

  /** The line as written, as a comment. */
  getAST(match: P.MatchFor<this>): P.ASTLineComment {
    return new P.ASTLineComment(match, { initialWhitespace: " ", value: match.inputText.trim() })
  }
}
