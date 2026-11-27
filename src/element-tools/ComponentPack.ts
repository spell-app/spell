import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs"
import { basename, dirname, join, relative, resolve } from "node:path"

import { readJSON5File } from "spell/util/node/json5.ts"
import { readTypeScript } from "spell/util/node/typescript.ts"
import { pathInside } from "spell/server/RealPath"

import { elementBaseConfig } from "./elementConfig.ts"
import { PACK_MODULES } from "./packModules.ts"
import { RootCatalog, type RootCatalogEntry } from "./RootCatalog.ts"
import { Terminal } from "./Terminal.ts"
import {
  ComponentPackError,
  type ComponentPackBuild,
  type ComponentPackCheck,
  type ComponentPackStale
} from "./tools.types.ts"

/****************
 * ### `ComponentPack`
 * A COMPONENT PACK:  another package's custom elements, which a page loads on demand through `<ui-root>`
 * ("Component packs" in Spell UI's `AGENTS.md`);  and its build, from its sources, into its generated folder,
 * `components/__pack/` (`__pack/` in its families' folder, `components`):
 * - `<pack>.catalog.ts`:  tag => family folder + skeleton, read from every vocabulary (`<Name>.en.ts`) in
 *   `components/` by `RootCatalog` (as Spell UI's `yarn gen:root` builds its `UIRoot.catalog.ts`);
 *   its second line records the sources' hash (`hash()`), which `check()` compares
 * - `<pack>.entry.ts`:  `SpellUI.registerPack({ name, prefix, catalog, families, loadFamily, define })`
 *   - `loadFamily(folder)` imports one family's module, `<pack>/<family>.js` beside the script;  `define()` all of them
 *   - a page that loads families on first use (the docs bundle) asks for each as one of its elements is made;  any
 *     other calls `define()` (epic `solid-2-final` P7)
 * - `<pack>/<family>.js`:  each family an ES module, what two or more share in ONE chunk beside them (`bundleFamilies()`),
 *   minified, on `elementBaseConfig()`, the settings Spell UI's own elements build on (decorators BEFORE Solid,
 *   Solid's JSX, Lightning CSS);  every `PACK_MODULES` import read from `globalThis.SpellUI.packModules[<specifier>]`
 *   (`withPageModules()`):  the page's one Solid, one element layer and one Spell UI core
 * - `<pack>.pack.js`:  the entry built by Vite as ONE classic script (an IIFE), minified, the script a page names
 *   - its banner records the same hash
 * - The catalog and entry are committed;  the script and the families are built where they're served (the page
 *   server's `spell bundle epics-pack`, `spell publish`), git-ignored:  their hashed chunk names would churn every diff
 * - then its set's docs data, `docs/__data/` (`buildSiteData()`)
 * - `<pack>.pack.ts`, a Spell project's pack's alone (`devEntry`):  the SAME registration as the entry (its tags, its
 *   families), each family imported from its SOURCE, for a dev server that compiles the families itself (the
 *   editor's Vite:  a saved element swapped in by its hot replacement, in well under a second;  app's
 *   `vite.config.ts`, `projectPacksInDev()`);  rewritten only when its text changes (a tag or a family added or
 *   dropped), so a save to an element leaves it alone
 * - A pack is a package whose `package.json` has `"spellPack": { "prefix" }`, or a SPELL PROJECT whose project file,
 *   `__project.json5`, has `"componentPack": { "name", "prefix" }`, the same shape (`read()`)
 *   - a project's pack is built with its compiled output (spell-app's `spell compile`):  its generated folder is
 *     beside `<Project>.spell.js`, in the project's BUILD folder (`generated`), never committed;  its code is the
 *     whole project's (`src`:  an element may import the project's own files)
 * - Run by `spell-pack build | check` (the kit's `bin/spell-pack.mjs`), from any repo of the kit:
 *   spell-epic and the brand build theirs with it.  spell-app's `spell pack` calls it too.
 * - Node built-ins, `RootCatalog` and (only while building) Vite.
 * - Its generated files still name `spell pack build <pack>`, the command that made them first:
 *   the packs come out byte for byte as before this tool moved to Spell UI (epic `repo-split` P5), then to the kit
 *   (P10:  it was Spell UI's published `spell-ui-pack`, which ran files Spell UI doesn't ship, C10).
 ****************/
export class ComponentPack {
  /** its name, e.g. `epics`:  its files' (`epics.pack.js`) */
  readonly name: string
  /** every tag's, e.g. `epic-` */
  readonly prefix: string
  /** the folder of its `package.json`, absolute:  its yarn scripts run there */
  readonly folder: string
  /** the folder of its `docs/` (and, by default, its `components/`), absolute */
  readonly dir: string
  /** the folder of the code its elements share with node (its package's `src/`), absolute */
  readonly src: string
  /** its element families' folder, absolute:  `<dir>/components`, or the brand's `src/components` */
  readonly components: string
  /** its package's npm name (`spell-x`):  its own files, imported by it, are the pack's too (`sources()`) */
  readonly packageName: string | undefined

  /** where its generated files go, absolute:  `<components>/__pack` (`PACK_FOLDER`), or a project's build folder's */
  readonly generated: string

  /** whether its build writes its source entry too, `<pack>.pack.ts`, for a dev server:  a Spell project's pack */
  readonly devEntry: boolean

  constructor({
    name,
    prefix,
    folder,
    dir = folder,
    src = join(dir, "src"),
    components = join(dir, COMPONENTS_FOLDER),
    packageName,
    generated = join(components, PACK_FOLDER),
    devEntry = false
  }: ComponentPackProps) {
    this.name = name
    this.prefix = prefix
    this.folder = folder
    this.dir = dir
    this.src = src
    this.components = components
    this.packageName = packageName
    this.generated = generated
    this.devEntry = devEntry
  }

  /**
   * The pack in `folder`:  its `package.json`'s `"spellPack"`, else its project file's `"componentPack"` (a Spell
   * project's own elements) -- the same shape, read here alone.
   * - `prefix`, required;  `name`, by default the folder's name
   * - `dir`:  the folder holding its `components/` and `docs/`, relative to `folder`, and its code's folder
   *   (no `src/` inside it):  a repo that IS one pack (spell-epic:
   *   `"spellPack": { "name": "epics", "prefix": "epic-", "dir": "src" }`, epic `epic-eject` J14)
   * - without `dir`:  `components/` and `docs/` in `folder`, its code in `src/`
   * - `components`:  the families' folder, relative to `folder`, when it isn't `<dir>/components`:  a package whose
   *   code is all in ONE `src/`, its docs outside it (the brand:  `"components": "src/components"`, epic `repo-split`
   *   P14)
   * - A project's:  its code is the whole project (`src` is `folder`), and it has no package name;  `dir` is never read
   * - `generated`:  where its generated files go, when not `<components>/__pack`:  a project's build folder's
   *   `__pack/`, as `spell compile` builds it
   * - Throws `ComponentPackError` when `folder` has neither, naming both.
   */
  static read(_folder: string, { generated }: { generated?: string } = {}): ComponentPack {
    const folder = resolve(_folder)
    const { spellPack, name: ownName } = ComponentPack.packageJson(folder)
    const project = typeof spellPack?.prefix === "string" ? undefined : ComponentPack.projectPackOf(folder)
    const declared = project ?? spellPack
    if (typeof declared?.prefix !== "string") {
      throw new ComponentPackError(
        `ComponentPack.read():  ${join(folder, "package.json")} has no "spellPack": { "prefix" }, and ` +
          `${join(folder, PROJECT_FILE)} no "componentPack": { "name", "prefix" }, so it isn't a component pack;  ` +
          'add one, e.g. `"componentPack": { "name": "widgets", "prefix": "widget-" }`'
      )
    }
    const packageName = project ? undefined : (ComponentPack.importNameOf(folder) ?? ownName)
    const props = {
      name: typeof declared.name === "string" ? declared.name : basename(folder),
      prefix: declared.prefix,
      folder,
      ...(typeof declared.components === "string" && { components: join(folder, declared.components) }),
      ...(typeof packageName === "string" && { packageName }),
      ...(generated !== undefined && { generated: resolve(generated) })
    }
    if (project) return new ComponentPack({ ...props, src: folder, devEntry: true })
    if (typeof declared.dir !== "string") return new ComponentPack(props)
    const dir = join(folder, declared.dir)
    return new ComponentPack({ ...props, dir, src: dir })
  }

  /**
   * The prefix of the pack in folder `folder`, from its `package.json`'s `spellPack` or its project file's
   * `componentPack`;  `undefined` when it isn't one.
   * - NEVER throws:  no file, or bad JSON, is "not a pack".
   */
  static prefixOf(folder: string): string | undefined {
    const { spellPack } = ComponentPack.packageJson(folder)
    const declared = typeof spellPack?.prefix === "string" ? spellPack : ComponentPack.projectPackOf(folder)
    return typeof declared?.prefix === "string" ? declared.prefix : undefined
  }

  /**
   * The `"componentPack"` of the Spell project in `folder`, from its project file (`PROJECT_FILE`);  `undefined` when
   * it has none, or isn't a project.
   * - NEVER throws:  a project file that won't read is "no pack" (the compile says what's wrong with it).
   */
  static projectPackOf(folder: string): PackDeclared | undefined {
    try {
      const file = join(folder, PROJECT_FILE)
      if (!existsSync(file)) return undefined
      const { componentPack } = readJSON5File<{ componentPack?: unknown }>(file)
      return typeof componentPack === "object" && componentPack !== null ? (componentPack as PackDeclared) : undefined
    } catch {
      return undefined
    }
  }

  /**
   * `spell-pack build | check [<folder>]`:  build pack `<folder>` (default the current folder), or say whether
   * it's current.  Returns the exit code:  0 built or current, 1 stale or failed, 2 bad arguments.
   * - Prints through `Terminal`:  what it wrote, or each stale file and the command that fixes it.
   * - Paths are printed relative to the current folder.
   */
  static async main(argv: string[]): Promise<number> {
    const [verb, folder = ".", ...extra] = argv
    if ((verb !== "build" && verb !== "check") || extra.length) {
      Terminal.err(USAGE)
      return 2
    }
    try {
      const pack = ComponentPack.read(folder)
      const shown = (file: string) => relative(process.cwd(), file) || "."
      if (verb === "build") {
        const report = await pack.build()
        Terminal.out(
          [
            `built ${report.pack}:  ${report.tags.length} tags, sources ${report.hash}`,
            ...report.files.map(shown)
          ].join("\n  ")
        )
        return 0
      }
      const { stale } = await pack.check()
      Terminal.out(
        [
          `${pack.name}:  ${stale.length ? "STALE" : "current"}`,
          ...stale.map((it) => `${shown(it.file)}:  ${it.reason}`)
        ].join("\n  ")
      )
      if (stale.length) Terminal.out(`fix:  spell-pack build ${shown(pack.folder)}`)
      return stale.length ? 1 : 0
    } catch (error) {
      if (!(error instanceof ComponentPackError)) throw error
      Terminal.err(error.message)
      return 1
    }
  }

  /**
   * Build the pack:  its generated files (`files`), then its set's docs data (`buildSiteData()`).
   * - `forPage`:  for a page that's open, which swaps it in (the page server's rebuild as an element is saved):
   *   unminified (faster, and a stack names its lines), and its shared chunks named afresh, so a
   *   family swapped back to what the page ran before (an edit undone) brings classes of its own, not the ones the
   *   browser kept from that chunk's first load
   * - Throws `ComponentPackError` for a tag without the pack's prefix, an import of Spell UI or Solid the page can't
   *   share, or a docs data builder that fails.
   */
  async build({ forPage = false }: { forPage?: boolean } = {}): Promise<ComponentPackBuild> {
    const hash = this.hash()
    const catalog = await this.catalog()
    const { files } = this
    mkdirSync(this.generated, { recursive: true })
    writeFileSync(files.catalog, this.catalogSource(catalog, hash))
    writeFileSync(files.entry, this.entrySource())
    // only when it changes:  a dev server serving it reloads the page for a new one (a tag added), never for a save
    const devEntry = this.devEntry ? this.devEntrySource(catalog) : undefined
    if (devEntry !== undefined && ComponentPack.readText(files.devEntry) !== devEntry) {
      writeFileSync(files.devEntry, devEntry)
    }
    const written = await this.bundle(hash, forPage)
    const data = this.buildSiteData() ? [join(this.dir, DOCS_DATA_FOLDER)] : []
    return {
      pack: this.name,
      files: [files.catalog, files.entry, ...(devEntry === undefined ? [] : [files.devEntry]), ...written, ...data],
      tags: Object.keys(catalog).sort(),
      hash
    }
  }

  /**
   * Must its script be built again:  it's not there, or was built from other sources than there are now (`hash()`)?
   * - What `spell compile` asks, before it builds a project's pack:  only when its sources changed.
   * - Never runs the build;  reads its script's banner.
   */
  needsBuild(): boolean {
    const script = ComponentPack.readText(this.files.script)
    return script === undefined || ComponentPack.recordedHash(script) !== this.hash()
  }

  /**
   * Whether the pack's generated files are CURRENT, built from its sources as they are now.
   * - `stale` names each one that isn't, and why;  none means current.
   * - The catalog:  its recorded hash is the sources' (`hash()`),
   *   and its text is what a build writes now (so a hand edit shows too)
   * - The entry:  its text, while the sources are current (it holds each family's hash);  the script, when built:  its
   *   banner's hash (not built at all is no stale file:  it's never committed)
   * - And the set's docs data:  its builder's `--check` (`buildSiteData()`)
   * - Doesn't build:  fast enough for every `yarn test` (a pack's own test runs it)
   */
  async check(): Promise<ComponentPackCheck> {
    const hash = this.hash()
    const { files } = this
    const stale: ComponentPackStale[] = []
    const add = (file: string, reason: string) => stale.push({ file, reason })
    const catalog = ComponentPack.readText(files.catalog)
    if (catalog === undefined) add(files.catalog, "missing")
    else if (ComponentPack.recordedHash(catalog) !== hash) add(files.catalog, "built from older sources")
    else if (catalog !== this.catalogSource(await this.catalog(), hash)) {
      add(files.catalog, "not what a build writes (edited by hand?)")
    }
    const entry = ComponentPack.readText(files.entry)
    const sourcesChanged = catalog !== undefined && ComponentPack.recordedHash(catalog) !== hash
    if (entry === undefined) add(files.entry, "missing")
    // the entry carries each family's hash, so changed sources change it too:  the catalog and script say so already
    else if (!sourcesChanged && entry !== this.entrySource()) add(files.entry, "not what a build writes")
    // the script and families are built where they're served, never committed (epic `solid-2-final` P7):  none yet
    // is no stale file (a fresh checkout, CI);  one built from older sources is
    const script = ComponentPack.readText(files.script)
    if (script !== undefined && ComponentPack.recordedHash(script) !== hash)
      add(files.script, "built from older sources")
    if (this.hasSiteData && !this.buildSiteData({ check: true })) {
      add(join(this.dir, DOCS_DATA_FOLDER), `not what \`yarn ${SITE_DATA_SCRIPT}\` writes now`)
    }
    return { pack: this.name, hash, stale }
  }

  /**
   * Write the set's docs data, `docs/__data/` (`components.json5`, `search.json5` ...), with the pack's OWN data
   * builder:  its `package.json`'s `site:data` script, run in its folder (epic `people-and-orgs` P18).
   * - One builder per set, since each reads its elements its own way:
   *   - Epic UI's from the pack's definitions
   *   - the brand's through Spell UI's `SiteDataBuilder`
   * - `check`:  runs it with `--check`, writing nothing;  `false` when the data is stale.
   * - `false` when there's no builder (`hasSiteData`):  nothing written, and nothing to check.
   * - Throws `ComponentPackError` when the builder fails (not just stale).
   */
  buildSiteData({ check = false } = {}): boolean {
    if (!this.hasSiteData) return false
    const run = spawnSync("yarn", [SITE_DATA_SCRIPT, ...(check ? ["--check"] : [])], {
      cwd: this.folder,
      encoding: "utf8"
    })
    if (run.status === 0) return true
    if (check && run.status === 1) return false
    throw new ComponentPackError(
      `pack '${this.name}':  \`yarn ${SITE_DATA_SCRIPT}\` failed (in ${this.folder}):\n${run.stdout}${run.stderr}`
    )
  }

  /** Whether the pack has a docs set to build data for:  a `site:data` script (`buildSiteData()`). */
  get hasSiteData(): boolean {
    return Boolean(ComponentPack.packageJson(this.folder).scripts?.[SITE_DATA_SCRIPT])
  }

  /**
   * The hash of everything the pack's generated files are built from:  `sources()`, each with its path;
   * the pack's name and prefix;  `PACK_FORMAT`.  16 hex digits of sha-256.
   */
  hash(): string {
    const hash = createHash("sha256").update(`${PACK_FORMAT}\n${this.name}\n${this.prefix}\n`)
    for (const file of this.sources()) hash.update(`${relative(this.dir, file)}\n`).update(readFileSync(file))
    return hash.digest("hex").slice(0, 16)
  }

  /**
   * The files the pack's script is built from, absolute, sorted:  every file under `components/`, plus every file of
   * the pack's own `components/` or `src` they import, transitively.
   * - Not the rest of `src`:  node-only code there (a tool, its tests) never reaches the script,
   *   so editing it leaves the pack current.
   * - Imports are found by the kit's TypeScript reader (`readTypeScript()`):
   *   static ones, re-exports and `import("...")`.
   * - Resolved as the build does:  relative, the package's own name
   *   (`spell-x/components/x-color`:  its `src/`);
   *   `?inline` and other queries dropped, extensions and `index` tried.
   * - Tests and snapshots never count.
   */
  sources(): string[] {
    return this.sourcesFrom(ComponentPack.filesUnder(this.components))
  }

  /**
   * Each family folder => a hash of ITS sources:  the files in its folder, and every file of the pack they import,
   * transitively (`sources()`' rule).  16 hex digits of sha-256.
   * - In the entry's `registerPack({ families })`:  a page swapping in the rebuilt pack re-renders only the families
   *   whose hash changed (Spell UI's `PackHotSwap`, epic `epic-engine` I116).
   * - A file shared by several families (a base class, a types file) counts in each that imports it, so they all
   *   re-render when it changes.
   */
  familyHashes(): Record<string, string> {
    const hashes: Record<string, string> = {}
    for (const family of this.families()) {
      const hash = createHash("sha256")
      for (const file of this.sourcesFrom(ComponentPack.filesUnder(join(this.components, family)))) {
        hash.update(`${relative(this.dir, file)}\n`).update(readFileSync(file))
      }
      hashes[family] = hash.digest("hex").slice(0, 16)
    }
    return hashes
  }

  /** The files reachable from `start`, absolute, sorted:  `start` and what it imports of the pack's own, transitively. */
  private sourcesFrom(start: string[]): string[] {
    const sources = new Set<string>()
    const queue = [...start]
    while (queue.length) {
      const file = queue.pop()!
      if (sources.has(file) || NOT_SOURCE.test(file) || !this.isSource(file)) continue
      sources.add(file)
      if (!SCRIPT.test(file)) continue
      for (const { from } of readTypeScript(file, readFileSync(file, "utf8")).imports) {
        const imported = this.resolveImport(file, from)
        if (imported) queue.push(imported)
      }
    }
    return [...sources].sort()
  }

  /** The pack's family folders:  each `components/<tag>/` with an `index.ts` barrel, sorted. */
  families(): string[] {
    const { components } = this
    if (!existsSync(components)) return []
    return readdirSync(components, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(components, entry.name, "index.ts")))
      .map((entry) => entry.name)
      .sort()
  }

  /** The pack's generated files, absolute. */
  get files() {
    const folder = this.generated
    return {
      catalog: join(folder, `${this.name}.catalog.ts`),
      entry: join(folder, `${this.name}.entry.ts`),
      devEntry: join(folder, `${this.name}.pack.ts`),
      script: join(folder, `${this.name}.pack.js`),
      families: join(folder, this.name)
    }
  }

  ////////////////
  // ## Generated files
  ////////////////

  /**
   * The pack's catalog, read from its vocabularies by `RootCatalog`.
   * - Throws `ComponentPackError` for a tag without the pack's prefix:  `<ui-root>` knows a pack's tags by it.
   */
  private async catalog(): Promise<Record<string, RootCatalogEntry>> {
    const { components } = this
    const catalog = existsSync(components) ? await RootCatalog.read([components]) : {}
    const strays = Object.keys(catalog).filter((tag) => !tag.startsWith(this.prefix))
    if (strays.length) {
      throw new ComponentPackError(
        `pack '${this.name}':  every tag must start '${this.prefix}', but these don't:  ${strays.join(", ")}`
      )
    }
    return catalog
  }

  /**
   * The text of `<pack>.catalog.ts`.
   * - It imports Spell UI's `RootCatalogEntry` type:  a pack's own code, which registers with Spell UI's `<ui-root>`
   *   (every pack's repo has Spell UI);  the kit itself imports nothing of Spell UI.
   */
  private catalogSource(catalog: Record<string, RootCatalogEntry>, hash: string): string {
    const lines = RootCatalog.lines(catalog)
    return `/* GENERATED -- do not edit:  \`spell pack build ${this.name}\`, from every vocabulary, \`<Name>.en.ts\` */
// sources:  ${hash}

import type { RootCatalogEntry } from "spell/ui"

/** Every tag of the \`${this.name}\` pack => what \`<ui-root>\` needs before its family loads. */
export const CATALOG: Readonly<Record<string, RootCatalogEntry>> = {
${lines.join(",\n")}${lines.length ? "\n" : ""}}
`
  }

  /** The text of `<pack>.entry.ts`. */
  private entrySource(): string {
    const families = Object.entries(this.familyHashes()).map(
      ([family, hash]) => `  ${JSON.stringify(family)}: "${hash}"`
    )
    return `/* GENERATED -- do not edit:  \`spell pack build ${this.name}\` */
/**
 * The \`${this.name}\` pack's script:  registers with the page's Spell UI, which adds the catalog, and loads its
 * families (\`${this.name}/<family>.js\`, ES modules beside the script) on first use, or all at once (\`define()\`).
 * - \`families\`:  each family's sources' hash, so a page swapping in a rebuilt pack re-renders only what changed;
 *   and its module's query, so a rebuilt family is a new module, an unchanged one the same
 */
import { CATALOG } from "./${this.name}.catalog"

/** The page's Spell UI (the docs bundle's, the site's):  \`loading\` until the docs bundle has run (\`spell-ui.js\`). */
const { SpellUI } = globalThis as unknown as {
  SpellUI?: { registerPack?(pack: object): void; loading?: Promise<unknown> }
}

/** This script's own address:  its families are beside it.  Read as it runs, while \`currentScript\` is set. */
const BASE = document.currentScript instanceof HTMLScriptElement ? document.currentScript.src : location.href

/** Each family folder => its sources' hash. */
const FAMILIES: Record<string, string> = {
${families.join(",\n")}
}

/**
 * Each family's versions this page imported, in order, by \`<pack>/<family>\`:  page-wide, so a rebuilt copy of this
 * script (a swap) sees what the last one imported.
 */
const IMPORTED = ((globalThis as unknown as { __spellPackFamilies?: Record<string, string[]> }).__spellPackFamilies ??=
  {})

/**
 * Import family \`folder\`'s module, which defines its tags.
 * - Its query is its sources' hash, so an unchanged family is the module the page has;  a version the page had
 *   BEFORE the last (an edit undone) gets a query of its own, or the browser would hand back that module, whose
 *   \`define()\` ran long ago, and the page keep the newer one.
 */
function loadFamily(folder: string): Promise<unknown> {
  const hash = FAMILIES[folder] ?? ""
  const seen = (IMPORTED[\`${this.name}/\${folder}\`] ??= [])
  if (seen[seen.length - 1] !== hash) seen.push(hash)
  const again = seen.indexOf(hash) < seen.length - 1 ? \`-\${seen.length}\` : ""
  const url = new URL(\`./${this.name}/\${folder}.js?v=\${hash}\${again}\`, BASE)
  return import(/* @vite-ignore */ url.href)
}

function register() {
  SpellUI!.registerPack!({
    name: ${JSON.stringify(this.name)},
    prefix: ${JSON.stringify(this.prefix)},
    catalog: CATALOG,
    families: FAMILIES,
    loadFamily,
    define: () => Promise.all(Object.keys(FAMILIES).map(loadFamily)).then(() => undefined)
  })
}

if (SpellUI?.registerPack) register()
else void SpellUI?.loading?.then(register)
`
  }

  /**
   * The text of `<pack>.pack.ts`:  the entry's registration, its families imported from their sources, for a dev
   * server that compiles them itself (see the class).
   * - The same catalog as the entry's (inline, without the sources' hash, so a save leaves the file as it was) and
   *   the same families;  no `families` hashes:  the dev server swaps a saved family in itself (`HotElements`).
   * - Each family by its absolute path:  the dev server reads it from the project's folder.
   */
  private devEntrySource(catalog: Record<string, RootCatalogEntry>): string {
    const lines = RootCatalog.lines(catalog)
    const loaders = this.families().map(
      (family) =>
        `  ${JSON.stringify(family)}: () => import(${JSON.stringify(join(this.components, family, "index.ts"))})`
    )
    return `/* GENERATED -- do not edit:  \`spell pack build ${this.name}\`, its families from their sources, for a dev server */
import type { RootCatalogEntry } from "spell/ui"

/** The page's Spell UI, as the entry finds it. */
const { SpellUI } = globalThis as unknown as { SpellUI?: { registerPack?(pack: object): void } }

/** Every tag of the \`${this.name}\` pack => what \`<ui-root>\` needs before its family loads:  the catalog's. */
const CATALOG: Readonly<Record<string, RootCatalogEntry>> = {
${lines.join(",\n")}${lines.length ? "\n" : ""}}

/** Each family folder => its module, from its source. */
const FAMILIES: Record<string, () => Promise<unknown>> = {
${loaders.join(",\n")}
}

/** Import family \`folder\`'s module, which defines its tags. */
function loadFamily(folder: string): Promise<unknown> {
  return FAMILIES[folder]?.() ?? Promise.reject(new Error(\`no family \${folder} in the ${this.name} pack\`))
}

SpellUI!.registerPack!({
  name: ${JSON.stringify(this.name)},
  prefix: ${JSON.stringify(this.prefix)},
  catalog: CATALOG,
  loadFamily,
  define: () => Promise.all(Object.keys(FAMILIES).map(loadFamily)).then(() => undefined)
})
`
  }

  /**
   * Vite's cache, for a pack whose generated folder isn't in its own folder (a project's, in its build folder):
   * there, so a build never writes a \`node_modules/.vite\` into the project.
   */
  private get cacheDir(): { cacheDir?: string } {
    return pathInside(this.dir, this.generated) === undefined ? { cacheDir: join(this.generated, ".vite") } : {}
  }

  /**
   * Build the pack's script and its families;  returns the files written.
   * - Its families first (`bundleFamilies()`), then the entry into `<pack>.pack.js`, ONE classic script (an IIFE):
   *   the script a page names, which registers the pack at once and imports each family when asked (`loadFamily()`).
   * - In this process, through Vite's API, on `elementBaseConfig()`, as Spell UI's own elements are built;
   *   `configFile: false`:  the pack's own `vite.config.ts` holds only lint / format settings.
   */
  private async bundle(hash: string, forPage: boolean): Promise<string[]> {
    const { build } = await import("vite-plus")
    const families = await this.bundleFamilies(forPage)
    const minify = !forPage
    const base = elementBaseConfig()
    const folder = this.generated
    const { files } = this
    const result = await build({
      ...base,
      configFile: false,
      root: this.dir,
      ...this.cacheDir,
      logLevel: "warn",
      publicDir: false,
      build: {
        outDir: folder,
        emptyOutDir: false,
        sourcemap: false,
        minify,
        target: "esnext",
        reportCompressedSize: false,
        lib: {
          entry: files.entry,
          formats: ["iife"],
          name: "SpellPack",
          fileName: () => `${this.name}.pack.js`
        },
        rolldownOptions: { external: this.external, output: { keepNames: true } }
      }
    })
    // The banner goes on AFTER the build:  the minifier drops `output.banner`'s comment
    const banner = `/* GENERATED -- do not edit:  \`spell pack build ${this.name}\`.  sources:  ${hash} */`
    writeFileSync(files.script, `${banner}\n${readFileSync(files.script, "utf8")}`)
    const outputs = (Array.isArray(result) ? result : [result]).flatMap((it) => ("output" in it ? it.output : []))
    return [...outputs.map((chunk) => join(folder, chunk.fileName)), ...families]
  }

  /**
   * Build every family into `<pack>/<family>.js` (`files.families`), an ES module each, what they share in chunks
   * beside them (`<name>-<hash>.js`), minified;  returns the files written.
   * - Every `PACK_MODULES` import is the page's:  rewritten to read `globalThis.SpellUI.packModules[<specifier>]`
   *   (`withPageModules()`), so a page has one Solid, one element layer and one Spell UI core.
   * - Built in a folder of this run's, then swapped in whole:  a page loading a family meanwhile finds every chunk.
   */
  private async bundleFamilies(forPage: boolean): Promise<string[]> {
    const { build } = await import("vite-plus")
    const base = elementBaseConfig()
    const out = this.files.families
    const building = `${out}.building-${process.pid}`
    rmSync(building, { recursive: true, force: true })
    const input = Object.fromEntries(
      this.families().map((family) => [family, join(this.components, family, "index.ts")])
    )
    try {
      await build({
        ...base,
        configFile: false,
        root: this.dir,
        ...this.cacheDir,
        base: "./",
        logLevel: "warn",
        publicDir: false,
        build: {
          outDir: building,
          emptyOutDir: true,
          sourcemap: false,
          minify: !forPage,
          target: "esnext",
          modulePreload: false,
          reportCompressedSize: false,
          rolldownOptions: {
            input,
            preserveEntrySignatures: "allow-extension",
            external: this.external,
            output: {
              // custom element class names are read by dev-time warnings and the manifest (see ui's `vite.config.ts`)
              keepNames: true,
              entryFileNames: "[name].js",
              // for an open page, a name no build had before (see `build()`)
              chunkFileNames: forPage ? `[name]-${Date.now().toString(36)}-[hash].js` : "[name]-[hash].js",
              // what two families or more share, in ONE chunk:  dozens of small ones were a round trip each on a slow
              // network (an epic page loads nearly every family);  a family's own code stays its own
              codeSplitting: { groups: [{ name: "shared", minShareCount: 2 }] }
            }
          }
        }
      })
      const written = ComponentPack.filesUnder(building).filter((file) => file.endsWith(".js"))
      for (const file of written) writeFileSync(file, ComponentPack.withPageModules(readFileSync(file, "utf8"), file))
      rmSync(out, { recursive: true, force: true })
      renameSync(building, out)
      return written.map((file) => join(out, relative(building, file)))
    } finally {
      rmSync(building, { recursive: true, force: true })
    }
  }

  /**
   * Which imports the pack's builds leave out:  `PACK_MODULES`, the page's;  its own package's files are bundled.
   * - Throws `ComponentPackError` on an import of Spell UI, the element layer or Solid that the page can't share.
   */
  private readonly external = (id: string): boolean => {
    if (PACK_MODULES.includes(id)) return true
    if (this.isOwnName(id)) return false
    if (SHARED_IMPORT.test(id)) {
      throw new ComponentPackError(
        `pack '${this.name}':  imports '${id}', which the page can't share;  import from ` +
          `${PACK_MODULES.map((it) => `'${it}'`).join(", ")} only, or add it to PACK_MODULES ` +
          "(the kit's src/element-tools/packModules.ts) and Spell UI's packModules"
      )
    }
    return false
  }

  /**
   * `code`, a built family module, with each import of a `PACK_MODULES` specifier read from the page instead:
   * `import{a as b,c}from"solid-js"` => `const{a:b,c}=globalThis.SpellUI.packModules["solid-js"]`.
   * - The forms the build writes:  named (`{ a as b }`), a namespace (`* as x`), a default (`x`), and bare.
   * - Throws `ComponentPackError` when one is left (a form it can't read), naming the file:  a page would fail to
   *   load it, as no import map names these.
   */
  static withPageModules(code: string, file: string): string {
    const page = (specifier: string) => `globalThis.SpellUI.packModules[${JSON.stringify(specifier)}]`
    const rewritten = code.replace(PAGE_MODULE_IMPORT, (whole, clause: string | undefined, specifier: string) => {
      if (!PACK_MODULES.includes(specifier)) return whole
      const names = (clause ?? "").trim()
      if (!names) return ""
      const namespace = /^\*\s*as\s+([\w$]+)$/.exec(names)
      if (namespace) return `const ${namespace[1]}=${page(specifier)};`
      const named = /^(?:([\w$]+)\s*,\s*)?\{([^}]*)\}$/.exec(names)
      const single = /^([\w$]+)$/.exec(names)
      const defaultName = named?.[1] ?? single?.[1]
      const pairs = (named?.[2] ?? "")
        .split(",")
        .map((it) => it.trim())
        .filter(Boolean)
        .map((it) => it.replace(/^([\w$]+)\s+as\s+([\w$]+)$/, "$1:$2"))
      if (defaultName) pairs.unshift(`default:${defaultName}`)
      if (!named && !single) return whole
      return `const{${pairs.join(",")}}=${page(specifier)};`
    })
    const left = [...rewritten.matchAll(PAGE_MODULE_IMPORT)]
      .map((match) => match[2])
      .filter((it) => PACK_MODULES.includes(it!))
    if (left.length) {
      throw new ComponentPackError(
        `ComponentPack:  ${file} still imports ${left.join(", ")} in a form it can't rewrite`
      )
    }
    return rewritten
  }

  /**
   * The file import `specifier` in file `from` names, when it's the pack's own:  relative, its package's own name
   * (`spell-x/X` ~== `<folder>/src/X`).
   * - `undefined` for anything else (Spell UI, Solid, npm), or a path that isn't a file.
   */
  private resolveImport(from: string, specifier: string): string | undefined {
    const path = specifier.replace(/\?.*$/, "")
    const base = path.startsWith(".")
      ? join(dirname(from), path)
      : this.isOwnName(path)
        ? join(this.folder, "src", path.slice(this.packageName!.length))
        : undefined
    if (base === undefined) return undefined
    const candidates = [base, ...RESOLVE_SUFFIXES.map((suffix) => base + suffix)]
    // TS's ESM style:  `./x.js` for `./x.ts`
    if (/\.[cm]?js$/.test(base)) candidates.push(base.replace(/js$/, "ts"), base.replace(/js$/, "tsx"))
    return candidates.find((it) => existsSync(it) && statSync(it).isFile())
  }

  /** Whether import `specifier` names its own package, or a file of it:  `spell-x`, `spell-x/components`. */
  private isOwnName(specifier: string): boolean {
    const own = this.packageName
    return own !== undefined && (specifier === own || specifier.startsWith(`${own}/`))
  }

  /**
   * Whether `file` is under one of the folders the pack's script may be built from:
   * its elements (`components/`), and the code they share with node (`src`).
   */
  private isSource(file: string): boolean {
    return [this.components, this.src].some((folder) => pathInside(folder, file) !== undefined)
  }

  ////////////////
  // ## Files
  ////////////////

  /** The `package.json` in `folder`, as far as it's read here;  `{}` when there's none, or bad JSON.  NEVER throws. */
  private static packageJson(folder: string): PackPackageJson {
    try {
      return JSON.parse(readFileSync(join(folder, "package.json"), "utf8")) as PackPackageJson
    } catch {
      return {}
    }
  }

  /**
   * The name a kit FOLDER's files are imported by, `<kit>/<folder>` (`spell/epic`:  epic `repo-split` P20), when
   * `folder` is one of the kit's `workspaces`;  else `undefined`, and the folder's own package name holds.
   */
  private static importNameOf(folder: string): string | undefined {
    const kit = ComponentPack.packageJson(dirname(folder)) as PackPackageJson & { workspaces?: unknown }
    const workspaces = Array.isArray(kit.workspaces) ? kit.workspaces : []
    return typeof kit.name === "string" && workspaces.includes(basename(folder))
      ? `${kit.name}/${basename(folder)}`
      : undefined
  }

  /** The hash a generated file records, if any. */
  private static recordedHash(text: string): string | undefined {
    return HASH_RECORD.exec(text)?.[1]
  }

  /** `file`'s text, or `undefined` when there's none. */
  private static readText(file: string): string | undefined {
    return existsSync(file) ? readFileSync(file, "utf8") : undefined
  }

  /** Every file under `dir`, recursively, sorted by path;  none when it doesn't exist. */
  private static filesUnder(dir: string): string[] {
    if (!existsSync(dir)) return []
    const files: string[] = []
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) files.push(...ComponentPack.filesUnder(path))
      else files.push(path)
    }
    return files
  }
}

/** Constructor props of `ComponentPack`;  `read()` makes them from a `package.json`. */
export type ComponentPackProps = {
  name: string
  prefix: string
  /** the folder of its `package.json`, absolute */
  folder: string
  /** the folder of its `docs/` (and, by default, its `components/`);  default `folder` */
  dir?: string
  /** the folder of the code its elements share with node;  default `dir`'s `src/` */
  src?: string
  /** its element families' folder;  default `dir`'s `components/` */
  components?: string
  /** its package's npm name, from its `package.json` */
  packageName?: string
  /** where its generated files go;  default `components`' `__pack/` */
  generated?: string
  /** whether its build writes its source entry, for a dev server;  default `false` (a project's:  `true`) */
  devEntry?: boolean
}

/**
 * What a pack's `package.json` says (`"spellPack"`), or a Spell project's file (`"componentPack"`):  the same shape.
 * - `name` / `prefix`:  its files' name and every tag's;  `components`:  its families' folder, from its folder;
 *   `dir`:  a package's alone (see `ComponentPack.read()`)
 */
export type PackDeclared = { prefix?: unknown; name?: unknown; dir?: unknown; components?: unknown }

/**
 * A Spell project's file, which may declare its pack (`"componentPack"`):  spell-parser's `SP.PROJECT_FILE`, a copy
 * (the kit imports no folder above it).
 */
export const PROJECT_FILE = "__project.json5"

/** A pack's element families' folder, in its `dir`, unless its `spellPack` says `components`. */
const COMPONENTS_FOLDER = "components"

/**
 * A pack's generated folder, inside its families' folder (`components`;  epic `people-and-orgs` P18, Q27 / Q33):
 * it's built from that folder and nothing else, so it sits with it;
 * `__` marks it as built, never a family (no tag starts with `_`).
 */
export const PACK_FOLDER = "__pack"

/** `spell-pack`'s usage line. */
const USAGE = "usage:  spell-pack build | check [<folder>]   (the pack's package;  default the current folder)"

/**
 * Imports the page must share, never bundled:  spell-element (`spell/element`), Spell UI, Solid, our other repos'
 * packages (`spell-parser`, `spell-app` ..., epic `repo-split` P11).
 */
const SHARED_IMPORT =
  /^solid-js(\/|$)|^@solidjs\/|^spell-(ui|lang|app|brand|epic)(\/|$)|^spell\/(element|ui|parser|epic|app)(\/|$)/

/** Version of what `build()` writes:  bump it when the generated files change shape, so every pack goes stale. */
const PACK_FORMAT = "spell-pack 5"

/** The set's docs data, in the pack's `dir`:  what its pages' side column, search and API tables read. */
const DOCS_DATA_FOLDER = "docs/__data"

/** The yarn script of a pack's package that writes `DOCS_DATA_FOLDER` (`buildSiteData()`);  takes `--check`. */
const SITE_DATA_SCRIPT = "site:data"

/** Files under them that never reach the pack:  tests, their snapshots, and the pack's own generated folder. */
const NOT_SOURCE = /\.test\.[cm]?[jt]sx?$|[\\/]__snapshots__[\\/]|[\\/]components[\\/]__pack[\\/]/

/**
 * A static import in built output, minified or not:  its clause (`{ a as b }`, `* as x`, `x`;  none for a bare one) and
 * its specifier.  Never a dynamic `import(...)`.
 */
const PAGE_MODULE_IMPORT = /\bimport\s*(?:([\w$*{][^;"'`]*?)\s*from\s*)?["']([^"']+)["'];?/g

/** A file whose imports `sources()` follows. */
const SCRIPT = /\.[cm]?[jt]sx?$/

/** What an import's path may leave off, tried in order after the path itself. */
const RESOLVE_SUFFIXES = [".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js"]

/** Where a generated file records the sources' hash:  `sources:  <hash>`. */
const HASH_RECORD = /\bsources: {2}([0-9a-f]{16})\b/

/** The part of a pack's `package.json` read here. */
type PackPackageJson = {
  name?: unknown
  spellPack?: PackDeclared
  scripts?: Record<string, string>
}
