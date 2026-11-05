import { Logger } from "spell/util"
import { SP } from "spell/parser/spell"

/****************
 * ### `CompileCache`
 * What each project compiled to, kept by a hash of what it was compiled FROM (epic `language` P27, Owen's r9):
 * so opening a project again, after a reload, doesn't compile what hasn't changed.
 * - Installed by whoever has somewhere to keep it:  `SP.SpellProject.compileCache`.
 *   - The editor's keeps it on disk, beside the page server (`~/.spell/cache/compiles`), over HTTP.
 *   - None installed (the `spell` command, tests):  every compile compiles, as before.
 * - The KEY (`keyFor()`), a hash of everything a compile reads:
 *   - what its project file says that a compile reads:  its files, in order, its version, targets ...
 *   - each of its files' text, in order
 *   - the targets it compiles to
 *   - each project it imports:  a compiled one's declarations, what we read of it;  a `source` one's files' text
 *   - NOT the compiler:  the store files each entry under the compiler's version, so a new compiler starts empty
 * - The ENTRY:  what a compile writes, `SP.CompiledEntry` (`SpellProject.cachedEntry()`):
 *   its code for each target, its source map, declarations and words.
 * - Whole projects, never single files:  a project compiles as ONE module (`SpellProject.combineCompiled()`),
 *   each class gathering its members from every file, so one file's code can't be told apart from the rest.
 *   - So any edit to a project compiles it whole, and a project importing it, by its key.
 * - Only a clean compile is kept:  one with a parse error compiles again, to show it.
 * - Browser-safe:  no node, no server;  the store does the keeping (`SP.CompileCacheStore`).
 ****************/
export class CompileCache {
  /** Where entries are kept, e.g. the page server's `/api/compiles`. */
  readonly store: SP.CompileCacheStore
  /** How many projects compiled, and how many came from the cache instead, since it was installed. */
  readonly counts = { compiled: 0, cached: 0 }
  /** Says what each compile did:  INFO, so the editor's devtools show the counts. */
  logger = new Logger({ prefix: "compile-cache", level: Logger.INFO })

  constructor(store: SP.CompileCacheStore) {
    this.store = store
  }

  /**
   * A cache kept in memory only:  for tests, and to compare a compile with the cache on and off.
   * - `entries`:  what it holds, by key.
   */
  static inMemory(entries = new Map<string, string>()): CompileCache {
    return new CompileCache({
      get: async (key) => entries.get(key),
      put: async (key, text) => void entries.set(key, text)
    })
  }

  /**
   * The key of `project`'s compile as its files are NOW:  a hex hash (see the class docstring).
   * - SIDE EFFECT:  loads its project file, its files and what it imports, as its compile would.
   * - throws if one can't be loaded, or a target it names isn't one:  its compile then says why
   */
  async keyFor(project: SP.SpellProject): Promise<string> {
    await project.load(undefined)
    const parts: string[] = [KEY_FORMAT, settingsOf(project), project.targets.map((target) => target.name).join()]
    for (const it of project.projectImports) {
      const imported = new SP.SpellProject(it.projectId)
      await imported.load(undefined)
      if (it.source) {
        parts.push(`source ${it.projectId}`, settingsOf(imported))
        parts.push(...(await textsOf(imported.spellFiles)))
      } else {
        const declarations = await SP.SpellProject.declarationsOf(imported)
        parts.push(`compiled ${it.projectId}`, declarations ? JSON.stringify(declarations) : "none")
      }
    }
    parts.push(...(await textsOf(project.activeImports)))
    return sha256(parts.join("\u0000"))
  }

  /** Entry `key`, or `undefined` if there's none, or it can't be read.  NEVER throws. */
  async entryFor(key: string): Promise<SP.CompiledEntry | undefined> {
    try {
      const text = await this.store.get(key)
      return text ? (JSON.parse(text) as SP.CompiledEntry) : undefined
    } catch (error) {
      this.logger.warn("entryFor(): couldn't read entry", key, error)
      return undefined
    }
  }

  /** Keep `entry` as `key`.  NEVER throws:  a cache that can't keep it just misses next time. */
  async keep(key: string, entry: SP.CompiledEntry): Promise<void> {
    try {
      await this.store.put(key, JSON.stringify(entry))
    } catch (error) {
      this.logger.warn("keep(): couldn't keep entry", key, error)
    }
  }

  /** Count and say how `project`'s compile went:  `"compiled"` (its `files` spell files) or `"cached"`. */
  noteCompile(project: SP.SpellProject, how: "compiled" | "cached", files = 0): void {
    this.counts[how]++
    const name = project.projectName ?? project.projectId
    const { compiled, cached } = this.counts
    const what = how === "cached" ? "from the cache, 0 files compiled" : `compiled, ${files} files`
    this.logger.info(`compile(): ${name} ${what} -- so far ${compiled} compiled, ${cached} from the cache`)
  }
}

/**
 * What `project`'s project file says that a compile reads, as JSON:  never its files' times and sizes (`manifest`),
 * which change with a save of the same text.
 */
function settingsOf(project: SP.SpellProject): string {
  const { imports = [], version, exports, targets, packs, listsStartAt, buildFolder } = project.contents ?? {}
  const files = imports.map(({ path, active, import: picks, version: range, source }) => ({
    path,
    active,
    picks,
    range,
    source
  }))
  return JSON.stringify({ files, version, exports, targets, packs, listsStartAt, buildFolder })
}

/** Each of `files`' path and text, loaded first:  what a key reads of them. */
async function textsOf(files: readonly SP.CompilableSpellFile[]): Promise<string[]> {
  const texts: string[] = []
  for (const file of files) {
    await file.load(undefined)
    texts.push(file.path, String(file.contents ?? ""))
  }
  return texts
}

/** `text`'s SHA-256, as hex:  the browser's and node's own `crypto.subtle`. */
async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

/** What a key's made of, and an entry's shape:  a change to either changes it, so no old entry is read. */
const KEY_FORMAT = "spell-compile-1"
