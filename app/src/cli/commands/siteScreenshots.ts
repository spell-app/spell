import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, join, resolve } from "node:path"

import type { Browser, Page } from "playwright"

import { BrowserPage } from "spell/element-tools/BrowserPage"
import { CLI } from "spell/cli"
import { PlaceSessions } from "spell/server/places"
import { windowFinished } from "spell/parser/cli/placeSignIn"
import { SiteEdits, type SitePart } from "spell/app/app/pages/SiteEdits"
import { declaresSite } from "spell/app/spaces/models/siteFiles"

/** The project's own file, what says a folder is a project. */
const PROJECT_FILE = "__project.json5"

/** The folder of a project its pictures go in. */
const PICTURES_FOLDER = "snapshots"

/** How good a picture is:  small enough to keep in a repo. */
const PICTURE_QUALITY = 80

/** The name the page calls to save, as Playwright hands it over. */
const SAVE_BINDING = "spellSaveScreenshot"

/** The id of the bar's element, what's hidden while the picture is taken. */
const BAR_ID = "spell-screenshot-bar"

/** `spell site screenshots`'s flags. */
export type SiteScreenshotsOptions = {
  size?: string
  signedIn?: string
  start?: string
}

/** What the bar sends when Save is pressed. */
export type ScreenshotAsked = {
  /** What to call the picture;  left out, the page's own name. */
  name?: string
  /** The site's page to point at it:  a page's name or title, or a new one's words. */
  part?: string
}

/** How to take them, apart from the window:  a test's own. */
export type SiteScreenshotsWays = {
  /** The browser;  default a window a person sees. */
  launch?: () => Promise<Browser>
  /** Resolves when they've finished;  default Enter, or the window closing. */
  finished?: (page: Page) => Promise<void>
}

/****************
 * ### `SiteScreenshots`
 * Pictures of a site's old pages, taken by a person walking the site (epic `mockup` P12):  what `spell site screenshots` saves.
 * - Each is a file of the project, `snapshots/<name>.jpg`, and the site's page is pointed at it, its line's `thumbnail`;
 *   the address it was taken at becomes its line's `live`, what its card's new-tab icon opens (epic `mockup` P17).
 * - A page the site doesn't have yet is added, at the address the browser is on.
 * - Plain files in and out:  the window is `siteScreenshots()`'s.
 ****************/
export class SiteScreenshots {
  /** The file declaring the site. */
  readonly siteFile: string

  constructor(
    /** The site's project folder. */
    readonly folder: string
  ) {
    const name = readdirSync(folder).find(
      (each) => /\.spell(?:ml)?$/.test(each) && declaresSite(readFileSync(join(folder, each), "utf8"))
    )
    if (!name) throw new CLI.CliError(`No file in ${folder} declares a site`)
    this.siteFile = join(folder, name)
  }

  /** The site's pages, as they are now. */
  get pages(): SitePart[] {
    return SiteEdits.allParts(SiteEdits.partsIn(this.text) ?? []).filter((part) => part.kind === "page")
  }

  /** The site file's text. */
  private get text(): string {
    return readFileSync(this.siteFile, "utf8")
  }

  /**
   * Which picture to write and which page to point at it, for what the bar asked, on a page at `url`:
   * `write()` then does it.
   * - `part`:  a page's name, else its title when only one has it, else a page already at this address;
   *   else the words of a new page.
   * - throws `CliError` when it names neither a picture nor a page
   */
  planFor({ name = "", part = "" }: ScreenshotAsked, url: string): ScreenshotPlan {
    const [called, wanted] = [name.trim(), part.trim()]
    if (!called && !wanted) throw new CLI.CliError("Give the picture a name, or pick the page it's of")
    if (!wanted) return { picture: pictureFileFor(called) }
    const address = new URL(url).pathname
    const { pages } = this
    const titled = pages.filter((page) => page.title?.toLowerCase() === wanted.toLowerCase())
    const found =
      pages.find((page) => page.name === wanted) ??
      (titled.length === 1 ? titled[0] : undefined) ??
      pages.find((page) => page.address === address)
    if (found) return { picture: pictureFileFor(called || found.name), pageName: found.name }
    const newPage = pageNameFor(wanted)
    return { picture: pictureFileFor(called || newPage), pageName: newPage, newAt: address }
  }

  /** SIDE EFFECT:  the plan's page is added if it's new, and pointed at its picture, already written. */
  pointPageAt({ picture, pageName, newAt, live }: ScreenshotPlan): void {
    if (!pageName) return
    const listOnly = SiteEdits.isRoutingOnly(this.siteFile)
    const text = newAt ? SiteEdits.withPageAdded(this.text, pageName, newAt, { listOnly }) : this.text
    writeFileSync(this.siteFile, SiteEdits.withPartChanged(text, pageName, { thumbnail: picture, live }))
  }

  /** Take the picture `page` shows, and do the plan:  what the bar then says.  The bar isn't in the picture. */
  async save(page: Page, asked: ScreenshotAsked): Promise<string> {
    const address = page.url()
    const plan = { ...this.planFor(asked, address), ...(SiteEdits.isLiveLink(address) && { live: address }) }
    const file = join(this.folder, plan.picture)
    mkdirSync(dirname(file), { recursive: true })
    await page.evaluate((id) => (document.getElementById(id)!.style.display = "none"), BAR_ID)
    try {
      await page.screenshot({ path: file, type: "jpeg", quality: PICTURE_QUALITY })
    } finally {
      await page.evaluate((id) => (document.getElementById(id)!.style.display = ""), BAR_ID)
    }
    this.pointPageAt(plan)
    if (!plan.pageName) return `Saved ${plan.picture}`
    return `Saved ${plan.picture}, on ${plan.pageName}${plan.newAt ? ` (new, at ${plan.newAt})` : ""}`
  }
}

/** What one Save does. */
export type ScreenshotPlan = {
  /** The picture's file, in the project. */
  picture: string
  /** The page to point at it. */
  pageName?: string
  /** It's a new page, at this address. */
  newAt?: string
  /** The real address the picture was taken at:  its card's live link. */
  live?: string
}

/** The picture's file for words:  `Rack Matrix` => `snapshots/rack-matrix.jpg`. */
function pictureFileFor(words: string): string {
  const stem = words
    .toLowerCase()
    .replace(/ page$/, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
  return `${PICTURES_FOLDER}/${stem || "picture"}.jpg`
}

/** A new page's name for words:  `Rack Matrix` => `rack matrix page`. */
function pageNameFor(words: string): string {
  const name = words
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
  return / page$/.test(name) ? name : `${name} page`
}

/** `1440x900`, as a window's size.  - throws `CliError` for anything else */
export function sizeIn(size: string): { width: number; height: number } {
  const [, width, height] = /^(\d+)x(\d+)$/.exec(size) ?? []
  if (!width) throw new CLI.CliError(`--size is a width and height, like 1440x900:  "${size}" isn't`)
  return { width: Number(width), height: Number(height) }
}

/** The folder of site `site`:  a folder holding a project, or a project's address.  - throws `CliError` for neither */
export async function siteFolderFor(site: string): Promise<string> {
  const path = resolve(site)
  if (existsSync(join(path, PROJECT_FILE))) return path
  if (!isAbsolute(site) && !site.startsWith(".") && site.includes("/")) {
    const { projectFilePath } = await import("spell/app/spaces/server/node/projects/project-utils")
    const file = projectFilePath(site)
    if (existsSync(file)) return dirname(file)
  }
  throw new CLI.CliError(`${site} isn't a project:  give its folder, or its address, e.g. owen@spell/my-site`)
}

/**
 * Run `spell site screenshots`:  its exit code.
 * - A window a person sees, at `--size`, on the site they're signed in to, each page with a small bar on top.
 * - throws `CliError` with nowhere to start, for a session that isn't there, or a site that isn't one
 */
export async function siteScreenshots(
  site: string,
  { size = "1440x900", signedIn, start }: SiteScreenshotsOptions,
  { launch = () => BrowserPage.launchVisible(), finished = windowFinished }: SiteScreenshotsWays = {}
): Promise<number> {
  const screenshots = new SiteScreenshots(await siteFolderFor(site))
  const session = signedIn ? new PlaceSessions().named(signedIn) : undefined
  if (signedIn && !session) {
    throw new CLI.CliError(`${signedIn} hasn't been signed in to:  spell place sign-in ${signedIn} <address>`)
  }
  const address = start ?? session?.address
  if (!address) throw new CLI.CliError("Where should it start?  --start <address>, or --signed-in <place>")
  const browser = await launch()
  try {
    const page = await BrowserPage.newPage(browser, {
      viewport: sizeIn(size),
      ...(session && { context: { storageState: session.browserState } })
    })
    await addBar(page, screenshots)
    CLI.out(
      "Go to a page, say what it is in the bar on top, and press Save.  Press Enter here, or close the window, to stop."
    )
    await page.goto(address)
    await finished(page)
    return CLI.EXIT.OK
  } finally {
    await browser.close().catch(() => undefined)
  }
}

/** SIDE EFFECT:  every page of `page`'s window gets the bar, and its Save works. */
export async function addBar(page: Page, screenshots: SiteScreenshots): Promise<void> {
  const context = page.context()
  await context.exposeBinding(SAVE_BINDING, async ({ page: from }, asked: ScreenshotAsked) => {
    try {
      return await screenshots.save(from, asked)
    } catch (error) {
      return `Couldn't save:  ${(error as Error).message}`
    }
  })
  const choices = screenshots.pages.map(({ name, title, address }) => ({
    name,
    label: `${title ?? name}  ${address ?? ""}`
  }))
  await context.addInitScript(drawBar, { id: BAR_ID, save: SAVE_BINDING, choices })
}

/** The bar, on every page:  runs in the page, on whatever site that is, so it's plain DOM, in a shadow root of its own. */
function drawBar({
  id,
  save,
  choices
}: {
  id: string
  save: string
  choices: { name: string; label: string }[]
}): void {
  if (window.top !== window) return
  const draw = () => {
    if (document.getElementById(id)) return
    const host = document.createElement("div")
    host.id = id
    host.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:2147483647"
    const root = host.attachShadow({ mode: "open" })
    const bar = document.createElement("form")
    bar.style.cssText =
      "display:flex;gap:8px;align-items:center;padding:6px 10px;background:#2b2440;color:#fff;font:13px system-ui"
    const field = (label: string, list?: string) => {
      const input = document.createElement("input")
      input.placeholder = label
      input.setAttribute("aria-label", label)
      input.style.cssText = "flex:1;font:inherit;padding:3px 6px"
      if (list) input.setAttribute("list", list)
      return input
    }
    const name = field("Picture's name")
    const part = field("The site's page, or a new one", "spell-screenshot-pages")
    const pages = document.createElement("datalist")
    pages.id = "spell-screenshot-pages"
    for (const choice of choices) {
      const option = document.createElement("option")
      option.value = choice.name
      option.label = choice.label
      pages.append(option)
    }
    const button = document.createElement("button")
    button.textContent = "Save"
    const said = document.createElement("span")
    said.setAttribute("role", "status")
    bar.addEventListener("submit", (event) => {
      event.preventDefault()
      said.textContent = "..."
      const send = (window as unknown as Record<string, (asked: object) => Promise<string>>)[save]!
      void send({ name: name.value, part: part.value }).then((words) => (said.textContent = words))
    })
    bar.append(name, part, pages, button, said)
    root.append(bar)
    document.documentElement.append(host)
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", draw)
  else draw()
}
