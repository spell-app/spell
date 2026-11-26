import { readdirSync } from "node:fs"
import { join, resolve } from "node:path"

import { checkoutOf } from "./checkout.ts"
import { Heartbeat } from "./Heartbeat.ts"
import { keeperHome } from "./KeeperLink.ts"
import { RealPath } from "./RealPath.ts"

/****************
 * ### `CheckoutUse`
 * A worktree marked IN USE by a program working in it, so the server keeper never stops its servers for being unused
 * (epic `epic-engine` I459).
 *
 * ```ts
 * const done = CheckoutUse.hold(process.cwd(), "epic turns:  yarn test")   // a mark, beating every 30s
 * CheckoutUse.isInUse(checkout)                                           // true while a live mark names it
 * done()                                                                   // the mark goes;  so it does however the process ends
 * ```
 *
 * - Why:  the keeper's idle stop counts only the page server's open pages and requests;  a command waiting in
 *   `epic turns`' line, or app tests talking to the editor, touch neither, and lost their editor mid-run
 * - Each mark is a beat of its own (`Heartbeat.hold()`), `<keeperHome()>/in-use/<pid>-<n>.json`, `{ checkout, why }`
 * - Who marks:  spell-epic's `Turns`, while a turn is waited for or held;  this side names none of them
 * - node's own modules and the server's plain-node files only
 ****************/
export class CheckoutUse {
  /**
   * Mark the checkout `path` is in as in use, for `why`, until the undo it returns is called or the process ends.
   * - a path in no checkout:  nothing marked
   * - NEVER throws:  a mark that can't be made is skipped (the server may then stop, as before)
   */
  static hold(path: string, why: string): () => void {
    const root = checkoutOf(path)?.root
    if (!root) return () => {}
    try {
      const file = join(CheckoutUse.folder(), `${process.pid}-${++CheckoutUse.count}.json`)
      return Heartbeat.hold(file, { checkout: resolve(root), why })
    } catch {
      return () => {}
    }
  }

  /** The live marks, each `{ checkout, why, pid, seen }`.  NEVER throws. */
  static marks(): UseMark[] {
    let names: string[] = []
    try {
      names = readdirSync(CheckoutUse.folder())
    } catch {
      return []
    }
    return names.flatMap((name) => {
      const mark = Heartbeat.liveIn<UseMark>(join(CheckoutUse.folder(), name))
      return mark && typeof mark.checkout === "string" ? [mark] : []
    })
  }

  /** Whether a live mark names `checkout` (its root, links followed).  NEVER throws. */
  static isInUse(checkout: string): boolean {
    return CheckoutUse.marks().some((mark) => RealPath.same(mark.checkout, checkout))
  }

  /** The marks' folder, in the keeper's home. */
  static folder(): string {
    return join(keeperHome(), "in-use")
  }

  /** Marks made by this process so far:  two in one process get two files. */
  private static count = 0
}

/** One mark, as kept:  its checkout's root, why, and its beat. */
export type UseMark = { checkout: string; why: string; pid: number; seen: string }
