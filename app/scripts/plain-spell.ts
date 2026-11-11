/**
 * `scripts/plain-spell.ts`:  the ONE-TIME conversion of the built-in projects from tags to plain Spell
 * (epic `language` P45, P46).
 * - THROWAWAY:  no command, no tests.  P45 wrote it for pages;  P46 reuses it for code, then deletes it.
 * - Never the frozen test projects (`@spell/test`):  they never change.
 * - A dry run by default:  each file it would change, and whether the project still compiles to the same program.
 *   `--write` writes the files whose project compiles the same;  `--force` writes the rest too.
 *
 * ```sh
 * yarn tsx scripts/plain-spell.ts [--write] [--force] [<project folder> ...]   # none:  every built-in project
 * ```
 *
 * What it changes, file by file:
 * - a PAGE'S HEAD (P45):  `<page "button api" notebook>` => `"button api" is a notebook page`, its closer gone;
 *   its body as written.  Spanish:  `<página "x" cuaderno>` => `"x" es una página cuaderno`.
 * - a PROPERTY EDITOR'S HEAD:  `<property-editor "card">` => `"card" is a property editor`, its closer gone.
 * - a SITE's file:  the whole file in plain Spell (`SX.CodeSpellWriter`):  a site is code (`x is a site:`).
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { join, relative, resolve } from "node:path"

import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"
import { SX } from "spell/parser/spellx"
import { importScopeIn } from "spell/app/spaces/test"

// Spell UI's pack:  a drawing names its components bare (`<button>`)
import "spell/app/spaces"

const SPACES = resolve(import.meta.dirname, "..", "spaces")
const BUILT_INS = ["@spell/guides", "@spell/sites", "@spell/examples", "@spell/library", "@spell/editor"]

/** A page's tag at a file's left edge:  its word, its name, a flag after it. */
const PAGE_TAG =
  /^<(page|notebook|spell-page|spell-notebook|página|pagina|cuaderno|encanto-página|encanto-pagina|encanto-cuaderno)[ \t]+"([^"\n]+)"([ \t]+(?:notebook|cuaderno))?[ \t]*>[ \t]*$/u
/** A property editor's tag at a file's left edge, and its name. */
const EDITOR_TAG = /^<(?:spell-)?(?:property-editor|editor-de-propiedades|encanto-editor-de-propiedades)[ \t]+"([^"\n]+)"[ \t]*>[ \t]*$/u
/** A site's tag at a file's left edge:  the whole file is code, written plain. */
const SITE_TAG = /^<(?:spell-|encanto-)?(?:site|sitio)\b/mu

/** `text`, file `path`'s, with its pages' and property editors' heads plain;  `undefined` when it has none. */
function withPlainHeads(text: string, path: string): string | undefined {
  const spanish = /\.es\.spell$/.test(path)
  const lines = text.split("\n")
  let changed = false
  let open = false
  const out: string[] = []
  for (const line of lines) {
    if (open && line.startsWith("</")) {
      open = false
      // its closer goes:  its indentation says where it ends;  so do the blank lines just before it
      while (out.at(-1) === "") out.pop()
      continue
    }
    if (line && !/^[ \t]/.test(line) && !line.startsWith("<!--")) open = false
    const page = PAGE_TAG.exec(line)
    const editor = page ? undefined : EDITOR_TAG.exec(line)
    if (page) {
      const notebook = !!page[3] || /notebook|cuaderno/.test(page[1]!)
      out.push(
        spanish
          ? `"${page[2]}" es una página${notebook ? " cuaderno" : ""}`
          : `"${page[2]}" is a ${notebook ? "notebook " : ""}page`
      )
    } else if (editor) {
      out.push(spanish ? `"${editor[1]}" es un editor de propiedades` : `"${editor[1]}" is a property editor`)
    } else {
      out.push(line)
      continue
    }
    changed = true
    open = true
  }
  return changed ? out.join("\n") : undefined
}

/** `text`, a site's file, written in plain Spell:  the whole file is code. */
function sitePlain(text: string, path: string): string {
  return (
    SX.CodeSpellWriter.write(text, { path })
      // the writer spaces each comma as a word;  a page's details read `at "/", named "Home"`
      .replace(/^(\t+(?:- )?it has .*)$/gm, (line) => line.replaceAll('" , ', '", '))
      // a `<!-- ... -->` comment's own lines, `//` alone, at its first and last:  gone
      .replace(/^\/\/\n((?:\/\/ .*\n)+)\/\/\n/gm, "$1")
  )
}

/** The new text of project file `path`, or `undefined` when it stays as it is. */
function converted(text: string, path: string): string | undefined {
  if (SITE_TAG.test(text)) return sitePlain(text, path)
  return withPlainHeads(text, path)
}

////////////////
// ## Projects
////////////////

/** Every project folder under `folder`:  each one with a project file. */
function projectsIn(folder: string): string[] {
  if (!existsSync(folder) || !statSync(folder).isDirectory()) return []
  if (existsSync(join(folder, "__project.json5"))) return [folder]
  return readdirSync(folder).flatMap((name) => (name === "test" ? [] : projectsIn(join(folder, name))))
}

/** Every `.spell` file of project `folder`, by its path in the project (`/Card.spell`), and its text. */
function filesOf(folder: string, at = folder): { path: string; contents: string }[] {
  return readdirSync(at).flatMap((name) => {
    const full = join(at, name)
    if (statSync(full).isDirectory()) return name === "snapshots" || name === "build" ? [] : filesOf(folder, full)
    if (!/\.spell(ml|x)?$/.test(name)) return []
    return [{ path: `/${relative(folder, full)}`, contents: readFileSync(full, "utf8") }]
  })
}

/** `compiled` without its comments and `DECLARES` headers, which carry line numbers. */
function codeOf(compiled: string): string {
  return compiled
    .replace(/\/\*! SPELL: DECLARES[^]*?\*\/\n?/g, "")
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("//"))
    .join("\n")
}

/** Project `folder`'s files parsed as one project, by their paths:  their code and errors. */
function compile(folder: string, files: { path: string; contents: string }[]) {
  const projectName = relative(SPACES, folder)
  const sources = files.filter(({ path }) => SP.isSpellSourceName(path))
  const parentScope = importScopeIn(folder, sources.map(({ path }) => path))
  const parsed = parseSpellProject(sources, { parentScope, projectPath: projectName }).files
  return new Map(parsed.map((file) => [file.path, { code: codeOf(file.compiled), errors: file.errors.length }]))
}

const args = process.argv.slice(2)
const write = args.includes("--write")
const force = args.includes("--force")
const named = args.filter((arg) => !arg.startsWith("--"))
const folders = (named.length ? named.map((it) => resolve(it)) : BUILT_INS.map((group) => join(SPACES, group))).flatMap(
  projectsIn
)

let changedFiles = 0
let mismatches = 0
for (const folder of folders) {
  const before = filesOf(folder)
  const after = before.map((file) => ({ ...file, contents: converted(file.contents, file.path) ?? file.contents }))
  const changed = after.filter((file, index) => file.contents !== before[index]!.contents)
  if (!changed.length) continue
  const old = compile(folder, before)
  const now = compile(folder, after)
  const differ = changed.filter(({ path }) => {
    const a = old.get(path)
    const b = now.get(path)
    return a && (!b || a.code !== b.code || b.errors > a.errors)
  })
  console.log(
    `${relative(SPACES, folder)}:  ${changed.length} file(s)${differ.length ? `, ${differ.length} compile differently:  ${differ.map((it) => it.path).join(", ")}` : ""}`
  )
  changedFiles += changed.length
  mismatches += differ.length
  if (!write || (differ.length && !force)) continue
  for (const file of changed) writeFileSync(join(folder, `.${file.path}`), file.contents)
}
console.log(`${changedFiles} file(s) ${write ? "written" : "to change"};  ${mismatches} compile differently`)
