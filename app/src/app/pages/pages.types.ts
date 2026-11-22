import type { EditorStore } from "spell/app/app/editor"

// ## Shared types for app pages.

// ## Routing

/** The theme editor's address (`<ThemeEditorPage>`):  `editor.showThemeEditor()` goes there. */
export const THEME_PAGE = "/theme"

/**
 * Where the site editor's addresses start (`<SiteEditorPage>`):  `/site/<project>`, or a group's sites, `/site/<group>`.
 * - By itself, every site (`<SitesHomePage>`).
 */
export const SITE_PAGE = "/site"

/** The site editor's address for the project at `projectPath`:  `/site/@spell/examples/StarWarsSite`. */
export function siteEditorUrlFor(projectPath: string): string {
  return `${SITE_PAGE}/${projectPath}`
}

/**
 * Where a place's reference page is (`<PlaceReferencePage>`, epic `data` P52):
 * `/place/<its description's address>`.
 */
export const PLACE_PAGE = "/place"

/** The reference page of the place described at `path`:  `/place/@spell/examples/StarWars/StarWars.api.json5`. */
export function placeReferenceUrlFor(path: string): string {
  return `${PLACE_PAGE}/${path}`
}

/**
 * Where the guides that ship with Spell are read (`<GuidesPage>`, epic `epic-engine` P79):  `/guides` lists them,
 * `/guides/<path inside the guides folder>` shows one.
 */
export const GUIDES_PAGE = "/guides"

/**
 * The app's address of the guide at page path `path` (`guides/data/data.html`, its address in the guides' list), and
 * of a chapter in it (`anchor`):  `/guides/data/data.html`, `/guides/spell-language/spell-language.html#views`.
 */
export function guideUrlFor(path: string, anchor?: string): string {
  return `${GUIDES_PAGE}/${path.replace(/^guides\//, "")}${anchor ? `#${anchor}` : ""}`
}

/** Params parsed out of the `/:page/*address` route:  `/edit/...`, `/run/...`. */
export type SpellRouteParams = {
  /** Which page:  `edit` or `run`. */
  page: string
  /**
   * The address, each part decoded by the router, e.g. `@spell/examples/Solitaire/a b.spell`.
   * - NEVER decode it again:  a name with an encoded `%` in it, `a%25b`, would lose it.
   */
  address: string
}

/** Which page shows a project:  `editor.projectPage`, set by `followRoute()`. */
export type EditorPage = EditorStore["projectPage"]
