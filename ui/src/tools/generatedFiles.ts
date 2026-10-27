/**
 * What Spell UI's generators share beside the kit's `writeOrCheck()` and `spliceGenerated()`
 * (`spell/element-tools/generatedFiles`, every repo's, since epic `coherence` P11):
 * what they write formatted as `yarn format` would, and a page's status words.
 * - Escaping the text they write into markup:  the kit's `escapeHTML()` (`spell/util/string`).
 * - Used by `site:index`, `site:kitchen`, `site:new`, `readme:components`, `gen:root`, `gen:styles`, `tokens:alias`.
 * - Node only:  imported by `scripts/`, never by `src/`.
 */
import type { GeneratedOutput } from "spell/element-tools/generatedFiles"
import { SRV } from "spell/server"

////////////////
// ## Files
////////////////

/**
 * `outputs`, each formatted as `yarn format` formats its file, in memory (`SRV.formatHTML()`:  the file's extension
 * picks the parser, `.ts`, `.css` or `.json` as well as `.html`).
 * - So `writeOrCheck()` compares formatted text:  a file that didn't change is left alone, and `--check` works.
 * - Instead of `yarn vp fmt` run on the files afterwards, about half a second each time (epic `coherence` P23).
 * - NOT for Markdown:  `yarn format` leaves every `*.md` file as it is (the toolchain's format settings), so a
 *   README is written as generated.
 * - throws on a parse error, naming the file
 */
export async function formatted(outputs: readonly GeneratedOutput[]): Promise<GeneratedOutput[]> {
  return Promise.all(
    outputs.map(async ([file, text]): Promise<GeneratedOutput> => [file, await SRV.formatHTML(file, text)])
  )
}

////////////////
// ## Markup
////////////////

/** A family's `status` (`docs/__data/pages.json5`) as its label's words;  `done` shows none. */
export const STATUS_TEXT: Readonly<Record<string, string>> = { planned: "Planned", "in-progress": "In progress" }

/** `text` without markdown code ticks:  a card or a summary line shows plain text. */
export function withoutTicks(text: string): string {
  return text.replaceAll("`", "")
}
