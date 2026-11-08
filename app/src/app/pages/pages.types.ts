import type { EditorStore } from "spell/app/app/editor"

// ## Shared types for app pages.

// ## Routing

/** The theme editor's address (`<ThemeEditorPage>`):  `editor.showThemeEditor()` goes there. */
export const THEME_PAGE = "/theme"

/** Where the site editor's addresses start (`<SiteEditorPage>`):  `/site/<project>` (epic `mockup` P4). */
export const SITE_PAGE = "/site"

/** The site editor's address for the project at `projectPath`:  `/site/@spell/examples/StarWarsSite`. */
export function siteEditorUrlFor(projectPath: string): string {
  return `${SITE_PAGE}/${projectPath}`
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
