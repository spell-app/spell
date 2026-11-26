import {
  captureArtifact,
  expectRerunBudget,
  type CaptureOptions,
  type DiagnosticCode,
  type DiagnosticEvent,
  type DiagnosticsArtifact,
  type RerunBudgetOptions
} from "@solidjs/diagnostics"
import { OBSERVE } from "solid-js"
import { afterEach, beforeEach, vi } from "vite-plus/test"

/**
 * Fail a test on Solid's dev warnings, or on more re-runs than it should cause.
 * - Solid's dev build reports each reactive mistake as a coded event (`STRICT_READ_UNTRACKED`,
 *   `REACTIVE_WRITE_IN_OWNED_SCOPE` ...), and can record every computation that re-ran, and why.
 * - This runs a test's steps with both recorded (Solid's diagnostics package, `@solidjs/diagnostics`:  dev only,
 *   never shipped), then checks what they saw:
 *   - `expectNone()`:  no warning, but the codes it's told to allow;  a failure names each code, where it happened,
 *     the fix Solid gives and its docs page
 *   - `expectRerunBudget()`:  at most so many re-runs, of every computation or of one by name
 *   - `capture()`:  the record itself, for a test that reads it
 * - The steps' console stays quiet:  Solid's dev build also prints each warning, and the record holds them.
 * - For every set's tests (`spell/test-helpers/SolidDiagnostics`, epic `solid-2-final` P22), in a browser project
 *   on Solid's dev build:  it knows only Solid.
 */
export class SolidDiagnostics {
  /**
   * Run `steps` with Solid's diagnostics and re-runs recorded;  returns the record.
   * - `options` are `captureArtifact()`'s:  `scenario` names the record, `attribution: false` records warnings only.
   * - Flushes Solid's queue after the steps, so what their last writes set off is counted.
   * - throws if the page runs Solid's production build (no dev channels)
   */
  static async capture(
    steps: () => unknown,
    options: CaptureOptions & SolidDiagnosticsOptions = {}
  ): Promise<DiagnosticsArtifact> {
    const { quiet = true, ...captureOptions } = options
    const restore = quiet ? SolidDiagnostics.quietConsole() : () => {}
    try {
      const { artifact } = await captureArtifact(steps, captureOptions)
      return artifact
    } finally {
      restore()
    }
  }

  /**
   * Run `steps`;  fail if Solid warned about anything not in `allow` (or, with `only`, about any code in it).
   * - `allow`:  codes we accept on purpose;  say why where you pass one
   * - `only`:  check just these codes, for a test about one mistake in code that may warn of others
   * - Returns the record.
   */
  static async expectNone(steps: () => unknown, options: NoWarningsOptions = {}): Promise<DiagnosticsArtifact> {
    const artifact = await SolidDiagnostics.capture(steps, { scenario: options.scenario, quiet: options.quiet })
    SolidDiagnostics.check(artifact, options)
    return artifact
  }

  /** Fail if `artifact` holds a warning `options` doesn't let through (`expectNone()`'s check, for a record in hand). */
  static check(artifact: DiagnosticsArtifact, options: Pick<NoWarningsOptions, "allow" | "only"> = {}) {
    const allowed = new Set(options.allow ?? [])
    const checked = options.only && new Set(options.only)
    const found = artifact.diagnostics.filter(
      (event) => !allowed.has(event.code) && (!checked || checked.has(event.code))
    )
    if (!found.length) return
    const lines = found.map((event) => SolidDiagnostics.describe(event))
    throw new SolidWarningError(`Solid warned ${found.length} time(s):\n${lines.join("\n")}`, { cause: { found } })
  }

  /**
   * Run `steps`;  fail if they made Solid re-run more than `max` computations (only `scope`'s, when given:
   *   a name, or a pattern of names).
   * - A failure lists each re-run, what it was and what changed to cause it (`expectRerunBudget()`'s).
   * - Returns the record.
   */
  static async expectRerunBudget(
    steps: () => unknown,
    max: number,
    options: RerunBudgetOptions & SolidDiagnosticsOptions = {}
  ): Promise<DiagnosticsArtifact> {
    const { scope, ...captureOptions } = options
    const artifact = await SolidDiagnostics.capture(steps, captureOptions)
    expectRerunBudget(artifact, max, { scope })
    return artifact
  }

  /**
   * Fail EVERY test of a project in which Solid warns, but for the codes in `allow`:  a test project opts in by
   *   calling it from a setup file.
   * - Each test is watched from its first `beforeEach` to its last `afterEach`;  a warning fails it there,
   *   as `expectNone()` would, after the test's own checks.
   * - A test that warns on purpose (a mistake it plants) says so:  `SolidDiagnostics.allowInThisTest(code)`.
   * - Solid's dev build reports some codes once per page (`LOWERCASE_EVENT_ATTRIBUTE`, once per attribute name):
   *   the first test to cause one is the one that fails.
   * - The console isn't quieted:  a project's tests print what Solid says, as before.
   */
  static watchEveryTest(options: Pick<NoWarningsOptions, "allow"> = {}) {
    let watch: { stop(): DiagnosticEvent[] } | undefined
    beforeEach(() => {
      SolidDiagnostics.allowedNow = []
      watch = SolidDiagnostics.channel().capture()
    })
    afterEach(() => {
      const diagnostics = watch?.stop() ?? []
      watch = undefined
      const allow = [...(options.allow ?? []), ...SolidDiagnostics.allowedNow]
      SolidDiagnostics.check({ diagnostics } as DiagnosticsArtifact, { allow })
    })
  }

  /** Let the running test cause Solid warnings with these codes, under `watchEveryTest()`. */
  static allowInThisTest(...codes: DiagnosticCode[]) {
    SolidDiagnostics.allowedNow.push(...codes)
  }

  /** The codes the running test allows (`allowInThisTest()`). */
  private static allowedNow: DiagnosticCode[] = []

  /** Solid's dev channel of warnings;  throws on Solid's production build, which has none. */
  private static channel() {
    if (!OBSERVE) throw new Error("SolidDiagnostics:  this page runs Solid's production build;  test with its dev build")
    return OBSERVE.diagnostics
  }

  /** `event` as one line:  its code, where, Solid's message (which says the fix) and its docs page. */
  static describe(event: DiagnosticEvent): string {
    const where = [event.ownerPath?.join(" › "), event.loc && `(${event.loc})`].filter(Boolean).join(" ")
    return `- ${event.code}${where ? ` in ${where}` : ""}:  ${event.message}\n  SEE:  ${GUIDE_URL}${kebab(event.code)}`
  }

  /** Silence `console.warn` / `info` / `log` until the returned function is called. */
  private static quietConsole(): () => void {
    const spies = QUIETED.map((method) => vi.spyOn(console, method).mockImplementation(() => {}))
    return () => spies.forEach((spy) => spy.mockRestore())
  }
}

/** Thrown by `SolidDiagnostics.expectNone()` / `check()`:  Solid warned;  `cause.found` holds the events. */
export class SolidWarningError extends Error {
  declare cause: { found: DiagnosticEvent[] } | undefined
}
SolidWarningError.prototype.name = "SolidWarningError"

/** What every `SolidDiagnostics` run takes. */
export interface SolidDiagnosticsOptions {
  /** silence the console while the steps run (default `true`):  Solid's dev build prints each warning too */
  quiet?: boolean
}

/** `SolidDiagnostics.expectNone()`'s options. */
export interface NoWarningsOptions extends SolidDiagnosticsOptions {
  /** codes accepted on purpose */
  allow?: DiagnosticCode[]
  /** check only these codes */
  only?: DiagnosticCode[]
  /** the record's name */
  scenario?: string
}

/** The console methods `quiet` silences:  where Solid's dev build prints its warnings and notes. */
const QUIETED = ["warn", "info", "log"] as const

/** Each code's page on Solid's docs:  this, then the code in kebab case (`strict-read-untracked`). */
const GUIDE_URL = "https://docs.solidjs.com/reference/solid-js/diagnostics/"

/** `STRICT_READ_UNTRACKED` => `strict-read-untracked` */
const kebab = (code: string) => code.toLowerCase().replaceAll("_", "-")
