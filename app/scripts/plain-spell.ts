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
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
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
const EDITOR_TAG =
  /^<(?:spell-)?(?:property-editor|editor-de-propiedades|encanto-editor-de-propiedades)[ \t]+"([^"\n]+)"[ \t]*>[ \t]*$/u
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

/** A code tag at a file's left edge (P46):  `<view "card">`, `<thing ...>`, `<action ...>` ... */
const CODE_TAG = /^<(?!ui-defaults\b)\p{L}[^\n]*$/mu

/** The ability words the twin writes last in a template's body, which P46 writes first:  `it is draggable`. */
const ABILITY_LINE =
  /^\t(it is|es|está) (draggable|droppable|selectable|clickable|arrastrable|soltable|seleccionable|cliqueable)$/u

/**
 * `text`, a code file written with tags, in plain Spell (P46):  the whole file through the plain writer,
 * then the legal-today forms the writer can't know.
 */
function codePlain(text: string, path: string): string {
  let plain = sitePlain(text, path)
  plain = plain
    // a member made new, without its:  `"stock" is a new stock pile`
    .replace(/^(\t+)(?:its|su) ("[^"\n]+" (?:is|es) (?:a|an|un|una) (?:new|nuev[oa]) )/gmu, "$1$2")
    // its first detail, when it's quoted text, without `=`:  `with name "stock"`
    .replace(/(\b(?:new|nuev[oa]) [^\n]*?\b(?:with|con) )(\p{L}+) = (?=")/gu, "$1$2 ")
    // a list's commas against the word before:  `"auto play", "cheat"`
    .replaceAll('" , "', '", "')
    // group names in Initial Caps:  `group "Game Play"`
    .replace(
      /^(\t*(?:- )?(?:group|grupo) ")([^"\n]+)"/gmu,
      (_, head: string, name: string) => `${head}${initialCaps(name)}"`
    )
  return abilitiesFirst(plain)
}

/** `name` in Initial Caps, each word's first letter:  `game play` => `Game Play`. */
function initialCaps(name: string): string {
  return name.replace(/(^|\s)(\p{Ll})/gu, (_, space: string, letter: string) => space + letter.toUpperCase())
}

/** `text` with each template's ability lines (`it is draggable`), written last by the twin, first in its body. */
function abilitiesFirst(text: string): string {
  const lines = text.split("\n")
  const out: string[] = []
  let headAt = -1
  for (const line of lines) {
    if (/^\S/.test(line) && !line.startsWith("//") && !line.startsWith("#") && line.trimEnd().endsWith(":")) {
      headAt = out.length
    } else if (/^\S/.test(line)) headAt = -1
    if (headAt >= 0 && ABILITY_LINE.test(line)) {
      out.splice(headAt + 1, 0, line)
      // a blank line it left behind, at the body's end
      continue
    }
    out.push(line)
  }
  return out.join("\n").replace(/\n\n+(?=\n|$)/g, "\n")
}

/**
 * `text`, a plain file, with each member's `- ` gone (P46):  under a declaration at the left edge that opens a body
 *   with its `:` (a page's plain head has none:  its body is markup, where `- ` starts a list's item).
 * - A member under a worked-out property's body keeps it, as the plain writer does.
 */
function withoutBullets(text: string): string {
  const lines = text.split("\n")
  const depthOf = (line: string) => /^\t*/.exec(line)![0].length
  const isCode = (line: string) => !!line.trim() && !line.trim().startsWith("//")
  let top = ""
  return lines
    .map((line, index) => {
      if (/^\S/.test(line) && isCode(line)) top = line
      const bullet = /^(\t+)- /.exec(line)
      if (!bullet || !top.trimEnd().endsWith(":") || top.startsWith("<")) return line
      const depth = bullet[1]!.length
      let parent = index - 1
      while (parent >= 0 && !(isCode(lines[parent]!) && depthOf(lines[parent]!) < depth)) parent--
      const head = lines[parent]!.trim().replace(/^- /, "")
      if (depth > 1 && !/^(its|su|sus)\s+"/u.test(head)) return line
      if (depth > 1 && head.endsWith(":")) {
        for (let at = parent + 1; at < lines.length; at++) {
          const each = lines[at]!
          if (isCode(each) && depthOf(each) <= depthOf(lines[parent]!)) break
          if (isCode(each) && depthOf(each) === depth && !each.trim().startsWith("- ")) return line
        }
      }
      return bullet[1] + line.slice(bullet[0].length)
    })
    .join("\n")
}

/** The new text of project file `path`, or `undefined` when it stays as it is. */
function converted(text: string, path: string): string | undefined {
  if (SITE_TAG.test(text)) return sitePlain(text, path)
  const heads = withPlainHeads(text, path)
  if (CODE_TAG.test(heads ?? text)) return codePlain(heads ?? text, path)
  const bare = withoutBullets(heads ?? text)
  return bare !== text ? bare : heads
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
  return (
    compiled
      .replace(/\/\*! SPELL: DECLARES[^]*?\*\/\n?/g, "")
      .split("\n")
      .filter((line) => line.trim() && !line.trim().startsWith("//"))
      // a test's step, echoed as written:  its words, not its code (P46)
      .map((line) => line.replace(/declaredAt: \{[^}]*\}/g, "declaredAt"))
      .map((line) => line.replace(/core\.echoTestAction\(`[^`]*`\)/, "core.echoTestAction(...)"))
      .join("\n")
  )
}

/** Project `folder`'s files parsed as one project, by their paths:  their code and errors. */
function compile(folder: string, files: { path: string; contents: string }[]) {
  const projectName = relative(SPACES, folder)
  const sources = files.filter(({ path }) => SP.isSpellSourceName(path))
  const parentScope = importScopeIn(
    folder,
    sources.map(({ path }) => path)
  )
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
  if (args.includes("--diff")) {
    const out = join(process.env.PLAIN_OUT ?? "/tmp", "plain-spell")
    mkdirSync(out, { recursive: true })
    for (const { path } of changed) {
      const name = `${relative(SPACES, folder)}${path}`.replaceAll("/", "_")
      writeFileSync(join(out, `${name}.spell`), after.find((it) => it.path === path)!.contents)
      if (!differ.some((it) => it.path === path)) continue
      writeFileSync(join(out, `${name}.old.js`), old.get(path)!.code)
      writeFileSync(join(out, `${name}.new.js`), now.get(path)?.code ?? "")
    }
  }
  console.log(
    `${relative(SPACES, folder)}:  ${changed.length} file(s)${differ.length ? `, ${differ.length} compile differently:  ${differ.map((it) => it.path).join(", ")}` : ""}`
  )
  changedFiles += changed.length
  mismatches += differ.length
  if (!write || (differ.length && !force)) continue
  for (const file of changed) writeFileSync(join(folder, `.${file.path}`), file.contents)
}
console.log(`${changedFiles} file(s) ${write ? "written" : "to change"};  ${mismatches} compile differently`)
