import { Observable, prop, setDebugGlobal } from "spell/util"

import type { SP } from "spell/parser/spell"
import type { DebugFrame, Stepper } from "spell/parser/core/stepping"
import { editor, runtimeCore } from "spell/app/app/editor"

/****************
 * ### `Debugging`
 * The editor's step debugger (epic `editor` P33):  where the running program stops, and how it goes on.
 * - A click in the code's left margin puts a breakpoint there (`CodeMirrorDebug`), and starts debugging:
 *   the program runs again, keeping the game in progress, from its DEBUGGING BUILD (Q41 A,
 *   `SP.SpellProject.debugCodeWithMap()`), where each line of an action asks first whether to go on.
 * - Stopped on a line, only that action waits:  the editor goes on, and people's next clicks wait their turn.
 *   - `stopped`:  where, with its thing, its inputs, the values its lines have set, and the actions that called it.
 *   - `goOn()`, `stepOver()`, `stepInto()`, `stepOut()`:  the debugger's bar, and F5, F10, F11, ⇧F11.
 * - `stop()` runs the shipped build again, the game still in progress, its breakpoints kept for next time.
 * - The stepper itself is the running program's (`core._stepper`, `spell/parser/core`'s stepping):
 *   this only tells it the breakpoints and the way to step, and follows it.
 * - ONE for the page, `debugging`;  methods say `debugging.x`, NEVER `this`:  they're handed around unbound.
 * - Its position in the import graph:  the editor, and the core's TYPES only (`spellRuntime.ts` is the one copy of it).
 *   No Solid, no CodeMirror:  `<Debugger>` draws it, `CodeMirrorDebug` puts its marks in the code.
 ****************/
export class Debugging extends Observable {
  /** Is the program running from its debugging build? */
  @prop({ default: false })
  accessor isOn!: boolean

  /** Where it's stopped now, a new one at each stop;  `undefined` while it runs. */
  @prop()
  accessor stopped: StoppedLine | undefined

  /** Each file's breakpoints, by its path, lines from 0:  as the code's margin last said. */
  readonly breakpoints = new Map<string, number[]>()

  /** The debugging build, for the program it was made from:  made again only when that's compiled again. */
  private build: { from: string; code: string; map: string } | undefined
  /** The stepper followed, and what stops following it. */
  private followed: { stepper: Stepper; stop: () => void } | undefined

  ////////////////
  // ## Starting and stopping
  ////////////////

  /**
   * Run the program from its debugging build, the game still in progress.
   * - Nothing if it's on already.
   */
  start = (): void => {
    if (debugging.isOn) return
    debugging.isOn = true
    debugging.rerun()
  }

  /** Run the shipped build again, letting go of whatever's stopped;  the breakpoints are kept for next time. */
  stop = (): void => {
    if (!debugging.isOn) return
    debugging.isOn = false
    debugging.stepper()?.reset()
    debugging.stopped = undefined
    debugging.rerun()
  }

  /**
   * The code to run for `project`, its source map beside it:  its debugging build while debugging's on;
   * none, the shipped build.
   * - What the editor runs (`editor.executeCompiledApp()`);  never what's saved, nor what its tests run.
   * - Made once per compile of the project.
   * - NEVER throws:  a project that can't be written so says why, and runs its shipped build.
   */
  buildFor(project: SP.SpellProject, compiled: string): { code: string; map: string } | undefined {
    if (!debugging.isOn) return undefined
    if (debugging.build?.from !== compiled) {
      try {
        const { code, map } = project.debugCodeWithMap()
        debugging.build = { from: compiled, code, map: JSON.stringify(map) }
      } catch (error) {
        editor.showError(error as Error)
        return undefined
      }
    }
    debugging.follow()
    return debugging.build
  }

  ////////////////
  // ## Breakpoints
  ////////////////

  /**
   * `path`'s breakpoints are now `lines`, from 0:  what the code's margin says, as one's clicked or the text moves.
   * - The first one starts debugging.
   */
  setBreakpoints = (path: string, lines: number[]): void => {
    if (lines.length) debugging.breakpoints.set(path, lines)
    else debugging.breakpoints.delete(path)
    debugging.stepper()?.setBreakpoints(path, lines)
    if (lines.length) debugging.start()
  }

  ////////////////
  // ## Going on
  ////////////////

  /** Run on to the next breakpoint.  `false` when nothing's stopped:  a key goes on. */
  goOn = (): boolean => debugging.release((stepper) => stepper.goOn())

  /** Stop on the next line of this action, or of the one that called it once it's done.  `false` when nothing's stopped. */
  stepOver = (): boolean => debugging.release((stepper) => stepper.stepOver())

  /** Stop on the very next line, inside an action this line calls.  `false` when nothing's stopped. */
  stepInto = (): boolean => debugging.release((stepper) => stepper.stepInto())

  /** Stop on the next line after this action is done.  `false` when nothing's stopped. */
  stepOut = (): boolean => debugging.release((stepper) => stepper.stepOut())

  /** Let what's stopped go on, as `step` says;  `false` when nothing's stopped. */
  private release(step: (stepper: Stepper) => void): boolean {
    const stepper = debugging.stepper()
    if (!stepper?.stopped) return false
    step(stepper)
    return true
  }

  ////////////////
  // ## The running program's stepper
  ////////////////

  /** The running program's stepper:  none before its runtime has loaded. */
  private stepper(): Stepper | undefined {
    return (runtimeCore() as { _stepper?: Stepper } | undefined)?._stepper
  }

  /** Follow the running program's stepper, and tell it the breakpoints:  once per runtime. */
  private follow(): void {
    const stepper = debugging.stepper()
    if (!stepper || debugging.followed?.stepper === stepper) return
    debugging.followed?.stop()
    for (const [path, lines] of debugging.breakpoints) stepper.setBreakpoints(path, lines)
    const stop = stepper.onChange(() => {
      const frame = stepper.stopped
      debugging.stopped = frame ? { frame, path: frame.path, line: frame.line } : undefined
    })
    debugging.followed = { stepper, stop }
  }

  /**
   * Run the program again, the game kept:  from the build `buildFor()` now says.
   * - NEVER throws:  a failure is the editor's to show.
   */
  private rerun(): void {
    void editor.executeCompiledApp().catch((error: unknown) => editor.showError(error as Error))
  }
}

/** Where the running program's stopped:  see `Debugging.stopped`. */
export type StoppedLine = {
  /** The action stopped in:  its thing, inputs, values and callers. */
  frame: DebugFrame
  /** Its file's path, as the editor's files have it. */
  path: string
  /** The line, from 0. */
  line: number
}

/** The editor's step debugger:  see `Debugging`. */
export const debugging = new Debugging()

setDebugGlobal({ debugging })
