import { styleText } from "node:util"

import { CLI } from "spell-kit/cli"
import { SRV } from "spell-kit/server"

import type { IconsOptions } from "./cli.types"
import { type IconInfo, loadIcons, searchIcons } from "./iconSearch"
import { serve } from "./serve"

/** Most icons listed as text:  the rest are counted.  `--json` and `--open` show them all. */
const MAX_LISTED = 60

/**
 * `spell icon [query...]`:  find `spell-ui` icons by name, alias or keyword -- see `iconSearch.ts`.
 * - Was `spell icons`, spell-app's, until epic `repo-split` P13.
 * - A line each:  its name, its pack, and what else it's called.
 * - `--pack <id>`:  only that pack, e.g. `fa7-brands`.
 * - `--json`:  the icons found, as JSON.
 * - `--open`:  show them as pictures, in a browser -- a page served locally, until `Ctrl-C`.  See `serve.ts`.
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

  if (options.open) return showGallery(found, query)
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

/** Serve a gallery of `icons` and open it in a browser, until `Ctrl-C`.  Returns the exit code. */
async function showGallery(icons: IconInfo[], query: string): Promise<number> {
  const { url, server } = await serve((path) => {
    if (path === "/") return { text: galleryPage(icons, query), type: "text/html; charset=utf-8" }
    const svg = /^\/svg\/(\d+)\.svg$/.exec(path)
    const icon = svg && icons[Number(svg[1])]
    return icon ? { file: icon.svg } : undefined
  })
  CLI.out(url)
  CLI.err(`Showing ${icons.length} icon${icons.length === 1 ? "" : "s"} at ${url} -- Ctrl-C to stop`)
  SRV.openBrowser(url)
  await SRV.untilInterrupted(server)
  return CLI.EXIT.OK
}

/** The gallery page:  a filter box, then each icon -- its picture, name and pack -- by `/svg/<index>.svg`. */
export function galleryPage(icons: IconInfo[], query: string): string {
  const cards = icons
    .map((icon, index) => {
      const words = [icon.name, icon.pack, ...icon.aliases, ...icon.keywords].join(" ")
      const title = icon.aliases.length ? ` title="also ${escape(icon.aliases.join(", "))}"` : ""
      return (
        `<figure data-words="${escape(words.toLowerCase())}"${title}>` +
        `<img src="svg/${index}.svg" alt="" loading="lazy">` +
        `<figcaption>${escape(icon.name)}<small>${escape(icon.pack)}</small></figcaption></figure>`
      )
    })
    .join("\n")
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>spell icon${query ? ` · ${escape(query)}` : ""}</title>
<style>
  body { font: 14px system-ui, sans-serif; margin: 0; padding: 16px; background: #fff; color: #222; }
  header { position: sticky; top: 0; background: #fff; padding-bottom: 12px; }
  input { font: inherit; width: min(420px, 100%); padding: 6px 10px; }
  #count { color: #777; margin-left: 8px; }
  main { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; }
  figure { margin: 0; padding: 12px 4px; text-align: center; border: 1px solid #eee; border-radius: 6px; cursor: copy; }
  figure:hover { border-color: #999; }
  img { width: 32px; height: 32px; }
  figcaption { margin-top: 6px; overflow-wrap: anywhere; }
  small { display: block; color: #999; }
  figure.copied { background: #e6f4ea; }
</style>
</head>
<body>
<header>
  <input id="filter" placeholder="filter, e.g. bell" value="${escape(query)}" autofocus>
  <span id="count"></span>
  <div><small>click an icon to copy its name</small></div>
</header>
<main>
${cards}
</main>
<script>
  const filter = document.getElementById("filter")
  const figures = [...document.querySelectorAll("figure")]
  function update() {
    const words = filter.value.toLowerCase().split(/[\\s_-]+/).filter(Boolean)
    let shown = 0
    for (const figure of figures) {
      const hit = words.every((word) => figure.dataset.words.includes(word))
      figure.hidden = !hit
      if (hit) shown++
    }
    document.getElementById("count").textContent = shown + " of " + figures.length
  }
  filter.addEventListener("input", update)
  for (const figure of figures) {
    figure.addEventListener("click", () => {
      navigator.clipboard?.writeText(figure.querySelector("figcaption").firstChild.textContent)
      figure.classList.add("copied")
      setTimeout(() => figure.classList.remove("copied"), 600)
    })
  }
  update()
</script>
</body>
</html>
`
}

/** `text` safe inside HTML text or a double-quoted attribute. */
function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/** `text` dimmed, when `stream` shows colour (node's `styleText()`:  no colour into a pipe, or with `NO_COLOR`). */
function dim(text: string, stream: NodeJS.WriteStream = process.stdout): string {
  return styleText("dim", text, { stream })
}
