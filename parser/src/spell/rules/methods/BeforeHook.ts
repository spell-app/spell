import { proto } from "spell/util"
// Import directly to avoid circular import
import { AfterHook, type HookMoment } from "./AfterHook"

/**
 * `before_hook` rule:  steps that run before an action's own, from any file (epic `data` P50, Q81).
 * - e.g. `before completing a job`, its steps under it:  `cancel if the job's status is "done"` stops it,
 *   and nothing is sent to the server.
 * - Spanish:  `antes de completar un trabajo`.
 * - Its words name the action as an `after` hook's do (`after_hook`);  its steps see its blanks, `the job`.
 * - Several files' run from the page in to the API file (`AfterHook.levelOf()`);  a page's only while it's shown.
 * - Compiles to a method of the action's type, then
 *   `core.addActionHook(Job, "complete", { moment: "before", hook: "beforeComplete", level: "api" })`.
 */
export class BeforeHook extends AfterHook {
  @proto static moment: HookMoment = "before"
}
