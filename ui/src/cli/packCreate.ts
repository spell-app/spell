import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

import { contentFolderOf } from "spell/server/contentFolder"
import { DataFile } from "spell/server/DataFile"
import { CLI } from "spell/cli"
import { ComponentPack } from "spell/element-tools/ComponentPack"

import { COMMANDS_JSON, type PackInfo, type PackScaffoldReport } from "./cli.types"
import { buildPack, readPack } from "./packBuild"

/**
 * `spell pack create <name> [--prefix x-]`:  make `spell-<name>/`, in kit `root`, a component pack that is a repo of
 * its own, laid out as spell-brand is (epic `repo-split` P14):
 * - ALL its code in ONE `src/`, its families in `src/components/` (`"spellPack": { "components" }`)
 * - every file imported by its package name and path under `src/` (`spell-<name>/components/<tag>`), through
 *   `package.json`'s `exports`:  no alias table
 * - The repo:  `templates/pack/repo/` (this folder's), each `__token__` filled in (`PackTokens`).
 *   - Its tests:  `templates/pack/tests/`, into its own `tests/` (where every repo's tests live).
 *   - A file already there is LEFT ALONE and listed in `skipped`, so it works on a folder that has some files.
 *   - `package.json` is MERGED:  the template's keys it lacks (`scripts`, `spellPack` ...) are added, its own kept.
 *   - `.yarnrc.yml`:  the kit's, without `yarnPath` (the yarn release is the kit's alone).
 * - The kit needs no wiring:  its `workspaces` (`spell-*`) take the new repo in at the next `yarn install`.
 * - The commands page (shared content):  the pack's yarn scripts in its rows, beside spell-brand's (`wirePack()`).
 * - NOT `repos.json5`:  the repo has no remote yet;  `nextSteps()` says what to do.
 * - Then builds the pack (`buildPack()`), unless `build: false`.
 * - Idempotent:  a second run creates nothing and changes nothing.
 * - Throws `CliError` for a bad name or prefix, a repo of the kit's that is no pack, or a prefix other than the pack's
 *   own.
 * - Was `spell dev pack new`, which made `packages/<name>/` in spell-app's monorepo, until epic `repo-split` P13.
 */
export async function createPack(
  root: string,
  name: string,
  options: CreatePackOptions = {}
): Promise<PackScaffoldReport> {
  if (!PACK_NAME.test(name)) {
    throw new CLI.CliError(`pack create:  '${name}' isn't a pack name:  lowercase words joined by dashes, e.g. cards`)
  }
  if (NOT_PACKS.includes(name)) throw new CLI.CliError(`pack create:  spell-${name} is one of the kit's own repos`)
  const dir = join(root, `spell-${name}`)
  const existing = ComponentPack.prefixOf(dir)
  const prefix = options.prefix ?? existing ?? `${name}-`
  if (!TAG_PREFIX.test(prefix) || prefix === "ui-") {
    throw new CLI.CliError(
      `pack create:  '${prefix}' isn't a tag prefix:  lowercase, ending in '-', never 'ui-', e.g. epic-`
    )
  }
  if (existing !== undefined && existing !== prefix) {
    throw new CLI.CliError(`pack create:  '${name}' is already a pack with prefix '${existing}', not '${prefix}'`)
  }
  const pack: PackInfo = { name, prefix, dir }
  const report: PackScaffoldReport = { pack: name, created: [], updated: [], skipped: [] }
  const tokens = packTokens(root, pack)
  writeTemplates(root, join(TEMPLATES, "repo"), dir, tokens, report)
  writeTemplates(root, join(TEMPLATES, "tests"), join(dir, "tests"), tokens, report)
  mergePackageJson(
    root,
    join(dir, "package.json"),
    fillTokens(readTemplate("repo/package.json.template"), tokens),
    report
  )
  writeYarnrc(root, dir, report)
  wirePack(root, pack, report)
  if (options.build !== false) report.built = await buildPack(root, name)
  return report
}

/**
 * `spell pack add <pack> <tag>`:  one element family in pack `packName`, `src/components/<tag>/` (in its
 * `pack.components`), from `templates/pack/element/`, as Spell UI's families are written
 * (no native fallback:  only form controls have one).
 * - every file named for its component:
 *   - `<Name>.tsx`:  the component
 *   - `<Name>.en.ts`:  its vocabulary (topics + aka, skeleton text)
 *   - `<Name>.css`, `index.ts`
 * - its test, `<Name>.test.tsx`, in the pack repo's `tests/components/<tag>/` (`templates/pack/element-tests/`)
 * - then its line in `src/components/index.ts`, and its key in the pack's `package.json` `exports` (`exportFamily()`)
 * - Files already there are left alone (`skipped`);  idempotent.
 * - Then builds the pack, unless `build: false`.
 * - Throws `CliError` when `packName` isn't a pack, or `tag` isn't a custom element name starting with its prefix.
 * - Was `spell dev pack element` until epic `repo-split` P13.
 */
export async function addElement(
  root: string,
  packName: string,
  tag: string,
  options: AddElementOptions = {}
): Promise<PackScaffoldReport> {
  const pack = readPack(root, packName)
  if (!CUSTOM_TAG.test(tag) || !tag.startsWith(pack.prefix) || tag.length === pack.prefix.length) {
    throw new CLI.CliError(
      `pack add:  '${tag}' isn't a tag for pack '${packName}':  lowercase words joined by dashes, starting ` +
        `'${pack.prefix}', e.g. ${pack.prefix}card`
    )
  }
  const report: PackScaffoldReport = { pack: packName, created: [], updated: [], skipped: [] }
  const tokens = elementTokens(root, pack, tag)
  writeTemplates(root, join(TEMPLATES, "element"), join(pack.components, tag), tokens, report)
  writeTemplates(root, join(TEMPLATES, "element-tests"), join(pack.folder, "tests", "components", tag), tokens, report)
  const barrel = join(pack.components, "index.ts")
  if (!existsSync(barrel)) {
    writeFileSync(barrel, fillTokens(readTemplate("repo/src/components/index.ts.template"), tokens))
    report.created.push(relative(root, barrel))
  }
  const text = readFileSync(barrel, "utf8")
  if (text.includes(`from "./${tag}"`)) report.skipped.push(`${relative(root, barrel)} (exports ${tag} already)`)
  else {
    const exports = `${text.replace(/^export \{\}\n/m, "").replace(/\n*$/, "\n")}export * from "./${tag}"\n`
    writeFileSync(barrel, exports)
    report.updated.push(`${relative(root, barrel)} (exports ${tag})`)
  }
  exportFamily(root, pack, tag, report)
  if (options.build !== false) report.built = await buildPack(root, packName)
  return report
}

/**
 * Add family `tag`'s key to pack `pack`'s `package.json` `exports`, before `"./*"`:  `"./components/<tag>"` => its
 * barrel, in the shape every folder barrel's key has (`spell-brand`'s).
 * - Why:  `tsx`, run from another repo, finds a file without its extension, but not a folder's `index`.
 * - Skipped (`report.skipped`) when the key is there, the pack has no `exports`, or its families aren't in `src/`.
 */
function exportFamily(root: string, pack: ComponentPack, tag: string, report: PackScaffoldReport) {
  const file = join(pack.folder, "package.json")
  const json = JSON.parse(readFileSync(file, "utf8")) as { name?: string; exports?: Record<string, unknown> }
  const path = relative(join(pack.folder, "src"), join(pack.components, tag))
  const key = `./${path}`
  if (!json.exports || !json.name || path.startsWith("..") || key in json.exports) {
    return void report.skipped.push(`${relative(root, file)} (exports ${key}:  there already, or no src/ exports)`)
  }
  const entry = {
    [`${json.name}-source`]: `./src/${path}/index.ts`,
    types: `./dist-types/src/${path}/index.d.ts`,
    default: `./src/${path}/index.ts`
  }
  const keys = Object.entries(json.exports)
  const at = keys.findIndex(([each]) => each === "./*")
  keys.splice(at < 0 ? keys.length : at, 0, [key, entry])
  json.exports = Object.fromEntries(keys)
  writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`)
  report.updated.push(`${relative(root, file)} (exports ${key})`)
}

/**
 * What to do after `spell pack create <name>` made a new repo:  the kit can't do these for it.
 * - its own git repo, then `repos.json5`'s list (so `yarn ts`, `yarn test` ... run it), then the install
 */
export function nextSteps(name: string): string[] {
  return [
    `next:  make spell-${name}/ a git repo of its own (\`git -C spell-${name} init\`);`,
    `  add it to the kit's repos.json5, needing spell-ui:  { name: "spell-${name}", url: "...", needs: ["spell-ui"] };`,
    `  \`yarn install\` at the kit's root;  then \`spell pack add ${name} <tag>\``
  ]
}

/** `createPack()`'s options:  `prefix` (default the pack's own, else `<name>-`);  `build` (default `true`). */
export type CreatePackOptions = { prefix?: string; build?: boolean }

/** `addElement()`'s options:  `build` (default `true`). */
export type AddElementOptions = { build?: boolean }

////////////////
// ## Templates
////////////////

/**
 * This folder's templates:  `templates/pack/repo/` (a pack's repo) and `templates/pack/element/` (one family);
 * their tests, `tests/` and `element-tests/`, go into the pack repo's `tests/`.
 */
const TEMPLATES = fileURLToPath(new URL("./templates/pack/", import.meta.url))

/** A template file's suffix, dropped from the file it writes:  so no tool (tsc, lint, vitest) reads a template. */
const TEMPLATE_SUFFIX = ".template"

/** Template files written another way:  `package.json` is merged (`mergePackageJson()`). */
const NOT_COPIED = ["package.json.template"]

/**
 * Template path parts written with a dot in front:  git and the epic tools would read them as THIS folder's own.
 * - `gitignore` => `.gitignore`, `gitattributes` => `.gitattributes`, `epic/` => `.epic/`
 */
const DOT_NAMES = ["gitignore", "gitattributes", "epic"]

/** A pack's name:  lowercase words joined by dashes;  its repo is `spell-<name>`. */
const PACK_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

/** A tag prefix:  lowercase words, each ending in a dash, e.g. `epic-`. */
const TAG_PREFIX = /^([a-z][a-z0-9]*-)+$/

/** A custom element name we write:  lowercase words joined by dashes, at least two. */
const CUSTOM_TAG = /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/

/** The kit's own repos that are never packs, by name less `spell-`:  `spell-ui` ... */
const NOT_PACKS = ["kit", "lang", "ui", "app"]

/**
 * What a template's `__token__`s become.
 * - pack:  `pack` (`cards`), `packCamel` (`cards`;  `my-pack` => `myPack`), `prefix` (`cards-`), `solid` (Solid's
 *   pinned version, from the kit's `package.json` `resolutions`)
 * - element:  `tag` (`epic-page`), `Class` (`EpicPage`:  the component, and every file's name), `vocab` (`epicPage`,
 *   as in `epicPageVocabulary`), `noun` (`page`:  the tag less the prefix), `nounCamel`
 */
export type PackTokens = Record<string, string>

/** The tokens of pack `pack` in kit `root`. */
function packTokens(root: string, pack: PackInfo): PackTokens {
  return { pack: pack.name, packCamel: camelCase(pack.name), prefix: pack.prefix, solid: solidVersion(root) }
}

/** The tokens of element `tag` in pack `pack`. */
function elementTokens(root: string, pack: PackInfo, tag: string): PackTokens {
  const noun = tag.slice(pack.prefix.length)
  return {
    ...packTokens(root, pack),
    tag,
    Class: pascalCase(tag),
    vocab: camelCase(tag.replace(/^ui-/, "")),
    noun,
    nounCamel: camelCase(noun)
  }
}

/** `text` with each `__token__` of `tokens` filled in;  any other `__word__` stays. */
function fillTokens(text: string, tokens: PackTokens): string {
  const names = Object.keys(tokens).sort((a, b) => b.length - a.length)
  return text.replace(new RegExp(`__(${names.join("|")})__`, "g"), (_, name: string) => tokens[name]!)
}

/**
 * Write every template under `from` into `to`, `.template` dropped and tokens filled in (in paths too;
 * `DOT_NAMES` get their dot), skipping files already there.
 */
function writeTemplates(root: string, from: string, to: string, tokens: PackTokens, report: PackScaffoldReport) {
  for (const template of templateFiles(from)) {
    const path = relative(from, template).slice(0, -TEMPLATE_SUFFIX.length)
    const dotted = fillTokens(path, tokens)
      .split("/")
      .map((part) => (DOT_NAMES.includes(part) ? `.${part}` : part))
      .join("/")
    const target = join(to, dotted)
    if (existsSync(target)) {
      report.skipped.push(relative(root, target))
      continue
    }
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, fillTokens(readFileSync(template, "utf8"), tokens))
    report.created.push(relative(root, target))
  }
}

/** Every template file under `dir`, recursively, sorted;  minus `NOT_COPIED`. */
function templateFiles(dir: string): string[] {
  const files: string[] = []
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) files.push(...templateFiles(path))
    else if (name.endsWith(TEMPLATE_SUFFIX) && !NOT_COPIED.includes(name)) files.push(path)
  }
  return files
}

/** Template `path`'s text, relative to `templates/pack/`. */
function readTemplate(path: string): string {
  return readFileSync(join(TEMPLATES, path), "utf8")
}

/**
 * Write `file` from the `template` JSON;  when it's there already, add only the keys it lacks --
 * top-level, and inside `scripts`, `devDependencies` and `spellPack` -- keeping its own values.
 */
function mergePackageJson(root: string, file: string, template: string, report: PackScaffoldReport) {
  const wanted = JSON.parse(template) as Record<string, unknown>
  const path = relative(root, file)
  if (!existsSync(file)) {
    writeFileSync(file, `${JSON.stringify(wanted, null, 2)}\n`)
    report.created.push(path)
    return
  }
  const json = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>
  const added: string[] = []
  for (const [key, value] of Object.entries(wanted)) {
    if (!(key in json)) {
      json[key] = value
      added.push(key)
    } else if (MERGED_KEYS.includes(key) && isObject(value) && isObject(json[key])) {
      const own = json[key] as Record<string, unknown>
      for (const [inner, innerValue] of Object.entries(value)) {
        if (inner in own) continue
        own[inner] = innerValue
        added.push(`${key}.${inner}`)
      }
    }
  }
  if (!added.length) return void report.skipped.push(path)
  writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`)
  report.updated.push(`${path} (${added.join(", ")})`)
}

/** `package.json` keys whose own keys `mergePackageJson()` adds one by one. */
const MERGED_KEYS = ["scripts", "devDependencies", "spellPack"]

/**
 * The pack repo's `.yarnrc.yml`, at `dir`:  the kit's (`root`'s), without `yarnPath`, as every folder's is (the
 * kit's AGENTS.md, "The kit").  Skipped when it's there, or the kit has none.
 */
function writeYarnrc(root: string, dir: string, report: PackScaffoldReport) {
  const kit = join(root, ".yarnrc.yml")
  const file = join(dir, ".yarnrc.yml")
  if (existsSync(file)) return void report.skipped.push(relative(root, file))
  if (!existsSync(kit)) return void report.skipped.push(`${relative(root, file)} (not found:  the kit's .yarnrc.yml)`)
  const settings = readFileSync(kit, "utf8").replace(/^yarnPath:.*\n/m, "")
  writeFileSync(file, `${YARNRC_HEADER}${settings}`)
  report.created.push(relative(root, file))
}

/** The top of a pack repo's `.yarnrc.yml`:  why it's a copy. */
const YARNRC_HEADER = `# A copy of the kit's:  the same settings and the one catalog of tool versions.
# - No \`yarnPath\`:  the yarn release lives once, in the kit, whose install covers this repo.
# - Keep the catalog in step with the kit's:  bump them together (vite-plus and every \`catalog:\` entry).
`

/** Solid's version, pinned in kit `root`'s `package.json` `resolutions`. */
function solidVersion(root: string): string {
  const file = join(root, "package.json")
  const json = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as KitPackageJson) : {}
  return json.resolutions?.["solid-js"] ?? "*"
}

////////////////
// ## The commands page
////////////////

/**
 * Add pack `pack`'s yarn scripts to the commands page (the shared content folder's `commands.json5`, through
 * `contentFolderOf()`):  `report.updated`, else `skipped`.
 * - a data file (`DataFile`, epic `epic-workflow` P21):  its old `commands.json` read while there's no `.json5`,
 *   and written as the `.json5`, its comments kept
 * - Its rows name each repo by its package (`spell-brand ts`):  the new pack's go beside spell-brand's
 *   (`commandsWithPack()`).
 */
export function wirePack(root: string, pack: PackInfo, report: PackScaffoldReport) {
  const content = contentFolderOf(root) ?? root
  const file = join(content, COMMANDS_JSON)
  const what = `spell-${pack.name}'s yarn scripts`
  const found = DataFile.found(file)
  if (!found) return void report.skipped.push(`${COMMANDS_JSON} (not found:  ${what})`)
  const text = readFileSync(found, "utf8")
  const next = commandsWithPack(text, `spell-${pack.name}`)
  if (next === undefined || next === text) return void report.skipped.push(`${COMMANDS_JSON} (${what}:  there already)`)
  writeFileSync(file, next)
  DataFile.removeOld(file)
  formatJson(file)
  report.updated.push(`${COMMANDS_JSON} (${what})`)
}

/**
 * The commands page's JSON with package `name`'s yarn scripts in its rows, or `undefined` when they're there:
 * - `review`, `ts`, `lint`, `lint:fix`, `format`, `test`:  beside `spell-brand`'s, in every row naming it
 * - `pack:build`, `pack:check`:  in the rows `pack-build` / `pack-check`
 */
function commandsWithPack(text: string, name: string): string | undefined {
  const data = DataFile.parse<CommandsJson>(text)
  let added = 0
  for (const family of data.families ?? []) {
    for (const row of family.rows ?? []) {
      const yarn = row.yarn
      if (!yarn?.names) continue
      const names = [yarn.names].flat()
      for (const script of CHECK_SCRIPTS) {
        const anchor = names.indexOf(`${BESIDE} ${script}`)
        if (anchor < 0 || names.includes(`${name} ${script}`)) continue
        names.splice(anchor + 1, 0, `${name} ${script}`)
        added++
      }
      const own = row.id ? PACK_ROWS[row.id] : undefined
      if (own && !names.includes(`${name} ${own}`)) {
        names.push(`${name} ${own}`)
        added++
      }
      yarn.names = names
    }
  }
  return added ? DataFile.textFor(text, data) : undefined
}

/** The pack whose rows a new pack's scripts go beside:  every pack repo has the same scripts. */
const BESIDE = "spell-brand"

/** A pack's check scripts, as every repo has them:  listed on the commands page beside spell-brand's. */
const CHECK_SCRIPTS = ["review", "ts", "lint", "lint:fix", "format", "test"]

/** The commands page's own pack rows, by `id`:  the pack script each lists. */
const PACK_ROWS: Record<string, string> = { "pack-build": "pack:build", "pack-check": "pack:check" }

/**
 * Format the JSON5 `file` as the commands page's is:  oxfmt's defaults (run from the temp folder, so no checkout's
 * config), but in the JSON-compatible part of JSON5 (epic `epic-workflow` P21):  its keys kept in quotes
 * (`quoteProps: preserve`, as the repo formats every `.json5`), no trailing commas.
 * - NEVER throws:  without oxfmt the file stays as `DataFile.textFor()` wrote it.
 */
function formatJson(file: string) {
  for (let dir = dirname(TEMPLATES); ; dir = dirname(dir)) {
    const oxfmt = join(dir, "node_modules", "oxfmt", "bin", "oxfmt")
    if (existsSync(oxfmt)) {
      const config = join(tmpdir(), "spell-json5.oxfmtrc.json")
      writeFileSync(config, JSON.stringify({ quoteProps: "preserve", trailingComma: "none" }))
      return void spawnSync(oxfmt, ["-c", config, file], { cwd: tmpdir(), stdio: "ignore" })
    }
    if (dirname(dir) === dir) return
  }
}

////////////////
// ## Names
////////////////

/** `kebab-case` => `camelCase`:  `my-pack` => `myPack`. */
function camelCase(text: string): string {
  return text.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())
}

/** A tag => its class name:  `epic-page` => `EpicPage`, `ui-brand-blob` => `UIBrandBlob`. */
function pascalCase(tag: string): string {
  return tag
    .split("-")
    .map((word) => (word === "ui" ? "UI" : word.charAt(0).toUpperCase() + word.slice(1)))
    .join("")
}

/** `value` is a plain object. */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** The part of the kit's `package.json` read here. */
type KitPackageJson = { resolutions?: Record<string, string> }

/** The parts of the commands page's JSON edited here;  its full shape:  spell-epic's `src/tools/_assets/commands.js`. */
type CommandsJson = { families?: { rows?: { id?: string; yarn?: { names?: string | string[] } }[] }[] }
