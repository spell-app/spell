/**
 * Types and constants for `spell publish` (`spell/cli/publish`):  what a repo says about its published package, and
 * what each step reports.
 * - NEVER names a folder:  each one says how it publishes in its own `package.json` (`"spellPublish"`), and the
 *   kit publishes every installed repo that has one, lowest first (`repos.json5`).
 */

////////////////
// ## What a repo says
////////////////

/**
 * The `"spellPublish"` entry of a repo's `package.json`:  how its npm package is made from its checkout.
 * - Its presence is what makes a repo publish:  a repo without one (spell-brand) never does.
 * - Every glob is from the repo's `src/`;  `files` are from its root.
 * - `exclude`:  source files left out of the package (`tools/**`:  the repo's own tooling)
 * - `verbatim`:  files shipped exactly as they are, never compiled (`icons/icon-packs/**`:  data the runtime fetches)
 * - `reactJsx`:  files whose JSX is React's (Ink's terminal screens), not Solid's
 * - `files`:  what ships beside `dist/`, from the repo's root (`templates`, `repos.json5`)
 * - `exports`:  more names the package answers, each to the module under `src/` it means, `*` allowed
 *   (Spell UI's short names, `"./ui-*": "components/ui-*\/index"`, for outside the repos)
 * - `bin`:  each command the package puts on the `PATH`, by the module under `src/` it runs (`cli/main`):
 *   its published bin imports that module's build, which runs when imported
 * - `sideEffects`:  more files under `src/` the PUBLISHED package lists as side effects, beyond the checkout's own
 *   list (`core.ts`:  Spell UI's settings install as it loads, so one family alone, `spell/ui/ui-button`, works
 *   in a bundle;  the checkout leaves it out, as it re-chunks the app's build)
 */
export type PublishSettings = {
  exclude?: string[]
  verbatim?: string[]
  reactJsx?: string[]
  files?: string[]
  exports?: Record<string, string>
  bin?: Record<string, string>
  sideEffects?: string[]
}

/**
 * A repo that publishes, as `publishedRepos()` finds it.
 * - `name`:  its package's name, which its own files import it by (`spell/ui/core`)
 * - `root`:  its folder, absolute
 * - `manifest`:  its `package.json`, as it is in the checkout
 * - `settings`:  its `"spellPublish"`
 */
export type PublishedRepo = {
  name: string
  root: string
  manifest: SourceManifest
  settings: PublishSettings
}

/** The parts of a checkout's `package.json` the publish reads;  the rest is passed on or dropped by name. */
export type SourceManifest = Record<string, unknown> & {
  name: string
  version: string
  exports?: Record<string, unknown>
  dependencies?: Record<string, string>
  spellPublish?: PublishSettings
  spellTypes?: string[]
}

////////////////
// ## What each step reports
////////////////

/**
 * What `PackageBuild.build()` wrote into a package's `dist/`.
 * - `compiled`:  source files built to JavaScript, one each
 * - `modules`:  CSS, raw text and JSON a file imports, each made a JavaScript module (`UIButton.css.inline.js`)
 * - `copied`:  other files shipped as they are (data, Python, icon packs, hand-written `.d.ts`)
 * - `declarations`:  `.d.ts` files, from the repo's `spell-types` build
 * - `warnings`:  imports it couldn't place, each with its file
 */
export type BuildReport = {
  compiled: number
  modules: number
  copied: number
  declarations: number
  warnings: string[]
}

/**
 * One packed package, from `npm pack --json`.
 * - `tgz`:  the packed file, absolute
 * - `size` / `unpackedSize`:  bytes
 * - `files`:  every file in it, from the package's root
 */
export type PackedPackage = {
  name: string
  version: string
  tgz: string
  size: number
  unpackedSize: number
  files: string[]
}

/**
 * One check the publish ran, passed or failed.
 * - `pkg`:  the package it's about;  none:  all of them (the scratch install)
 */
export type PublishCheck = {
  pkg?: string
  check: string
  ok: boolean
  detail?: string
}

////////////////
// ## Constants
////////////////

/** Where the packed files go, at the kit's root (git-ignored):  `<name>-<version>.tgz`, and each one's staging folder. */
export const PACKS_FOLDER = "dist-packs"

/** The staging folders, inside `PACKS_FOLDER`:  `stage/<name>/` is exactly what `npm pack` packs. */
export const STAGE_FOLDER = "stage"

/** Where each package's built files go, in its staging folder;  its `exports` point here. */
export const DIST = "dist"

/** Fields of a checkout's `package.json` the published one keeps (the rest:  dropped, or written by the publish). */
export const KEPT_FIELDS = [
  "name",
  "description",
  "license",
  "repository",
  "homepage",
  "bugs",
  "author",
  "keywords",
  "type",
  "engines",
  "peerDependencies",
  "peerDependenciesMeta",
  "optionalDependencies"
] as const

/** Files at a repo's root every package ships when they're there. */
export const DOC_FILES = /^(README(-[\w-]+)?\.md|LICENSE(\.md|\.txt)?|CHANGELOG\.md)$/

/** Source files of every repo never shipped:  the agents' notes, tests, git's own files. */
export const ALWAYS_EXCLUDED = [
  "**/AGENTS.md",
  "**/CLAUDE.md",
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/.gitignore",
  "**/.gitattributes",
  "**/graphify-out/**"
]
