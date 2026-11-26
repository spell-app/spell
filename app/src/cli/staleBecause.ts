import { createHash } from "crypto"
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs"
import { basename, dirname, join, relative } from "path"

import { compilerVersion } from "spell/app/spaces/server/node/projects/compilerCode"
import { buildFolderFor, FINGERPRINT_SUFFIX } from "spell/app/spaces/server/node/projects/project-utils"
import { SP } from "spell/parser/spell"
import { projectFileFor } from "spell/parser/spell/node/projectFile"
import { LSP } from "spell/app/lsp"
import { LEXICON_SUFFIX } from "./schemas"

/**
 * Why `project`'s build is out of date, e.g. `"Card.spell changed since"`;  `undefined` when it's up to date.
 * - What `spell compile --stale` asks of each project, and of each project it imports.
 * - Out of date when one of the files it BUILDS is missing,
 *   or the TEXT of anything it's built FROM changed since (epic `editor` P45):
 *   its fingerprint now differs from the one kept beside its build (`fingerprintOf()`, `writeFingerprint()`).
 * - The files it builds:
 *   - each target's output (`project.targets`), e.g. `Solitaire.spell.js`, `Solitaire.lib.ts`
 *   - its declarations and words, e.g. `Solitaire.declarations.json5`, `Solitaire.en.js`
 *   - a library's JSON Schemas, its build folder's `schemas/`
 *   - NOT its scope pack:  only a clean compile writes one, so a project with errors would never be up to date
 * - What it's built from, each a hash of its text:
 *   - its own files (its index's manifest) and its project file
 *   - each project it imports:  that one's declarations, which parsing reads
 *     - one imported with `source: true`:  that one's files and project file, as they compile into ours
 *   - Spell's compiler (`compilerVersion()`, the one the editor's compile cache keys by):
 *     after a real change to it, every project is out of date
 * - By text, not by date:  a file saved unchanged, or a checkout or merge that touched it, changes nothing.
 *   - Before P45 it went by date, as `make` does:  a merge touching a parser file rebuilt all 63 built-in projects.
 * - A build with no fingerprint, built before P45 (or by the editor, which writes none), is out of date once.
 * - SIDE EFFECT:  loads `project`, and any project it imports with `source: true`.
 */
export async function staleBecause(project: SP.SpellProject): Promise<string | undefined> {
  await project.load(undefined)
  const built = [
    ...project.targets.map((target) => project.outputFileFor(target)),
    project.declarationsFile,
    ...project.wordsFiles
  ].map((file) => file.location.serverPath)
  const missing = built.find((path) => !existsSync(path))
  if (missing) return `no ${basename(missing)}`
  // a library's JSON Schemas, for VS Code, and its Lexicons (`CLI.writeSchemas()`):  built only by a compile
  if (project.targets.some(({ name }) => name === "ts/lib")) {
    const schemas = join(buildFolderFor(project.location.serverPath), "schemas")
    if (!existsSync(schemas)) return "no JSON Schemas"
    if (!readdirSync(schemas).some((file) => file.endsWith(LEXICON_SUFFIX))) return "no Lexicons"
  }
  const kept = keptFingerprint(project)
  if (!kept) return "no fingerprint of what it was built from"
  const now = await fingerprintOf(project)
  for (const path of new Set([...Object.keys(now.sources), ...Object.keys(kept.sources)])) {
    if (now.sources[path] === kept.sources[path]) continue
    if (!(path in kept.sources)) return `${path} is new since`
    return path in now.sources ? `${path} changed since` : `${path} is gone since`
  }
  for (const [projectId, declarations] of Object.entries(now.imports)) {
    if (kept.imports[projectId] !== declarations) return `${projectId}'s declarations changed since`
  }
  if (now.compiler !== kept.compiler) return "spell's compiler changed since"
  return undefined
}

/**
 * What `project` is built from NOW, as hashes:  see `staleBecause()`.
 * - Worked out BEFORE a compile, and written once it's done (`writeFingerprint()`):
 *   an edit made while it compiles still counts as a change.
 * - Its imports' declarations as they are:  `spell compile` compiles its imports first (`CliSession.compileImports()`).
 * - SIDE EFFECT:  loads `project`, and any project it imports with `source: true`.
 */
export async function fingerprintOf(project: SP.SpellProject): Promise<BuildFingerprint> {
  await project.load(undefined)
  const sources: Record<string, string> = {}
  for (const source of await sourcesOf(project)) {
    sources[relative(project.location.serverPath, source)] = hashOfFile(source)
  }
  const imports: Record<string, string> = {}
  for (const imported of LSP.ScopeExplorer.importedProjects(project)) {
    imports[imported.projectId] = hashOfFile(imported.declarationsFile.location.serverPath)
  }
  return { compiler: compilerAtStart(), sources, imports }
}

/**
 * SIDE EFFECT:  writes `fingerprint` beside `project`'s build, `<Project>.fingerprint.json`:
 * what `staleBecause()` compares with next time.
 */
export function writeFingerprint(project: SP.SpellProject, fingerprint: BuildFingerprint): void {
  const file = fingerprintFileFor(project)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(fingerprint, undefined, 2)}\n`)
}

/**
 * What a project was built from, as hashes, kept beside its build (`<Project>.fingerprint.json`):
 * see `staleBecause()`.
 */
export type BuildFingerprint = {
  /** Spell's compiler:  `compilerVersion()` */
  compiler: string
  /** each of its own files, and a `source: true` import's, by its path from the project's folder:  its text's hash */
  sources: Record<string, string>
  /** each project it imports, by address:  its declarations' hash */
  imports: Record<string, string>
}

////////////////
// ## Helpers
////////////////

/** Paths on disk of what `project` is built from, besides its imports' declarations:  see `staleBecause()`. */
async function sourcesOf(project: SP.SpellProject): Promise<string[]> {
  const sourceImports = project.projectImports.filter((it) => it.source).map((it) => new SP.SpellProject(it.projectId))
  const sources: string[] = []
  for (const each of [project, ...sourceImports]) {
    await each.load(undefined)
    sources.push(projectFileFor(each.location.serverPath))
    for (const entry of Object.values(each.manifest)) sources.push(entry.location!.serverPath)
  }
  return sources
}

/** Where `project`'s fingerprint is kept:  beside its declarations, in its build folder. */
function fingerprintFileFor(project: SP.SpellProject): string {
  const declarations = project.declarationsFile.location.serverPath
  return declarations.slice(0, -SP.DECLARATIONS_JSON_SUFFIX.length) + FINGERPRINT_SUFFIX
}

/** `project`'s kept fingerprint;  `undefined` when there's none, or it can't be read. */
function keptFingerprint(project: SP.SpellProject): BuildFingerprint | undefined {
  try {
    const kept = JSON.parse(readFileSync(fingerprintFileFor(project), "utf8")) as Partial<BuildFingerprint>
    if (typeof kept.compiler !== "string" || !kept.sources || !kept.imports) return undefined
    return kept as BuildFingerprint
  } catch {
    return undefined
  }
}

/** A hash of file `path`'s bytes;  `""` when it isn't there. */
function hashOfFile(path: string): string {
  if (!statSync(path, { throwIfNoEntry: false })?.isFile()) return ""
  return createHash("sha1").update(readFileSync(path)).digest("hex")
}

/**
 * The compiler's version, worked out once per process:  every project a run checks compares with the same one.
 * - `compilerVersion()` itself checks the files again after a second, which a run of 63 projects needn't.
 */
function compilerAtStart(): string {
  return (compiler ??= compilerVersion())
}
let compiler: string | undefined
