import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import
import { AfterHook, type HookMoment } from "./AfterHook"

/**
 * `while_hook` rule:  steps that run as an action starts, whose changes are put back when it ends, worked or failed
 * (epic `data` P50, Q94).
 * - e.g. `while completing a job`, then `set the busy note to "Completing ..."`:  the note shows while the server
 *   works, and goes back to what it was once it answers.
 * - Spanish:  `mientras se completa un trabajo`, the verb as it's said there (`SP.LanguageWords.verbsForDuring`).
 * - Runs before the `before` steps, from the page in to the API file;  a page's only while it's shown.
 * - Compiles to a method of the action's type (in a page's file, of the page, given the job:  `AfterHook`), then
 *   `core.addActionHook(Job, "complete", { moment: "while", hook: "whileComplete", level: "page", page: JobsPage })`.
 */
export class WhileHook extends AfterHook {
  @proto static moment: HookMoment = "while"
  // words naming no action are a `while` handler's:  `- while the mouse is down:`
  @proto static refusesWhenNoAction = false

  /** The verb as the language says it after `while`:  English's `completing`, Spanish's `completa`. */
  protected verbsFor(scope: P.Scope): ((word: string) => string[]) | undefined {
    const { words } = SP.Language.of(scope)
    return words.verbsForDuring ?? words.verbsForDoing
  }
}
