import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { contentFolderOf } from "spell/server/contentFolder"
import { peerRepos } from "spell/server/page/settings"
import { CLI } from "spell/cli"

/**
 * `spell design <verb> ...`:  Spell's claude.ai design system (epic `claude-design`), the nearest kit's tools, their
 * arguments verbatim.  Claude's `/design` skill does the claude.ai half (publish, read) with its Artifact tool.
 * - `build [--out <dir>]`:  Spell UI's `yarn design:build` (`scripts/design-build.ts`), which writes the system's
 *   files to `<dir>/project/` (default `build/design-system/`);  with the kit's brand (`designBuildArgs()`), which
 *   Spell UI never finds by itself
 * - `bundle [--out <dir>] [--skip-ui-build]`:  spell-brand's `yarn design:bundle`, the system's `bundle.js`
 * - `check [bundle] [outDir]`:  spell-brand's `yarn design:check`, the bundle proved inlined and on a Design board
 *   - both run in spell-brand's own folder, with its own install:  a project beside the kit (epic `repo-split` P20),
 *     found as the kit's peer (`brandFolder()`)
 * - `pull <board.dc.html> <page.html>`, `changed`, `pushed`, `state`:  spell-epic's `src/tools/design.js`, the local
 *   half of `/design` (`epic` has no verb for them yet)
 * - Runs in the current folder:  a relative path is relative to it (`bundle` / `check` are told it, `INIT_CWD`, as
 *   `yarn` tells a script).
 * - Was `spell dev design`, spell-app's, until epic `repo-split` P13.
 * - Throws `CliError` for another verb.
 * - Resolves to the tool's exit code.
 */
export function designCommand(verb: string, args: string[]): Promise<number> {
  if (verb === "build")
    return CLI.runTool(DESIGN_TOOLS.build, [...designBuildArgs(CLI.findCheckout(DESIGN_TOOLS.build.tool)), ...args])
  if (verb === "bundle" || verb === "check") {
    const brand = brandFolder(CLI.findCheckout(CLI.KIT_MARKER))
    if (!brand) throw new CLI.CliError(`spell design ${verb} runs spell-brand's script:  no spell-brand beside the kit`)
    return CLI.runChild("yarn", [`design:${verb}`, ...args], {
      cwd: brand,
      env: { ...process.env, INIT_CWD: process.cwd() }
    })
  }
  if (!SYNC_VERBS.includes(verb)) throw new CLI.CliError(`unknown verb '${verb}':  ${DESIGN_VERBS.join(", ")}`)
  return CLI.runTool(DESIGN_TOOLS.sync, [verb, ...args])
}

/**
 * The tools `spell design` runs, from the kit's root (`CLI.runTool()` finds the nearest kit that has each):
 * - `build`:  Spell UI's `design:build`, under `tsx`, in the caller's folder (so `--out` is relative to it)
 * - `sync`:  spell-epic's `src/tools/design.js`, its verb first (`pull`, `changed` ...)
 * - Not `bundle` / `check`:  spell-brand's own scripts, run in its own folder (`designCommand()`)
 */
export const DESIGN_TOOLS = {
  build: { tool: "ui/scripts/design-build.ts", tsx: "ui/tsconfig.node.json" },
  sync: { tool: "epic/src/tools/design.js" }
} satisfies Record<string, CLI.ToolSpec>

/** `design`'s verbs (epic `claude-design`), in the order help lists them. */
export const DESIGN_VERBS = ["build", "bundle", "check", "pull", "changed", "pushed", "state"]

/** The verbs spell-epic's design tool runs:  the local half of `/design`. */
const SYNC_VERBS = ["pull", "changed", "pushed", "state"]

/**
 * What `design build` tells Spell UI's design export about the brand (epic `repo-split` P5), in kit `root`:
 * - `--brand`:  spell-brand, its `<brand-*>` cards
 * - `--brand-book`:  Claude Design's brand book, `brand/spell-design-system/readme.md` in the epic repo
 *   (`contentFolderOf()`), when it's there
 * - Before the caller's own arguments, so an explicit `--brand` wins (the last one does).
 */
export function designBuildArgs(root: string): string[] {
  const book = join(contentFolderOf(root) ?? root, BRAND_BOOK)
  const brand = brandFolder(root)
  return [...(brand ? ["--brand", brand] : []), ...(existsSync(book) ? ["--brand-book", book] : [])]
}

/**
 * spell-brand's folder, beside kit `root`:  the kit's peer by that package name (`repos.json5`, `peerRepos()`;  main's
 * `~/www/spell-brand` from a kit worktree);  `undefined` when it isn't there.
 */
export function brandFolder(root: string): string | undefined {
  return peerRepos(root).find((dir) => {
    try {
      return (JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { name?: string }).name === "spell-brand"
    } catch {
      return false
    }
  })
}

/** The brand book (Claude Design's export), in the epic folder (epic `claude-design`, P11). */
const BRAND_BOOK = "brand/spell-design-system/readme.md"
