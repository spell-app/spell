import { styleText } from "node:util"

import { CLI } from "spell/cli"
import { SRV } from "spell/server"
import { SITE_ADDRESS, ensurePageServer } from "spell/ui/tools/pageServer"

import type { IconsOptions } from "./cli.types"
import { type IconInfo, loadIcons, searchIcons } from "./iconSearch"

/** Most icons listed as text:  the rest are counted.  `--json` and `--open` show them all. */
const MAX_LISTED = 60

/**
 * `spell icon [query...]`:  find `spell-ui` icons by name, alias or keyword -- see `iconSearch.ts`.
 * - Was `spell icons`, spell-app's, until epic `repo-split` P13.
 * - A line each:  its name, its pack, and what else it's called.
 * - `--pack <id>`:  only that pack, e.g. `fa7-brands`.
 * - `--json`:  the icons found, as JSON.
 * - `--open`:  show them as pictures, in a browser:  the docs' icon browser (`docs/icons.html`) on the page server,
 *   at the query, on `--pack` (else the best match's pack) -- `openIconsPage()`.
 * - Returns the exit code:  `EXIT.ERRORS` if nothing matched.
 */
export async function iconCommand(words: string[], options: IconsOptions = {}): Promise<number> {
  const query = words.join(" ")
  let icons: IconInfo[]
  try {
    icons = await loadIcons(options.pack ? [options.pack] : undefined)
  } catch (error) {
    throw new CLI.CliError(error instanceof Error ? error.message : String(error))
  }
  const found = searchIcons(icons, query)

  if (options.open) return openIconsPage(query, options.pack ?? found[0]?.pack)
  if (options.json) {
    CLI.out(JSON.stringify(found, null, 2))
  } else {
    const shown = found.slice(0, MAX_LISTED)
    const width = Math.max(0, ...shown.map((icon) => icon.name.length))
    for (const icon of shown) {
      const also = icon.aliases.length ? dim(`  also ${icon.aliases.join(", ")}`) : ""
      CLI.out(`${icon.name.padEnd(width)}  ${dim(icon.pack)}${also}`)
    }
    if (found.length > MAX_LISTED)
      CLI.err(dim(`...and ${found.length - MAX_LISTED} more -- --open shows all`, process.stderr))
  }
  if (found.length) return CLI.EXIT.OK
  CLI.err(`No icons match '${query}'`)
  return CLI.EXIT.ERRORS
}

/**
 * Open the docs' icon browser at `query`, on `pack`, in a browser:  `/components/ui/icons.html?q=<query>&pack=<pack>`
 * on the kit's page server, which this starts if it isn't running (`ensurePageServer()`).
 * - The ONE icon browser, searching as this command does (`IconName.search()`):  the command keeps no page of its own.
 * - Prints the address;  returns the exit code.
 * - throws `CLI.CliError` when the page server won't start
 */
async function openIconsPage(query: string, pack: string | undefined): Promise<number> {
  let base: string
  try {
    base = ensurePageServer()
  } catch (error) {
    throw new CLI.CliError(`spell icon --open:  the page server won't start (\`spell server start\`):  ${error}`)
  }
  const url = new URL(`${base}${SITE_ADDRESS}/icons.html`)
  if (query) url.searchParams.set("q", query)
  if (pack) url.searchParams.set("pack", pack)
  CLI.out(url.href)
  SRV.openBrowser(url.href)
  return CLI.EXIT.OK
}

/** `text` dimmed, when `stream` shows colour (node's `styleText()`:  no colour into a pipe, or with `NO_COLOR`). */
function dim(text: string, stream: NodeJS.WriteStream = process.stdout): string {
  return styleText("dim", text, { stream })
}
