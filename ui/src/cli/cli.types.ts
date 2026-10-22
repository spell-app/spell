/**
 * Types for Spell UI's `spell` commands (`src/cli/commands.ts`):  `spell icon`, `spell ssr`, `spell pack`, `spell design`.
 * - Types only, plus constants:  `commands.ts` loads it, and `spell help` loads every repo's list.
 */
import type { CLI } from "spell-kit/cli"
import type {
  StaticCoverage,
  StaticDocumentOptions,
  StaticDocumentResult,
  StaticStylesheetResult
} from "spell-ui/tools/tools.types"

////////////////
// ## `spell icon`
////////////////

/**
 * `spell icon` flags.
 * - `pack`:  only this pack, e.g. `fa7-brands`
 * - `json`:  print the icons found as JSON
 * - `open`:  show them in a browser, as pictures
 */
export type IconsOptions = CLI.GlobalOptions & {
  pack?: string
  json?: boolean
  open?: boolean
}

////////////////
// ## `spell ssr`
////////////////

/**
 * `spell ssr` flags.
 * - `output`:  `-o`:  the page to write, for one input;  a FOLDER to write into, for several
 * - `inlineCss`:  the stylesheet in a `<style>` in the page, rather than a file beside it
 * - `css`:  ONE stylesheet for every page, written here, rather than one per folder
 * - `minify`:  `false` (`--no-minify`) leaves the stylesheet readable
 */
export type SsrOptions = CLI.GlobalOptions & {
  output?: string
  inlineCss?: boolean
  css?: string
  minify?: boolean
}

/**
 * One shared stylesheet of a `spell ssr` job:
 * where it goes, the pages that link it (indices in the job),
 * and what the sheet already there covered (its first line), for the build to keep.
 */
export type StaticSheetJob = {
  path: string
  pages: number[]
  coverage?: StaticCoverage
}

/**
 * What `spell ssr` and its child process, `runner/renderStatic.ts`, say to each other over IPC, in order:
 * - `ready`:  child to parent, once its Vite server is up
 * - `job`:  parent to child, once:  each page's HTML and stylesheet options,
 *   and the shared stylesheets (`sheets`) to build afterwards, `minify`d or not
 * - `page`:  child to parent, one per page in `job` order (`index`):  its `result`, or the `error` that stopped it
 * - `stylesheet`:  child to parent, after the pages, one per `sheets` entry (`path`)
 * - `done`, or `failed` with the error that stopped the whole job
 */
export type StaticMessage =
  | { kind: "ready" }
  | {
      kind: "job"
      pages: { html: string; options: StaticDocumentOptions }[]
      sheets: StaticSheetJob[]
      minify: boolean
    }
  | { kind: "page"; index: number; result?: StaticDocumentResult; error?: string }
  | { kind: "stylesheet"; path: string; result: StaticStylesheetResult }
  | { kind: "done" }
  | { kind: "failed"; error: string }

////////////////
// ## `spell pack`
////////////////

/**
 * `spell pack` flags.
 * - `prefix`:  `create`:  every tag's prefix, e.g. `epic-`;  default the pack's own, else `<name>-`
 * - `build`:  `create`, `add`:  build the pack after writing the files;  `--no-build` sets it `false`
 * - `json`:  print the report as JSON
 */
export type PackOptions = CLI.GlobalOptions & {
  prefix?: string
  build?: boolean
  json?: boolean
}

/**
 * The component pack `spell pack create` / `add` writes into:  a repo of its own, `<kit>/spell-<name>/`, which may not
 * be a pack yet.
 * - `prefix`:  every tag's, e.g. `epic-`;  `dir`:  the pack's folder, absolute:  the folder of its `components/`
 * - A pack that's there is the kit's `ComponentPack` (`readPack()`), which has these too.
 */
export type PackInfo = { name: string; prefix: string; dir: string }

/**
 * What `spell pack create` / `add` did, paths relative to the kit.
 * - `created`:  files written;  `skipped`:  files already there, left as they were
 * - `updated`:  files it added to, with what in parens:  a barrel's export, `package.json`'s keys ...
 * - `built`:  the pack's build, when it ran (`--no-build` skips it)
 */
export type PackScaffoldReport = {
  pack: string
  created: string[]
  updated: string[]
  skipped: string[]
  built?: PackBuildReport
}

/**
 * `spell pack build`'s answer.
 * - `files`:  what it wrote, relative to the kit;  `tags`:  the catalog's;  `hash`:  the sources'
 */
export type PackBuildReport = { pack: string; files: string[]; tags: string[]; hash: string }

/**
 * `spell pack check`'s answer for one pack.
 * - `hash`:  the sources' now;  `stale`:  each generated file that's out of date, and why (none:  current)
 */
export type PackCheckReport = { pack: string; hash: string; stale: string[] }

/**
 * The commands page's data, in the shared content folder (`spell pack create` adds a new pack's scripts to it):
 * the kit's `CLI.COMMANDS_JSON`.
 */
export const COMMANDS_JSON = "guides/dev/commands/commands.json5"
