import { $fetch, readJSON5 } from "spell/util"
import { appTexts } from "spell/app/app/ui/AppTexts"

/**
 * The guides that ship with Spell, as the app reads them (epic `epic-engine` P79):  their list and one guide's body,
 * from the installed package, through the app's server (`/api/guides/`, `appRoutes.ts`).
 * - No Solid:  the Guides page (`<GuidesPage>`) and the home page's guides (`<HomeGuides>`) both read it.
 */

/** Who a guide is for. */
export type Audience = "makers" | "programmers"

/** One shipped guide, as `guides.json5` lists it (`ShippedGuides`, spell-epic's `epic guides index`). */
export type ShippedGuide = { path: string; title: string; description: string; audience: Audience; topic: string }

/** A Start here entry:  a guide, or a chapter of one (`anchor`). */
export type StartHere = { order: number; path: string; title: string; anchor?: string }

/** `guides.json5`. */
export type GuideList = { guides: ShippedGuide[]; startHere: StartHere[] }

/** The shipped guides' list;  throws `$fetch()`'s error when the package has none. */
export async function readGuideList(): Promise<GuideList> {
  const text = await $fetch<string>({ url: `${GUIDES_API}/guides.json5`, cache: "no-cache" })
  return (await readJSON5(text, "guides.json5")) as GuideList
}

/**
 * Guide `path`'s title and body (`guides/data/data.html`):  its `<main>`, less what only the epic pages' site draws
 * (the breadcrumb, the page head's sticky wrapper, scripts);  throws `$fetch()`'s error when it isn't there.
 */
export async function readGuideBody(path: string): Promise<{ title: string; html: string }> {
  const text = await $fetch<string>({ url: `${GUIDES_API}/${path.replace(/^guides\//, "")}`, cache: "no-cache" })
  const page = new DOMParser().parseFromString(text, "text/html")
  const main = page.querySelector("main") ?? page.body
  for (const away of main.querySelectorAll(LEFT_OUT)) away.remove()
  // the title stays, out of the site's sticky head
  for (const sticky of main.querySelectorAll("ui-sticky.spell-h1")) sticky.replaceWith(...sticky.querySelectorAll("h1"))
  return { title: page.title || path, html: main.innerHTML }
}

/** Where the app's server answers for the shipped guides (`appRoutes.ts`' `GUIDES_API`). */
const GUIDES_API = "/api/guides"

/** What only the epic pages' site draws:  left out of a guide shown in the app. */
const LEFT_OUT = "ui-breadcrumbs.spell-crumbs, script, spell-site-header"

/** A Start here entry's line:  its guide's description, or, for a chapter, which guide it's in. */
export function startHereLine(list: GuideList, entry: StartHere): string {
  const guide = list.guides.find((each) => each.path === entry.path)
  if (!guide) return ""
  return entry.anchor ? appTexts.text("guidesChapterOf", { guide: guide.title }) : guide.description
}
