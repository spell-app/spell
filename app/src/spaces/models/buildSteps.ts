/**
 * The steps of making a project ready to run, as the page server tells every open page (epic `editor` P45).
 * - The page server compiles a project the moment a page asks for a built file of it that isn't there
 *   (spaces' `ProjectBuild`), and passes each step on over its live channel (the kit's `LiveReload.send()`).
 * - A page's live client hands each on as a `BUILD_STEP_PAGE_EVENT` on `window`:
 *   the runner's waiting box and the editor's loading screen say the step's words (`AppTexts`' `buildStep...` keys).
 * - Plain data:  safe in a browser, and in the server's node.
 */

/**
 * A step, in the order they come:
 * - `reading`:  the page server found the project isn't built, and started on it
 * - `compiling`:  the compile has read the project, and is compiling it
 * - `checking`:  compiled, and being checked (its TypeScript, its scope pack)
 * - `built`:  done, its file there
 * - `mistakes`:  done, but the project has mistakes:  its files are written all the same (epic `editor` J350),
 *   so a run that then fails says the project has mistakes, rather than that it isn't there
 * - The page adds its own last one, starting it, once it has the file:  the server never sends that.
 */
export type BuildStepName = (typeof BUILD_STEPS)[number]

/** Every step the server sends, in order. */
export const BUILD_STEPS = ["reading", "compiling", "checking", "built", "mistakes"] as const

/** One step of one project:  `BUILD_STEP_EVENT`'s data. */
export type BuildStep = {
  /** The project, by its address, e.g. `@spell/examples/Solitaire`. */
  projectId: string
  /** How far it's got. */
  step: BuildStepName
}

/** The live channel's event for a build step (`{ event: "build-step", data: BuildStep }`). */
export const BUILD_STEP_EVENT = "build-step"

/** The `window` event a page's live client turns `BUILD_STEP_EVENT` into:  a `CustomEvent<BuildStep>`. */
export const BUILD_STEP_PAGE_EVENT = "spell-server:build-step"

/** Is `step` one still under way, so a page waiting on it keeps waiting? */
export function isUnderWay(step: BuildStepName): boolean {
  return step === "reading" || step === "compiling" || step === "checking"
}

/**
 * How `spell compile` tells the page server each step:  a line on its stderr, `spell-step: compiling <projectId>`,
 * which spaces' `ProjectBuild` reads and passes on (`buildStepLine()`, `buildStepIn()`).
 * - Printed only when its environment sets `BUILD_STEPS_VARIABLE`:  the page server's compiles, never a person's.
 */
export const BUILD_STEP_PREFIX = "spell-step:"

/** The environment variable that has `spell compile` print its steps (`BUILD_STEP_PREFIX`):  `"1"`. */
export const BUILD_STEPS_VARIABLE = "SPELL_COMPILE_STEPS"

/** The line `spell compile` prints for `step` of `projectId`. */
export function buildStepLine({ projectId, step }: BuildStep): string {
  return `${BUILD_STEP_PREFIX} ${step} ${projectId}`
}

/** The step a line of `spell compile`'s says, if it's one (`buildStepLine()`);  else `undefined`. */
export function buildStepIn(line: string): BuildStep | undefined {
  if (!line.startsWith(BUILD_STEP_PREFIX)) return undefined
  const [, step, projectId] = /^\s*(\S+)\s+(.+?)\s*$/.exec(line.slice(BUILD_STEP_PREFIX.length)) ?? []
  if (!step || !projectId || !(BUILD_STEPS as readonly string[]).includes(step)) return undefined
  return { projectId, step: step as BuildStepName }
}
