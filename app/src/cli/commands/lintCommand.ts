import { writeFileSync } from "fs"
import type { TextEdit } from "vscode-languageserver"


import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { writeSpellVersion } from "spell/parser/spell/node/projectFile"
import { SourceEdits, type TextSpan } from "spell/app/lsp/SourceEdits"
import { CLI } from "spell/app/cli"

/** The warning for one of Spell's old forms, written the old way:  see `oldFormsIn()`. */
const OLD_FORM = "old-form"

/** The warning for a description written as a `<text>` just before its example:  see `descriptionsBeforeExamples()`. */
const DESCRIPTION_BEFORE_EXAMPLE = "description-before-example"

/**
 * `spell lint [projects...]`:  parse each project or file and list its errors -- writes nothing of its own.
 * - `spell check` until epic `repo-split` P13.
 * - Errors go to STDOUT, one per line (`path:line:col  message`), so they can be piped, e.g. to `grep`.
 *   `--json` prints them as a JSON array of `CLI.Problem`s instead.
 * - Progress and a count per project go to stderr.
 * - A `.spell` file:  parses its whole project -- it can't parse alone -- but lists only ITS errors.
 * - A project's EDITOR PAGES (`Card.editor.html`) too, against its types, after its spell
 *   (decision Q17;  `CLI.EditorPages`).
 * - `--fix`:  puts right what it can, writes it back,
 *   then lists what it did, one line each (`... fixed:  ...`), on stdout (with `--json`, on stderr):
 *   - each of Spell's old forms, e.g. `parts` => `slots`, a note after a line's code, `// ...`, moved to the line
 *     under it, `-- ...` -- see `fixOldForms()`;  then the project's file names the Spell it now matches
 *   - a `.spell` file's HTML habits, e.g. `<ui-button>` => `<button>` -- see `fixHtmlHabits()`
 *   - a `.spell` page's old spellings, e.g. `<spell-notebook "x">` => `<spell-page "x" notebook>` --
 *     see `fixPageHabits()`
 *   - each editor page
 *   - What it can't put right is still an error.
 * - A `.spell` file's HTML habit it can't put right, `on-click=`, is an error -- see `htmlHabitsIn()`.
 * - A page's example described by a `<text>` just before it is a WARNING, which `--fix` puts right --
 *   see `pageHabitsIn()`;  so is each of Spell's old forms -- see `oldFormsIn()`.
 * - SIDE EFFECT:  compiles any project they import which has never been compiled --
 *   see `CliSession.compileImports()`.
 * - Returns the exit code:  `EXIT.ERRORS` if there were any errors;  warnings alone exit 0.
 */
export async function lintCommand(session: CLI.CliSession, args: string[], options: CLI.LintOptions): Promise<number> {
  const resolvedProjects = await session.projects(args)
  const status = new CLI.StatusReporter(session.isInteractive)
  const problems: CLI.Problem[] = []
  const fixes: CLI.Problem[] = []
  try {
    for (const resolved of resolvedProjects) {
      if (resolved.kind === "file") {
        const { project } = resolved.file
        if (options.fix) fixes.push(...(await fixOldForms(session, project, resolved.file)))
        if (options.fix) fixes.push(...(await fixHtmlHabits(session, project, resolved.file)))
        if (options.fix) fixes.push(...(await fixPageHabits(session, project, resolved.file)))
        problems.push(...(await checkProject(session, project, resolved.file, status)))
        problems.push(...oldFormsIn(project, resolved.file))
        problems.push(...htmlHabitsIn(project, resolved.file))
        problems.push(...pageHabitsIn(project, resolved.file))
        continue
      }
      if (options.fix) fixes.push(...(await fixOldForms(session, resolved.project)))
      if (options.fix) fixes.push(...(await fixHtmlHabits(session, resolved.project)))
      if (options.fix) fixes.push(...(await fixPageHabits(session, resolved.project)))
      if (options.fix) upgradeSpellVersion(resolved.project)
      problems.push(...(await checkProject(session, resolved.project, undefined, status)))
      problems.push(...oldFormsIn(resolved.project))
      problems.push(...htmlHabitsIn(resolved.project))
      problems.push(...pageHabitsIn(resolved.project))
      const pages = await checkPages(session, resolved.project, status, options)
      problems.push(...pages.problems)
      fixes.push(...pages.fixes)
    }
  } finally {
    status.finish()
  }

  for (const fix of fixes) {
    if (options.json) session.err(session.problemLine(fix))
    else session.out(session.problemLine(fix))
  }
  if (options.json) session.out(JSON.stringify(problems, null, 2))
  else for (const problem of problems) session.out(session.problemLine(problem))
  return problems.some((problem) => problem.severity !== "warning") ? CLI.EXIT.ERRORS : CLI.EXIT.OK
}

/** Parse `project`, and return its problems -- only `file`'s, if given. */
async function checkProject(
  session: CLI.CliSession,
  project: SP.SpellProject,
  file: SP.SpellFile | undefined,
  status: CLI.StatusReporter
): Promise<CLI.Problem[]> {
  const row = status.start(file ? `${file.file}  (${project.projectId})` : project.projectId)
  try {
    await session.parse(project, status)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    status.done(row, "failed", message)
    return [{ project: project.projectId, message }]
  }
  return session.report(status, row, project, { file, list: false })
}

/**
 * With `--fix` (and `spell upgrade`):  rewrite each of Spell's old forms in `project` the new way -- only `file`'s,
 * if given -- and write each changed file back (`SP.OldForms`, epic `language` P68):
 * - a retired word, `- it has parts "front"` => `- it has slots "front"`, `- animation deal it:` => `- to deal it:`
 *   (epic `elemental-spell`, Q61);  one that's simply gone takes its colon with it, `wait for: deal` => `deal`
 * - a note after a line's code, `load its sound  // so it plays`, moved to the line under it, `-- so it plays`
 *   (epic `language` T166)
 * - The parser reports each one, a warning (an error once Spell drops it):  `SP.OldForms.report()`.
 * - `write: false` (`spell upgrade --dry-run`):  says what it would fix, and writes nothing.
 * - Not a test project's files:  they stay frozen, as their editor pages do.
 * - SIDE EFFECT:  parses `project`, then hands it each file's new text, so what's listed after is what's left.
 * - Returns what it fixed, each a problem saying so, where it was.
 */
export async function fixOldForms(
  session: CLI.CliSession,
  project: SP.SpellProject,
  file?: SP.SpellFile,
  { write = true }: { write?: boolean } = {}
): Promise<CLI.Problem[]> {
  await session.parse(project)
  const fixes: CLI.Problem[] = []
  // its files load as it parses:  read them after
  for (const spellFile of file ? [file] : project.spellFiles) {
    const text = spellFile.contents
    if (!spellFile.match || text === undefined || CLI.isTestProject(spellFile.location.serverPath)) continue
    const edits = SP.OldForms.uses(spellFile).flatMap((use) =>
      use.edits.map(({ start, end, newText }, index): Fix =>
        fix(text, { start, end }, newText, index ? undefined : fixedMessage(use))
      )
    )
    fixes.push(...(await writeFixes(project, spellFile, edits, { write })))
  }
  return fixes
}

/** What `fixOldForms()` says it did for `use`. */
function fixedMessage(use: SP.OldFormUse): string {
  if (use.form.id === "line-end-comment") return 'fixed:  a "//" note moved to the line under it, as "--"'
  const newText = use.edits[0]?.newText
  return newText ? `fixed:  "${use.written}" is now "${newText}"` : `fixed:  "${use.written}" isn't needed any more`
}

/**
 * Write the Spell `project` now matches into its project file, `spellVersion`, after `fixOldForms()` (epic `language`
 * P68):  `writeSpellVersion()`, only when it names an older Spell or none.
 * - Not a test project's:  it stays frozen.
 * - `write: false`:  only whether it would.
 * - SIDE EFFECT:  `project.contents.spellVersion` follows.
 * - Returns whether it changed (or would change) the file.
 */
export function upgradeSpellVersion(project: SP.SpellProject, { write = true }: { write?: boolean } = {}): boolean {
  const folder = new SP.SpellLocation(project.projectId).serverPath
  if (CLI.isTestProject(folder) || !writeSpellVersion(folder, { write })) return false
  if (write && project.contents) project.contents.spellVersion = SP.SPELL_VERSION
  return true
}

/**
 * With `--fix`:  put each HTML habit in `project`'s page files right -- only `file`'s, if given --
 * and write each changed file back (epic `elemental-spell` P8):
 * - a component written by its tag, where a page names it bare, `<ui-button>Go</ui-button>` => `<button>Go</button>`
 * - Only a tag the file's packs give that bare name (`SP.ComponentPacks`):  `<solitaire-card>` stays.
 * - Not in a `<spell>` block:  code spell, where `<button>` is the web's (`SP.isCodeSpell()`, J83).
 * - Not in an `<html>` block:  the web's markup, drawn as written, `<ui-docs-api>` and all (epic `notebook` P8).
 * - A named closer is renamed with its tag;  a `</>` is left alone.
 * - Not a test project's files:  they stay frozen.
 * - SIDE EFFECT:  parses `project`, then hands it each file's new text.
 * - Returns what it fixed, each a problem saying so, where it was.
 */
async function fixHtmlHabits(
  session: CLI.CliSession,
  project: SP.SpellProject,
  file?: SP.SpellFile
): Promise<CLI.Problem[]> {
  await session.parse(project)
  const fixes: CLI.Problem[] = []
  for (const spellFile of pageFiles(project, file)) {
    const text = spellFile.contents!
    const { lang } = spellFile.language
    const edits: Fix[] = []
    // each `<html>` block's span:  what's inside one is the web's, as written
    const htmlBlocks: TextSpan[] = []
    P.Tokenizer.forEachToken(spellFile.match!.tokens, (token) => {
      if (!(token instanceof P.JSXElementToken)) return
      if (token.tagName === "html") htmlBlocks.push({ start: token.start, end: token.end })
      if (!token.tagName.includes("-")) return
      if (htmlBlocks.some((block) => token.start > block.start && token.start < block.end)) return
      // a `<spell>` block is code spell, where a bare tag is the web's:  `<ui-button>` stays (J83)
      if (SP.isCodeSpell(token)) return
      const { tagName } = token
      const bare = tagName.slice(tagName.indexOf("-") + 1)
      if (SP.ComponentPacks.tagFor(bare, lang) !== tagName) return
      const message = `fixed:  <${tagName}> is <${bare}> in a page`
      edits.push(fix(text, { start: token.start + 1, end: token.start + 1 + tagName.length }, bare, message))
      if (token.raw?.endsWith(`</${tagName}>`)) {
        edits.push(fix(text, { start: token.end - tagName.length - 1, end: token.end - 1 }, bare))
      }
    })
    fixes.push(...(await writeFixes(project, spellFile, edits)))
  }
  return fixes
}

/**
 * With `--fix`:  put each old habit in `project`'s pages right -- only `file`'s, if given --
 * and write each changed file back (epic `notebook` P8):
 * - a description written as a `<text>` just before its example, moved into the example's own `description`:
 *   see `descriptionsBeforeExamples()`
 * - Not a test project's files:  they stay frozen.
 * - SIDE EFFECT:  parses `project`, then hands it each file's new text.
 * - Returns what it fixed, each a problem saying so, where it was.
 */
async function fixPageHabits(
  session: CLI.CliSession,
  project: SP.SpellProject,
  file?: SP.SpellFile
): Promise<CLI.Problem[]> {
  await session.parse(project)
  const fixes: CLI.Problem[] = []
  for (const spellFile of pageFiles(project, file)) {
    const text = spellFile.contents!
    const [descriptionWord] = DESCRIPTION_WORDS[spellFile.language.lang] ?? DESCRIPTION_WORDS.en!
    const edits: Fix[] = []
    if (descriptionWord) {
      const message = `fixed:  the text before <${spellFile.language.words.exampleTag}> is its ${descriptionWord}`
      for (const { written, example, description } of descriptionsBeforeExamples(spellFile)) {
        edits.push(
          fix(text, { start: written.start, end: example }, "", message),
          ...SourceEdits.settingAttribute(text, example, descriptionWord, description).map((edit) => ({ edit }))
        )
      }
    }
    fixes.push(...(await writeFixes(project, spellFile, edits)))
  }
  return fixes
}

/**
 * Each of Spell's old forms still written in `project` -- only `file`'s, if given -- as a WARNING `--fix` puts right,
 * `old-form` (`SP.OldForms`, epic `language` P68):  listed with the errors, so a run says what's old.
 * - Not one past its drop version:  that's an error already, among the parse errors.
 * - Read from the files as last parsed.
 */
function oldFormsIn(project: SP.SpellProject, file?: SP.SpellFile): CLI.Problem[] {
  return (file ? [file] : project.spellFiles).flatMap((spellFile) => {
    const text = spellFile.contents
    if (!spellFile.match || text === undefined) return []
    return SP.OldForms.uses(spellFile)
      .filter((use) => !use.isDropped)
      .map(
        (use): CLI.Problem => ({
          project: project.projectId,
          path: spellFile.location.serverPath,
          ...lineAndColumnOf(text, use.start),
          message: use.message,
          severity: "warning",
          rule: OLD_FORM
        })
      )
  })
}

/**
 * The HTML habits in `project`'s `.spell` files that `--fix` can't put right -- only `file`'s, if given:
 * an element's `on-click=` (or any `on-...=`), which Spell handles in its view, with `on click:`.
 * - NOT a component's own event (`on-ui-closed=`):  it reaches only a listener on that element, never an `on ...:`.
 * - Each a problem, where it is;  read from the files as last parsed.
 */
function htmlHabitsIn(project: SP.SpellProject, file?: SP.SpellFile): CLI.Problem[] {
  const problems: CLI.Problem[] = []
  for (const spellFile of pageFiles(project, file, "test projects too")) {
    const text = spellFile.contents!
    P.Tokenizer.forEachToken(spellFile.match!.tokens, (token) => {
      if (!(token instanceof P.JSXElementToken)) return
      for (const attribute of token.attributes ?? []) {
        if (!/^on-/.test(attribute.name) || /^on-ui-/.test(attribute.name)) continue
        const event = attribute.name.slice(3).replaceAll("-", " ")
        problems.push({
          project: project.projectId,
          path: spellFile.location.serverPath,
          ...lineAndColumnOf(text, attribute.start),
          message: `${attribute.name}= is HTML's habit:  in Spell, handle it in its view, with "on ${event}:"`
        })
      }
    })
  }
  return problems
}

/**
 * The page habits in `project`'s `.spell` files that `--fix` puts right, as WARNINGS -- only `file`'s, if given:
 * a description written as a `<text>` just before its example, `description-before-example` (epic `notebook` P8).
 * - A warning, not an error:  the page still draws, the text as prose above the example, not as its description.
 * - Each where its `<text>` is;  read from the files as last parsed.
 */
function pageHabitsIn(project: SP.SpellProject, file?: SP.SpellFile): CLI.Problem[] {
  const problems: CLI.Problem[] = []
  for (const spellFile of pageFiles(project, file, "test projects too")) {
    const text = spellFile.contents!
    for (const { written } of descriptionsBeforeExamples(spellFile)) {
      problems.push({
        project: project.projectId,
        path: spellFile.location.serverPath,
        ...lineAndColumnOf(text, written.start),
        message:
          "a description before an example is prose, not its description:  " +
          'say description="..." on the example instead, or run `spell lint --fix`',
        severity: "warning",
        rule: DESCRIPTION_BEFORE_EXAMPLE
      })
    }
  }
  return problems
}

/**
 * Each example in `spellFile` with its description written as the element just before it, the old way:
 * a `<text>` (or `<p>`) holding only text, no attributes, nothing but spaces between it and the example
 * (epic `notebook` P8).
 * - The example's description is its own `description="..."` since epic `notebook` P6 (J23):
 *   the text before it draws as prose.
 * - Not an example with a `description` of its own.
 * - `written`:  the `<text>` element's span;  `example`:  the example's `<`;
 *   `description`:  its text, each line break (and the indent round it) a single space.
 */
function descriptionsBeforeExamples(
  spellFile: SP.SpellFile
): { written: TextSpan; example: number; description: string }[] {
  const text = spellFile.contents!
  const { lang, words } = spellFile.language
  // its words for `description`:  `descripción` and `descripcion` in Spanish
  const descriptionWords = new Set(DESCRIPTION_WORDS[lang] ?? DESCRIPTION_WORDS.en!)
  const found: { written: TextSpan; example: number; description: string }[] = []
  let before: P.JSXElementToken | undefined
  P.Tokenizer.forEachToken(spellFile.match!.tokens, (token) => {
    if (!(token instanceof P.JSXElementToken)) return
    const isText =
      token.tagName === "p" ||
      token.tagName === "ui-text" ||
      SP.ComponentPacks.tagFor(token.tagName, lang) === "ui-text"
    if (token.tagName === words.exampleTag && before && /^\s*$/.test(text.slice(before.end, token.start))) {
      const tag = SourceEdits.tagAt(text, token.start)
      const element = SourceEdits.elementAt(text, before.start)
      const body = element?.bodyStart !== undefined ? text.slice(element.bodyStart, element.bodyEnd) : ""
      const isOnlyText = !!body.trim() && !/[<{]/.test(body) && !element!.tag.attributes.length
      if (tag && isOnlyText && !tag.attributes.some((attribute) => descriptionWords.has(attribute.name)))
        found.push({
          written: { start: before.start, end: before.end },
          example: token.start,
          description: body.trim().replace(/\s*\n\s*/g, " ")
        })
    }
    before = isText ? token : undefined
  })
  return found
}

/** A change to make to a file's text, and what to say of it once made (none:  part of the change before it). */
type Fix = { edit: TextEdit; message?: string }

/** The `Fix` putting `newText` in place of `span` of `text`. */
function fix(text: string, span: TextSpan, newText: string, message?: string): Fix {
  return { edit: SourceEdits.replacing(text, span, newText), message }
}

/**
 * Make `fixes` to `spellFile`'s text, write it back and hand `project` the new text;  what each did, as problems.
 * - `write: false`:  only what each would do.
 * - In any order, none overlapping:  `SourceEdits.applied()` makes the later ones first.
 */
async function writeFixes(
  project: SP.SpellProject,
  spellFile: SP.SpellFile,
  fixes: Fix[],
  { write = true }: { write?: boolean } = {}
): Promise<CLI.Problem[]> {
  const text = spellFile.contents
  if (!fixes.length || text === undefined) return []
  const path = spellFile.location.serverPath
  if (write) {
    const fixed = SourceEdits.applied(
      text,
      fixes.map(({ edit }) => edit)
    )
    writeFileSync(path, fixed)
    await project.updateText(spellFile, fixed)
  }
  return fixes
    .flatMap(({ edit: { range }, message }) =>
      message
        ? [{ project: project.projectId, path, line: range.start.line + 1, column: range.start.character + 1, message }]
        : []
    )
    .sort((one, other) => one.line - other.line || one.column - other.column)
}

/**
 * `project`'s page files that have parsed -- only `file`, if it is one.
 * - Not a test project's, which `--fix` never changes, unless `"test projects too"`:  a check reads them.
 */
function pageFiles(project: SP.SpellProject, file?: SP.SpellFile, which?: "test projects too"): SP.SpellFile[] {
  return (file ? [file] : project.spellFiles).filter(
    (spellFile) =>
      spellFile.form === "page" &&
      spellFile.match &&
      spellFile.contents !== undefined &&
      (which === "test projects too" || !CLI.isTestProject(spellFile.location.serverPath))
  )
}

/**
 * An example's attribute for its description, `<example "x" description="...">`, by language:
 * the first is the one `--fix` writes (Spanish's `descripcion` without its accent too).
 */
const DESCRIPTION_WORDS: Record<string, string[]> = { en: ["description"], es: ["descripción", "descripcion"] }

/** 1-based line and column of offset `start` in `text`. */
function lineAndColumnOf(text: string, start: number): { line: number; column: number } {
  const { line, ch } = P.positionForOffset(P.getLineStarts(text), start)
  return { line: line + 1, column: ch + 1 }
}

/**
 * Check `project`'s editor pages against its types -- and with `--fix`, put them right:  see `CLI.EditorPages`.
 * - A row of its own on `status`, only when the project has pages.
 */
async function checkPages(
  session: CLI.CliSession,
  project: SP.SpellProject,
  status: CLI.StatusReporter,
  { fix }: CLI.LintOptions
): Promise<CLI.EditorPageResults> {
  const editorPages = new CLI.EditorPages(session, project)
  if (!editorPages.paths.length) return { pages: 0, problems: [], fixes: [] }
  const row = status.start(`${project.projectId}  (editor pages)`)
  const results = await editorPages.check({ fix })
  const { pages, problems, fixes } = results
  const note = [
    `${pages} page${pages === 1 ? "" : "s"}`,
    problems.length && `${problems.length} error${problems.length === 1 ? "" : "s"}`,
    fixes.length && `fixed ${fixes.length}`
  ]
  status.done(row, problems.length ? "errors" : "ok", note.filter(Boolean).join(" · "))
  return results
}
