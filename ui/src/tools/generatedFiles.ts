/**
 * What Spell UI's generators share beside the kit's `writeOrCheck()` and `spliceGenerated()`
 * (`spell/element-tools/generatedFiles`, every repo's, since epic `coherence` P11):
 * format what they wrote as `yarn format` would, and a page's status words.
 * - Escaping the text they write into markup:  the kit's `escapeHTML()` (`spell/util/string`).
 * - Used by `site:index`, `site:kitchen`, `site:new`, `readme:components`, `gen:root`, `gen:styles`, `tokens:alias`.
 * - Node only:  imported by `scripts/`, never by `src/`.
 */
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

////////////////
// ## Files
////////////////

/**
 * Format `files` as `yarn format` does (`vp fmt`, with the repo's `vite.lint.ts` settings), so it changes nothing in
 * them afterwards.
 * - NOT the bare `oxfmt` binary:  it doesn't read `vite.lint.ts`, so it writes oxfmt's defaults (semicolons,
 *   trailing commas).
 * - SIDE EFFECT:  rewrites `files`
 */
export function formatFiles(files: string[]): void {
  execFileSync("yarn", ["vp", "fmt", ...files], { cwd: PACKAGE_ROOT, stdio: "ignore" })
}

/** Spell UI's root:  where `vp fmt` runs. */
const PACKAGE_ROOT = fileURLToPath(new URL("../../", import.meta.url))

////////////////
// ## Markup
////////////////

/** A family's `status` (`docs/__data/pages.json5`) as its label's words;  `done` shows none. */
export const STATUS_TEXT: Readonly<Record<string, string>> = { planned: "Planned", "in-progress": "In progress" }

/** `text` without markdown code ticks:  a card or a summary line shows plain text. */
export function withoutTicks(text: string): string {
  return text.replaceAll("`", "")
}
