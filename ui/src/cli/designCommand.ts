import { existsSync } from "node:fs"
import { join } from "node:path"

import { contentFolderOf } from "spell-kit/server/contentFolder"
import { CLI } from "spell-kit/cli"

/**
 * `spell design <verb> ...`:  Spell's claude.ai design system (epic `claude-design`), the nearest kit's tools, their
 * arguments verbatim.  Claude's `/design` skill does the claude.ai half (publish, read) with its Artifact tool.
 * - `build [--out <dir>]`:  Spell UI's `yarn design:build` (`scripts/design-build.ts`), which writes the system's
 *   files to `<dir>/project/` (default `build/design-system/`);  with the kit's brand (`designBuildArgs()`), which
 *   Spell UI never finds by itself
 * - `bundle [--out <dir>] [--skip-ui-build]`:  spell-brand's `yarn design:bundle`, the system's `bundle.js`
 * - `check [bundle] [outDir]`:  spell-brand's `yarn design:check`, the bundle proved inlined and on a Design board
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
  if (verb === "bundle" || verb === "check") return CLI.runTool(DESIGN_TOOLS[verb], args, { INIT_CWD: process.cwd() })
  if (!SYNC_VERBS.includes(verb)) throw new CLI.CliError(`unknown verb '${verb}':  ${DESIGN_VERBS.join(", ")}`)
  return CLI.runTool(DESIGN_TOOLS.sync, [verb, ...args])
}

/**
 * The tools `spell design` runs, from the kit's root (`CLI.runTool()` finds the nearest kit that has each):
 * - `build`:  Spell UI's `design:build`, under `tsx`, in the caller's folder (so `--out` is relative to it)
 * - `bundle` / `check`:  spell-brand's `design:bundle` / `design:check` (epic `repo-split` P10, Q32), under `tsx`
 * - `sync`:  spell-epic's `src/tools/design.js`, its verb first (`pull`, `changed` ...)
 */
export const DESIGN_TOOLS = {
  build: { tool: "spell-ui/scripts/design-build.ts", tsx: "spell-ui/scripts/tsconfig.json" },
  bundle: { tool: "spell-brand/scripts/design-bundle.ts", tsx: "spell-brand/tsconfig.json" },
  check: { tool: "spell-brand/scripts/design-check.ts", tsx: "spell-brand/tsconfig.json" },
  sync: { tool: "spell-epic/src/tools/design.js" }
} satisfies Record<string, CLI.ToolSpec>

/** `design`'s verbs (epic `claude-design`), in the order help lists them. */
export const DESIGN_VERBS = ["build", "bundle", "check", "pull", "changed", "pushed", "state"]

/** The verbs spell-epic's design tool runs:  the local half of `/design`. */
const SYNC_VERBS = ["pull", "changed", "pushed", "state"]

/**
 * What `design build` tells Spell UI's design export about the brand (epic `repo-split` P5), in kit `root`:
 * - `--brand`:  spell-brand, its `<brand-*>` cards
 * - `--brand-book`:  Claude Design's brand book, `brand/spell-design-system/readme.md` in the shared content
 *   (`contentFolderOf()`), when it's there
 * - Before the caller's own arguments, so an explicit `--brand` wins (the last one does).
 */
export function designBuildArgs(root: string): string[] {
  const book = join(contentFolderOf(root) ?? root, BRAND_BOOK)
  return ["--brand", join(root, "spell-brand"), ...(existsSync(book) ? ["--brand-book", book] : [])]
}

/** The brand book (Claude Design's export), in the shared content folder (epic `claude-design`, P11). */
const BRAND_BOOK = "brand/spell-design-system/readme.md"
