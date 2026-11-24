/**
 * Child process of `spell speedtest --pipeline`:  times the editing pipeline on Solitaire once, and prints the
 * results as JSON, the last line on stdout (epic `solid-2-final` P1).
 * - Started by `speedtestCommand.ts` as `node --import tsx/esm pipelineTimes.mts`, one process a run, so its
 *   `startup` (loading the parser and the project's groups) is cold.
 * - Each step's CPU time, not the clock's, so a busy machine slows it far less;  one pass to warm up, then the
 *   median of `REPS`, as the rule tests are timed:
 *   - `startup`:  loading the parser, once, cold
 *   - `parse`:  a cold parse of Solitaire whole, on a new incremental project
 *   - `edit.<kind>`:  the four edits the incremental tests make (insert a character, delete one, delete the line,
 *     duplicate it), one a line in turn on every seventh line of every file, each then undone;  the time per edit, ms
 *     - each with the span of text it changed, as the editor hands it over (`P.EditedSpan`, epic `solid-2-final` P9)
 *   - `compile`:  every file's JavaScript, then the whole program's, as `SpellProject` writes `<Project>.spell.js`
 * - Never `spell/app/cli`:  it needs only spell, and the fixtures' helpers.
 */
// spell logs as it loads:  silence it all BEFORE loading anything
for (const method of ["log", "info", "debug", "warn", "group", "groupCollapsed", "groupEnd"] as const) {
  console[method] = () => {}
}

/** One pass to warm up, then this many, their median kept. */
const REPS = 3

/** The project timed. */
const PROJECT = "@spell/examples/Solitaire"

/** Every this-many-th line is edited, as the incremental tests edit it. */
const STEP = 7

/** The edits, made to one line of `lines` in place:  as the incremental tests make them. */
const EDITS: Record<string, (lines: string[], index: number) => void> = {
  insert: (lines, index) => (lines[index] += "x"),
  delete: (lines, index) => (lines[index] = lines[index]!.slice(0, -1)),
  deleteLine: (lines, index) => void lines.splice(index, 1),
  duplicateLine: (lines, index) => void lines.splice(index, 0, lines[index]!)
}

/** CPU milliseconds `work` takes. */
function cpuOf(work: () => void): number {
  const start = process.cpuUsage()
  work()
  const { user, system } = process.cpuUsage(start)
  return (user + system) / 1000
}

/** The median of `values`. */
function median(values: number[]): number {
  const sorted = [...values].sort((one, other) => one - other)
  const middle = sorted.length >> 1
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

const loadStart = process.cpuUsage()
await import("spell/parser/spell/node/packageVersion.node")
const { P } = await import("spell/parser/parser")
const { SP } = await import("spell/parser/spell")
const { incrementalSpellProject } = await import("spell/parser/spell/test")
const { fixtureImportScope, fixtureProjectId, loadFixtureProject } = await import("spell/app/spaces/test")
const loaded = process.cpuUsage(loadStart)
const startup = (loaded.user + loaded.system) / 1000

const files = loadFixtureProject(PROJECT)
const options = { parentScope: fixtureImportScope(PROJECT), projectPath: fixtureProjectId(PROJECT) }

/** A new incremental project of Solitaire, parsed whole. */
const parsed = () => incrementalSpellProject(files, false, options)

/** Each file's JavaScript, then the program's, from `project`'s parse. */
function compile(project: ReturnType<typeof parsed>): void {
  const parts = project.files.map(({ parse }) => {
    const match = parse?.match
    P.JSWriter.instance.writeMatch(match)
    return match?.AST instanceof P.ASTStatementGroup ? match.AST : ""
  })
  const { writer } = SP.targetFor(SP.RUNNING_TARGET)
  const header = SP.SpellProject.importHeaderFor(project.scope, writer)
  project.scope.parser!.inPlay(() => SP.SpellProject.combineCompiled(parts, writer, header, project.scope, {}))
}

/**
 * Each edit's CPU time per edit on `project`:  made on every `STEP`th line of every file, one kind a line in turn
 * (as the incremental tests make them), each then undone.
 */
function editTimes(project: ReturnType<typeof parsed>): Record<string, number> {
  const totals: Record<string, { ms: number; count: number }> = {}
  const kinds = Object.entries(EDITS)
  let turn = 0
  for (const file of files) {
    const lines = file.contents.split("\n")
    for (let index = 0; index < lines.length; index += STEP) {
      const [name, edit] = kinds[turn++ % kinds.length]!
      const edited = [...lines]
      edit(edited, index)
      const text = edited.join("\n")
      // with the span the editor hands it (CodeMirror's change set), worked out before the clock starts
      const span = P.EditedSpan.between(file.contents, text)
      const total = (totals[name] ??= { ms: 0, count: 0 })
      total.ms += cpuOf(() => project.update(file.path, text, span))
      total.count++
      project.update(file.path, file.contents, P.EditedSpan.between(text, file.contents))
    }
  }
  return Object.fromEntries(Object.entries(totals).map(([name, { ms, count }]) => [name, ms / count]))
}

const passes: Array<Record<string, number>> = []
for (let pass = 0; pass <= REPS; pass++) {
  let project!: ReturnType<typeof parsed>
  const parse = cpuOf(() => (project = parsed()))
  const compileTime = cpuOf(() => compile(project))
  const edits = editTimes(project)
  if (pass > 0) {
    passes.push({
      parse,
      compile: compileTime,
      ...Object.fromEntries(Object.entries(edits).map(([name, ms]) => [`edit.${name}`, ms]))
    })
  }
}
const times: Record<string, number> = { startup }
for (const name of Object.keys(passes[0]!)) times[name] = median(passes.map((pass) => pass[name]!))

// NOTE: exits explicitly -- a parse can leave timers running, which would keep the process alive
process.stdout.write(`${JSON.stringify(times)}\n`, () => process.exit(0))
