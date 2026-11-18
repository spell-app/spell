/**
 * Stepping through a running program, a line at a time (epic `editor` P33, Q41):  what a DEBUGGING build's lines
 * call, and what the editor drives.
 * - A debugging build (`P.WriterOptions.debugging`, see `P.DebugSteps`) makes every action and handler wait, and
 *   writes a step before each of its lines:
 *
 *   ```js
 *   const frame$ = core._stepper.frame("/Pile.spell", 21, this, () => ({ "pile": pile }))
 *   try {
 *     if (frame$.at(25, () => ({ "points": points }))) await frame$.held()
 *     ...
 *   } finally {
 *     frame$.done()
 *   }
 *   ```
 *
 * - So a program stopped on a line is only WAITING:  the page around it, the editor, goes on.
 *   People's next actions wait their turn behind it, as behind any action that waits (`ActionQueue`).
 * - ONE `Stepper` per runtime copy:  `core._stepper`.
 *   The `_` keeps it out of the core contract (`unlistedCoreNames()`):  only the editor's runtime steps.
 * - No Solid:  the editor follows it with `onChange()`.
 * - Part of `core`:  imported by `spell/parser/core`'s barrel for its side effect.
 */
import { core } from "./core"

/** What the stepper does at the next line:  run on to a breakpoint, or stop by the way it was asked to step. */
export type StepMode = "run" | "into" | "over" | "out"

/** What the stepper tells who follows it, as it stops or goes on. */
export type StepperListener = (stepper: Stepper) => void

/****************
 * ### `DebugFrame`
 * One run of a function in a debugging build:  where it's written, its thing, its inputs, and the line it's on.
 * - Made as the function starts (`Stepper.frame()`);  its lines tell it where they are (`at()`).
 * - `caller`:  the frame whose line called it, if any, so a stopped line shows the functions that called it.
 ****************/
export class DebugFrame {
  /** The line it's on now, from 0:  the line it's declared on until its first line runs. */
  line: number
  /** Reads the values its lines have set so far, by spell's names. */
  private readValues: (() => Record<string, unknown>) | undefined

  constructor(
    private readonly stepper: Stepper,
    /** Its file's path, as the editor's files name it:  `/@spell/examples/Solitaire/Pile.spell`. */
    readonly path: string,
    /** The line it's declared on, from 0. */
    readonly declaredAt: number,
    /** The thing it's run on:  `this`. */
    readonly thing: unknown,
    /** Reads its inputs, by spell's names. */
    private readonly readInputs: (() => Record<string, unknown>) | undefined,
    /** The frame whose line called it. */
    readonly caller: DebugFrame | undefined
  ) {
    this.line = declaredAt
  }

  /** Its inputs, by spell's names:  `{ pile: <the pile> }`.  NEVER throws. */
  get inputs(): Record<string, unknown> {
    return readSafely(this.readInputs)
  }

  /** The values its lines have set so far, by spell's names.  NEVER throws. */
  get values(): Record<string, unknown> {
    return readSafely(this.readValues)
  }

  /** It and every frame that called it, innermost first. */
  get stack(): DebugFrame[] {
    const frames: DebugFrame[] = [this]
    for (let frame = this.caller; frame; frame = frame.caller) frames.push(frame)
    return frames
  }

  /** Is it `frame`, or one `frame` called, however deep? */
  isWithin(frame: DebugFrame): boolean {
    return this.stack.includes(frame)
  }

  /**
   * Its line `line` is next:  should it stop there?  What each line of a debugging build asks first.
   * - `values`:  reads what its lines have set so far.
   */
  at(line: number, values?: () => Record<string, unknown>): boolean {
    this.line = line
    this.readValues = values
    return this.stepper.arrived(this)
  }

  /** Wait here until the stepper says go on:  after `at()` said stop. */
  held(): Promise<void> {
    return this.stepper.hold(this)
  }

  /** Its function has ended, however it ended:  what a debugging build's function says last. */
  done(): void {
    this.stepper.ended(this)
  }
}

/****************
 * ### `Stepper`
 * Where the running program stops, and how it goes on:  the breakpoints, the way it's stepping, the line it's held on.
 * - Breakpoints by file and line (`setBreakpoints()`).
 * - Stopped:  `stopped`, the frame held, with its line, values and callers.
 * - Going on:  `goOn()` runs to the next breakpoint;  `stepOver()`, `stepInto()` and `stepOut()` stop again by the way.
 * - Several held at once (a second action reaching a breakpoint while the first is stopped):
 *   each waits its turn, the oldest shown.
 ****************/
export class Stepper {
  /** Each file's breakpoints, by its path:  lines from 0. */
  private readonly breakpoints = new Map<string, Set<number>>()
  /** How the next line decides to stop. */
  private mode: StepMode = "run"
  /** The frame stepping started from:  `over` and `out` measure from it. */
  private from: DebugFrame | undefined
  /** The frames held now, oldest first, each with what lets it go on. */
  private readonly held: Array<{ frame: DebugFrame; goOn: () => void }> = []
  /** Who's told as it stops or goes on. */
  private readonly listeners = new Set<StepperListener>()
  /** The frame whose line ran last:  what a function called now was called from. */
  private current: DebugFrame | undefined
  /** Is a turn's end coming, which forgets `current`?  See `noteCurrent()`. */
  private forgetting = false

  /** A frame for a function starting:  what a debugging build's function says first. */
  frame(path: string, declaredAt: number, thing: unknown, inputs?: () => Record<string, unknown>): DebugFrame {
    const frame = new DebugFrame(this, path, declaredAt, thing, inputs, this.current)
    this.noteCurrent(frame)
    return frame
  }

  /** The frame held now, shown:  the oldest held;  `undefined` while running. */
  get stopped(): DebugFrame | undefined {
    return this.held[0]?.frame
  }

  /** `path`'s breakpoints, lines from 0. */
  breakpointsIn(path: string): number[] {
    return [...(this.breakpoints.get(path) ?? [])].sort((a, b) => a - b)
  }

  /** Every file with a breakpoint, and its lines. */
  get allBreakpoints(): Map<string, number[]> {
    return new Map([...this.breakpoints.keys()].map((path) => [path, this.breakpointsIn(path)]))
  }

  /** Stop at `lines` of `path`, from 0, and nowhere else in it. */
  setBreakpoints(path: string, lines: Iterable<number>): void {
    const set = new Set(lines)
    if (set.size) this.breakpoints.set(path, set)
    else this.breakpoints.delete(path)
  }

  /** Run on to the next breakpoint. */
  goOn(): void {
    this.release("run")
  }

  /** Stop at the next line of the function stopped in, or of the one that called it once it's done. */
  stepOver(): void {
    this.release("over")
  }

  /** Stop at the very next line:  into a function the stopped line calls. */
  stepInto(): void {
    this.release("into")
  }

  /** Stop at the next line after the function stopped in is done:  back in the one that called it. */
  stepOut(): void {
    this.release("out")
  }

  /**
   * Let every held frame go on, and forget the breakpoints and the stepping:  for debugging turned off,
   * or the program started again.
   */
  reset(): void {
    this.breakpoints.clear()
    this.mode = "run"
    this.from = undefined
    this.current = undefined
    const held = this.held.splice(0)
    for (const { goOn } of held) goOn()
    if (held.length) this.tell()
  }

  /**
   * Forget whatever's held, never letting it go on, and the stepping;  keep the breakpoints:
   * for a program started afresh (`core.resetRuntime()`), whose old actions must not run on into the new one.
   */
  forgetHeld(): void {
    this.mode = "run"
    this.from = undefined
    this.current = undefined
    const held = this.held.splice(0)
    if (held.length) this.tell()
  }

  /** Hear each stop and go on;  returns what stops hearing. */
  onChange(listener: StepperListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  ////////////////
  // ## What a frame's lines call
  ////////////////

  /** `frame`'s line is next:  should it stop?  A breakpoint there, or the way it's stepping says so. */
  arrived(frame: DebugFrame): boolean {
    this.noteCurrent(frame)
    if (this.breakpoints.get(frame.path)?.has(frame.line)) return true
    const { mode, from } = this
    if (mode === "into") return true
    if (mode === "over") return !from || frame === from || !frame.isWithin(from)
    if (mode === "out") return !from || !frame.isWithin(from)
    return false
  }

  /**
   * `frame`'s function has ended:  what's called next is called from the one that called it.
   * - Stepping over or out of it, its caller's next line stops;  with no caller, the program runs on.
   */
  ended(frame: DebugFrame): void {
    if (this.current === frame) this.current = frame.caller
    if (this.mode === "run" || !this.from || !this.from.isWithin(frame)) return
    if (this.mode === "into") return
    const { caller } = frame
    this.from = caller
    if (caller) this.mode = "over"
    else this.mode = "run"
  }

  /** Hold `frame` until it's let go:  shown at once, unless another is shown already. */
  hold(frame: DebugFrame): Promise<void> {
    // stopped:  stepping starts again from here
    this.mode = "run"
    return new Promise<void>((resolve) => {
      this.held.push({
        frame,
        goOn: () => {
          // what its next line calls was called from it
          this.noteCurrent(frame)
          resolve()
        }
      })
      this.tell()
    })
  }

  /** Let the frame shown go on, stepping as `mode` says. */
  private release(mode: StepMode): void {
    const first = this.held.shift()
    if (!first) return
    this.mode = mode
    this.from = first.frame
    first.goOn()
    this.tell()
  }

  /**
   * SIDE EFFECT:  `frame`'s line ran last, so what's called now was called from it -- until this turn ends:
   * a person's next click, a turn later, calls from nowhere.
   */
  private noteCurrent(frame: DebugFrame): void {
    this.current = frame
    if (this.forgetting) return
    this.forgetting = true
    setTimeout(() => {
      this.forgetting = false
      this.current = undefined
    })
  }

  /** Tell each listener.  NEVER throws:  a listener's failure is logged. */
  private tell(): void {
    for (const listener of [...this.listeners]) {
      try {
        listener(this)
      } catch (error) {
        console.error(error)
      }
    }
  }
}

/** What `read` gives, or nothing:  a value read while its line hasn't set it yet is no failure.  NEVER throws. */
function readSafely(read: (() => Record<string, unknown>) | undefined): Record<string, unknown> {
  try {
    return read?.() ?? {}
  } catch {
    return {}
  }
}

/** This runtime copy's stepper:  see `Stepper`. */
export const stepper = new Stepper()

Object.assign(core, { _stepper: stepper })
