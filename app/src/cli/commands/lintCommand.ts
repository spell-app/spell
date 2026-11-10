import { writeFileSync } from "fs"
import type { TextEdit } from "vscode-languageserver"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SourceEdits, type TextSpan } from "spell/app/lsp/SourceEdits"
import { CLI } from "spell/app/cli"

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
 *   - each retired word in the spell, e.g. `parts` => `slots` -- see `fixRetiredWords()`
 *   - a `.spell` file's HTML habits, e.g. `<ui-button>` => `<button>` -- see `fixHtmlHabits()`
 *   - a `.spell` page's old spellings, e.g. `<spell-notebook "x">` => `<spell-page "x" notebook>` --
 *     see `fixPageHabits()`
 *   - each editor page
 *   - What it can't put right is still an error.
 * - A `.spell` file's HTML habit it can't put right, `on-click=`, is an error -- see `htmlHabitsIn()`.
 * - A page's example described by a `<text>` just before it is a WARNING, which `--fix` puts right --
 *   see `pageHabitsIn()`.
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
        if (options.fix) fixes.push(...(await fixRetiredWords(session, project, resolved.file)))
        if (options.fix) fixes.push(...(await fixHtmlHabits(session, project, resolved.file)))
        if (options.fix) fixes.push(...(await fixPageHabits(session, project, resolved.file)))
        problems.push(...(await checkProject(session, project, resolved.file, status)))
        problems.push(...htmlHabitsIn(project, resolved.file))
        problems.push(...pageHabitsIn(project, resolved.file))
        continue
      }
      if (options.fix) fixes.push(...(await fixRetiredWords(session, resolved.project)))
      if (options.fix) fixes.push(...(await fixHtmlHabits(session, resolved.project)))
      if (options.fix) fixes.push(...(await fixPageHabits(session, resolved.project)))
      problems.push(...(await checkProject(session, resolved.project, undefined, status)))
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
 * With `--fix`:  put each RETIRED word in `project` right -- only `file`'s, if given --
 * e.g. `- it has parts "front"` => `- it has slots "front"`, `- animation deal it:` => `- to deal it:`,
 * and write each changed file back (epic `elemental-spell`, Q61).
 * - The parser marks each one as an error whose `data.replacement` is its new word:
 *   see `SpellType.retiredWordErrorsIn()`.
 * - A word written with a capital keeps it:  `Parts` => `Slots`.
 * - A word that's simply gone takes its colon and spaces with it:  `wait for: deal` => `deal` (epic `language` P13).
 * - Not a test project's files:  they stay frozen, as their editor pages do.
 * - SIDE EFFECT:  parses `project`, then hands it each file's new text, so what's listed after is what's left.
 * - Returns what it fixed, each a problem saying so, where the word was.
 */
async function fixRetiredWords(
  session: CLI.CliSession,
  project: SP.SpellProject,
  file?: SP.SpellFile
): Promise<CLI.Problem[]> {
  await session.parse(project)
  const fixes: CLI.Problem[] = []
  // its files load as it parses:  read them after
  for (const spellFile of file ? [file] : project.spellFiles) {
    const path = spellFile.location.serverPath
    const text = spellFile.contents
    if (!spellFile.match || text === undefined || CLI.isTestProject(path)) continue
    const retired = (SP.Block.getParseErrors(spellFile.match) ?? []).flatMap(({ start, end, data: { replacement } }) =>
      typeof replacement === "string" && start !== undefined && end !== undefined ? [{ start, end, replacement }] : []
    )
    const edits = retired.map(({ start, end, replacement }): Fix => {
      const written = text.slice(start, end)
      if (!replacement) {
        const gone = end + /^[ \t]*:?[ \t]*/.exec(text.slice(end))![0].length
        return fix(text, { start, end: gone }, "", `fixed:  "${written}" isn't needed any more`)
      }
      const word = /^[A-ZÁÉÍÓÚÑ]/.test(written) ? replacement[0]!.toUpperCase() + replacement.slice(1) : replacement
      return fix(text, { start, end }, word, `fixed:  "${written}" is now "${word}"`)
    })
    fixes.push(...(await writeFixes(project, spellFile, edits)))
  }
  return fixes
}

/**
 * With `--fix`:  put each HTML habit in `project`'s `.spell` files right -- only `file`'s, if given --
 * and write each changed file back (epic `elemental-spell` P8):
 * - a component written by its tag, where spellx names it bare, `<ui-button>Go</ui-button>` => `<button>Go</button>`
 * - an action's retired attribute, as spell waits by itself (epic `language` P13):
 *   `<action "deal" animated>` => `<action "deal">`
 * - Only a tag the file's packs give that bare name (`SP.ComponentPacks`):  `<solitaire-card>` stays.
 * - Not in a `<spell>` chunk:  code spell, where `<button>` is the web's (`SP.isCodeSpell()`, J83).
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
  for (const spellFile of spellmlFiles(project, file)) {
    const text = spellFile.contents!
    const { lang } = spellFile.language
    const edits: Fix[] = []
    // each `<html>` block's span:  what's inside one is the web's, as written
    const htmlBlocks: TextSpan[] = []
    P.Tokenizer.forEachToken(spellFile.match!.tokens, (token) => {
      if (token instanceof SP.SpellxTagToken) {
        for (const { name, word, start } of token.tag.attributes) {
          if (name !== "animated") continue
          // with the spaces before it
          const before = /[ \t]*$/.exec(text.slice(0, start))![0].length
          edits.push(
            fix(
              text,
              { start: start - before, end: start + word.length },
              "",
              `fixed:  "${word}" isn't needed any more`
            )
          )
        }
        return
      }
      if (!(token instanceof P.JSXElementToken)) return
      if (token.tagName === "html") htmlBlocks.push({ start: token.start, end: token.end })
      if (!token.tagName.includes("-")) return
      if (htmlBlocks.some((block) => token.start > block.start && token.start < block.end)) return
      // a `<spell>` chunk is code spell, where a bare tag is the web's:  `<ui-button>` stays (J83)
      if (SP.isCodeSpell(token)) return
      const { tagName } = token
      const bare = tagName.slice(tagName.indexOf("-") + 1)
      if (SP.ComponentPacks.tagFor(bare, lang) !== tagName) return
      const message = `fixed:  <${tagName}> is <${bare}> in spellx`
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
 * With `--fix`:  put each old spelling in `project`'s `.spell` pages right -- only `file`'s, if given --
 * and write each changed file back (epic `notebook` P8):
 * - a template word that brings a flag, written as the page's word and the flag:
 *   `<notebook "x" locked>` (or the old `<spell-notebook>`) => `<page "x" notebook locked>`, its named closer too;
 *   Spanish's `<cuaderno>` => `<página cuaderno>`
 * - a view written inside a page by its long word, `<spell-view "counter">` => `<view "counter">` (J2)
 * - a description written as a `<text>` just before its example, moved into the example's own `description`:
 *   see `descriptionsBeforeExamples()`
 * - A `</>` closer is left alone.
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
  for (const spellFile of spellmlFiles(project, file)) {
    const text = spellFile.contents!
    const words = spellFile.language.words.spellx ?? SP.Language.default.words.spellx!
    const pageWord = wordFor(words.templates, "page")
    const descriptionWord = wordFor(words.attributes, "description")
    const edits: Fix[] = []
    // each page's span, to find the views inside it
    const pages: TextSpan[] = []
    const views: SP.SpellxTagToken[] = []
    P.Tokenizer.forEachToken(spellFile.match!.tokens, (token) => {
      if (!(token instanceof SP.SpellxTagToken) || token.tag.category !== "template") return
      const { word, kind } = token.tag
      if (kind === "view" && word.startsWith(`${words.prefix}-`)) views.push(token)
      if (kind !== "page") return
      const closer = closerOf(text, token.start, word)
      pages.push({ start: token.start, end: closer?.end ?? elementEnd(text, token.start) })
      if (!pageWord || !token.tag.attributes.some((attribute) => attribute.fromTagWord)) return
      // the flag's word as written is the template's, after its old prefix if it has one:  `notebook`, `cuaderno`
      const flagWord = word.startsWith(`${words.prefix}-`) ? word.slice(words.prefix.length + 1) : word
      // the page's short word (epic `language` P41):  `<page "x" notebook>`
      const page = pageWord
      const tag = SourceEdits.tagAt(text, token.start)!
      edits.push(
        fix(text, { start: token.start + 1, end: tag.nameEnd }, page, `fixed:  <${word}> is <${page} ${flagWord}>`),
        fix(text, { start: tag.namedEnd, end: tag.namedEnd }, ` ${flagWord}`)
      )
      if (closer) edits.push(fix(text, closer, `</${page}>`))
    })
    for (const view of views) {
      if (!pages.some((page) => view.start > page.start && view.start < page.end)) continue
      const { word } = view.tag
      const short = word.slice(words.prefix.length + 1)
      edits.push(
        fix(
          text,
          { start: view.start + 1, end: view.start + 1 + word.length },
          short,
          `fixed:  <${word}> is <${short}> in a page`
        )
      )
      const closer = closerOf(text, view.start, word)
      if (closer) edits.push(fix(text, closer, `</${short}>`))
    }
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
 * The HTML habits in `project`'s `.spell` files that `--fix` can't put right -- only `file`'s, if given:
 * an element's `on-click=` (or any `on-...=`), which spellx handles in its template, with `<on click>...</>`.
 * - NOT a component's own event (`on-ui-closed=`):  it reaches only a listener on that element, never an `<on ...>`.
 * - Each a problem, where it is;  read from the files as last parsed.
 */
function htmlHabitsIn(project: SP.SpellProject, file?: SP.SpellFile): CLI.Problem[] {
  const problems: CLI.Problem[] = []
  for (const spellFile of spellmlFiles(project, file, "test projects too")) {
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
          message: `${attribute.name}= is HTML's habit:  in spellx, handle it in the template, with <on ${event}>...</>`
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
  for (const spellFile of spellmlFiles(project, file, "test projects too")) {
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
  const spellx = words.spellx ?? SP.Language.default.words.spellx!
  // its words for `description`:  `descripción` and `descripcion` in Spanish
  const descriptionWords = new Set(
    Object.keys(spellx.attributes).filter((word) => spellx.attributes[word] === "description")
  )
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
 * - In any order, none overlapping:  `SourceEdits.applied()` makes the later ones first.
 */
async function writeFixes(project: SP.SpellProject, spellFile: SP.SpellFile, fixes: Fix[]): Promise<CLI.Problem[]> {
  const text = spellFile.contents
  if (!fixes.length || text === undefined) return []
  const path = spellFile.location.serverPath
  const fixed = SourceEdits.applied(
    text,
    fixes.map(({ edit }) => edit)
  )
  writeFileSync(path, fixed)
  await project.updateText(spellFile, fixed)
  return fixes
    .flatMap(({ edit: { range }, message }) =>
      message
        ? [{ project: project.projectId, path, line: range.start.line + 1, column: range.start.character + 1, message }]
        : []
    )
    .sort((one, other) => one.line - other.line || one.column - other.column)
}

/**
 * `project`'s `.spell` files that have parsed -- only `file`, if it is one.
 * - Not a test project's, which `--fix` never changes, unless `"test projects too"`:  a check reads them.
 */
function spellmlFiles(project: SP.SpellProject, file?: SP.SpellFile, which?: "test projects too"): SP.SpellFile[] {
  return (file ? [file] : project.spellFiles).filter(
    (spellFile) =>
      spellFile.form === "spellx" &&
      spellFile.match &&
      spellFile.contents !== undefined &&
      (which === "test projects too" || !CLI.isTestProject(spellFile.location.serverPath))
  )
}

/** The first word of `table` that means `meaning`:  `página` for Spanish's `page`. */
function wordFor(table: Record<string, unknown>, meaning: string): string | undefined {
  return Object.entries(table).find(([, value]) => value === meaning)?.[0]
}

/**
 * The span of the named closer of the template opening at `opening`, `</notebook>`:  none, for a `</>`.
 * - The first after it:  a template never holds another of its own word.
 */
function closerOf(text: string, opening: number, word: string): TextSpan | undefined {
  const start = text.indexOf(`</${word}>`, opening)
  return start < 0 ? undefined : { start, end: start + word.length + 3 }
}

/** Where the element opening at `opening` ends, its closer and all;  the text's end, when it can't tell. */
function elementEnd(text: string, opening: number): number {
  return SourceEdits.elementAt(text, opening)?.end ?? text.length
}

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
