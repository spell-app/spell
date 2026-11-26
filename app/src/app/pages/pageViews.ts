import { LazyPiece } from "spell/app/app/solid/LazyPiece"

/****************
 * ### `PageViews`
 * The app's pages but the editor's own, each loaded the first time it shows (epic `solid-2-final` P11):
 * the home page, the theme editor, the site editor, a place's reference page, the guides and the palette's groups.
 * - The editor's first load, opening a project (`/edit/...`), carries none of them.
 * - Each is a `LazyPiece`:  the route draws its `view()`, a loader while it comes;
 *   what leads to it loads it ahead, while the pointer rests on it (`ahead`):  the Home button, the theme's Edit.
 * - NEVER import a page file statically here or from the first load, types aside:  it would be in it again.
 * - STATIC and instance-free on purpose:  ONE load of each page per app.
 ****************/
export class PageViews {
  /** `<ProjectChooser>`, the home page:  its cards and toolbar are the other pages' too. */
  static readonly home = new LazyPiece(() => import("./ProjectChooser"))
  /** `<ThemeEditorPage>`, `/theme`. */
  static readonly theme = new LazyPiece(() => import("./ThemeEditorPage"))
  /** `<SiteEditorRoute>`, `/site/...`. */
  static readonly site = new LazyPiece(() => import("./SiteEditorPage"))
  /** `<PlaceReferencePage>`, `/place/...`. */
  static readonly place = new LazyPiece(() => import("./PlaceReference"))
  /** `<GuidesPage>`, `/guides`. */
  static readonly guides = new LazyPiece(() => import("./GuidesPage"))
  /** `<GroupPage>`, an org's or an org group's page:  `/@acme`, `/@acme/org-spell` (epic `editor` P47). */
  static readonly group = new LazyPiece(() => import("./GroupPage"))
  /** `<PaletteGroupsPage>`, `/palette`. */
  static readonly palette = new LazyPiece(() => import("./PaletteGroupsPage"))
}
