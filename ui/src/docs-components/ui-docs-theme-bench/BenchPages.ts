import type { PreviewPage } from "spell-ui/components/ui-theme-editor/UIThemeEditor.types"

/****************
 * ### `BenchPages`
 * The four real pages Spell's theme editor previews while it's worked on (epic `debut` P24), as
 * `<ui-theme-editor pages>` takes them:  the docs' theme bench hands them in, and so does the Spell editor's Theme page.
 * - Two by two, in this order (Owen):  the Editor and the Epic page on top, Spell UI and the Notebook under them.
 * - Spell UI's components name no page of Spell's:  this docs widget does, for the pages around it.
 * - Static and pure:  data in, pages out;  the editor app imports it by its file
 *   (`spell-ui/docs-components/ui-docs-theme-bench/BenchPages`).
 ****************/
export class BenchPages {
  /**
   * The four pages, each at its address:
   * - `siteRoot`:  where the page server's pages start, as seen from the page that shows the editor
   *   (`""` at its root, `/worktrees/debut` for a worktree's pages on the main checkout's server);
   *   the editor app reaches them too, through its own dev server
   * - `editorBase`:  the Spell editor app's address;  `undefined` while it's found, `""` when it isn't running
   * - `labelOf(id)`:  each page's title, in the host's words;  `noEditor`:  said when the editor isn't running
   */
  static pages({ siteRoot, editorBase, labelOf, noEditor }: BenchPagesProps): PreviewPage[] {
    return BENCH_PAGE_IDS.map((id) => {
      const place = PLACES[id]
      const url =
        place.at === "page server"
          ? siteRoot + place.path
          : editorBase === undefined || editorBase === ""
            ? editorBase
            : editorBase + place.path
      return {
        id,
        label: labelOf(id),
        url,
        note: place.at === "editor" ? noEditor : undefined,
        width: place.width,
        reach: place.at === "editor" ? "messages" : "same origin",
        themeKey: place.themeKey,
        icon: place.icon,
        ownPrefix: place.ownPrefix,
        fullView: place.fullView
      }
    })
  }
}

/** What `BenchPages.pages()` takes. */
export type BenchPagesProps = {
  siteRoot: string
  editorBase: string | undefined
  labelOf: (id: BenchPageId) => string
  noEditor: string
}

/** The four pages' ids, in the grid's order, two by two (Owen):  the editor and the epic page on top. */
export const BENCH_PAGE_IDS = ["editor", "epic", "ui", "notebook"] as const

/** One of them. */
export type BenchPageId = (typeof BENCH_PAGE_IDS)[number]

/** The page server's address that redirects to the editor app, wherever it runs (spell-app's `appRoutes`). */
export const EDITOR_REDIRECT = "/editor"

/**
 * Each page:  where it's served (the page server, or the editor app), its path there, the width it's drawn at,
 * where it keeps its theme, its icon;  the editor's own tokens (`--spell-`), and its full view.
 */
const PLACES: Readonly<
  Record<
    BenchPageId,
    {
      at: "page server" | "editor"
      path: string
      width: number
      themeKey: string
      icon: string
      ownPrefix?: string
      fullView?: boolean
    }
  >
> = {
  editor: {
    at: "editor",
    path: "/edit/@spell/examples/Solitaire",
    width: 1440,
    themeKey: "spell-app:theme",
    icon: "laptop code",
    ownPrefix: "--spell-",
    fullView: true
  },
  epic: {
    at: "page server",
    path: "/epics/debut/debut.plan.html",
    width: 1280,
    themeKey: "spell-epic:theme",
    icon: "tasks"
  },
  ui: {
    at: "page server",
    path: "/components/ui/ui-button.html",
    width: 1280,
    themeKey: "spell-ui-site:theme",
    icon: "cubes"
  },
  notebook: {
    at: "editor",
    path: "/edit/@spell/notebooks/Avatar",
    width: 1440,
    themeKey: "spell-app:theme",
    icon: "book open"
  }
}
