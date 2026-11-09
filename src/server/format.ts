/**
 * Formatting a page's text in memory, as `vp fmt` would format its file:  no `yarn vp fmt` per write (about 0.5s
 * each), and a page written once, already tidy.
 * - Imports oxfmt and the toolchain's format settings (`spell/toolchain/lint`), nothing else of another package.
 *   - oxfmt itself, not `vite-plus/fmt` (which only re-exports it):  an npm install of `spell` has no Vite+
 *     (epic `epic-engine` P66).  At the version `vite-plus` pins (`"pinnedBy"`), so the output is `vp fmt`'s.
 * - From the docs tools' `plan-parts.js` (epic `epic-components`, P7;  spell-epic's `src/tools/` now).
 */
import { basename } from "node:path"

// The format settings every package shares
import { fmtConfig } from "spell/toolchain/lint"

/** oxfmt's settings, as `vp fmt` reads them from the toolchain's (`spell/toolchain/lint`), minus what only the CLI uses. */
const FORMAT = Object.fromEntries(
  Object.entries(fmtConfig).filter(([key]) => !["ignorePatterns", "sortPackageJson"].includes(key))
)

/**
 * `html` formatted as `vp fmt` would format the file at `file`, in this process.
 * - `file`'s extension picks the parser (`.html`, an epic page's `.htm` part ...);  it's never read
 * - throws on a parse error, naming the file
 */
export async function formatHTML(file: string, html: string): Promise<string> {
  // loaded here, not at the top:  the server's barrel carries this file, and every server needn't load oxfmt
  const { format } = await import("oxfmt")
  const { code, errors } = await format(basename(file), html, FORMAT)
  if (errors.length) throw new Error(`${basename(file)}:  ${errors.map((error) => error.message).join(";  ")}`)
  return code
}
