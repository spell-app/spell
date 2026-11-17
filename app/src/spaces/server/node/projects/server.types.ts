//
//  ## Shared types for the express server.
//
//  NOTE: JSON payload shapes exchanged with the client live here;
//  the file/folder helpers that produce them stay in their topical modules (`./file-utils`, `./project-utils`).
//

////////////////
// ## File utilities
////////////////

/** Filtering/formatting options for `getFolderContents()`.  All optional -- see each default below. */
export type GetFolderContentsOptions = {
  /** Perform case-insensitive sort on results.  Default `true`. */
  sort?: boolean
  /** Include directories in results.  Default `false`. */
  includeFolders?: boolean
  /** Include files in results.  Default `true`. */
  includeFiles?: boolean
  /** Return names only, `false` = return full path.  Default `false`. */
  namesOnly?: boolean
  /** Ignore hidden files.  Default `false`. */
  ignoreHidden?: boolean
  /** Ignore empty folders.  Default `false`. */
  ignoreEmptyFolders?: boolean
  /** Only return items where `pattern.test(path)` is `true` for the full path.  Default `undefined`. */
  pattern?: RegExp
}

/** Options of `getFilesInside()`. */
export type GetFilesInsideOptions = {
  /** Should it stay out of this folder?  `relativePath` is the folder's path from where the walk began, `Button/Icons`. */
  ignoreFolder?: (relativePath: string) => boolean
}

////////////////
// ## Project JSON payloads
////////////////

/**
 * One entry in a project's `imports` list -- both on disk (its project file) and in `ProjectIndexJSON`.
 * - `path` -- file path relative to project, e.g. `/foo.spell`.
 *   A leading `@` instead means it refers to another project.
 * - `active` -- `true` if file should be included in compilation.
 * - `contents` -- preloaded file contents for `active` files with a preloadable extension.
 *   `undefined`/`null` otherwise.
 */
export type ImportEntryJSON = {
  path: string
  active: boolean
  contents?: string | null
  /** Another project's entry:  names to import -- see `SP.ProjectManifestImport`. */
  import?: string[]
  /** Another project's entry:  semver range for its `version`. */
  version?: string
  /** Another project's entry:  parse its sources rather than its declarations. */
  source?: boolean
}

/**
 * On-disk shape of a project's file, `__project.json5` -- see `SP.PROJECT_FILE`.
 * - `imports` order determines compile order.
 */
export type ProjectFileJSON = {
  /**
   * Its name for people, e.g. `"Todos - Form Based"`, when its folder's name can't say it (decision Q45):
   * default, the title made from the folder's name, `todos-form-based` => `Todos Form Based`.
   */
  title?: string
  /**
   * What it shows, one line for people, e.g. `"A to-do list:  yes/no properties ..."`.
   * - The example apps' table, in spell-app's `README-examples.md`, is made from it (`yarn examples:readme`).
   */
  description?: string
  /**
   * `false`:  the home page shows no card for it, and its Hero's first-guide button skips it (epic `notebook` P10).
   * - The project menu still lists it.
   * - Default, and any other value:  it's on the home page.
   */
  onHome?: false
  /** This project's semver, e.g. `"1.2.0"` -- copied into its declarations, for importers' `version` ranges. */
  version?: string
  /** Names it offers importers, e.g. `["Card", "Deck"]` -- default:  everything it declares. */
  exports?: string[]
  /** Targets it compiles to, e.g. `["js/solid", "ts/solid"]` -- default `["js/solid"]`:  see `SP.TARGETS`. */
  targets?: string[]
  /**
   * Where its lists start counting:  `1` (the default), or `0` as javascript and Python do (epic `python-target` P2).
   * - Applied when compiling, on every target:  `card 0 of the deck` is its first card.
   * - Ordinal words don't follow it:  `the first card` is the first either way.
   */
  listsStartAt?: 0 | 1
  /** Files it compiles, in order -- and other projects it imports. */
  imports: ImportEntryJSON[]
  /** What's there for working on it, not for running it:  see `ProjectDevelopmentJSON`. */
  development?: ProjectDevelopmentJSON
  /** How its card's picture is taken:  see `ProjectThumbnailJSON`. */
  thumbnail?: ProjectThumbnailJSON
}

/**
 * A project file's `thumbnail`:  how the picture on its home page card is taken
 * (its `__thumbnail.png`, by the app folder's `yarn examples:readme --thumbnails`;  epic `mockup` I41).
 * - e.g. `{ steps: [{ click: "2" }, { click: "×" }, { click: "2" }] }`:  the Calculator showing `2 × 2 = 4`
 * - Read only by that script;  the editor never runs it.
 */
export type ProjectThumbnailJSON = {
  /**
   * What to do in the running app before its picture is taken, in order, so the picture shows the app in use:
   * a game mid-way, a sum worked out, a list with things in it.
   * - None:  its picture is the app as it opens.
   */
  steps?: ThumbnailStepJSON[]
}

/**
 * One step before a thumbnail is taken:  a click, some typing, a key, or a scroll.
 * - Each step does ONE of `click`, `clickOn`, `type`, `press`, `scrollTo` or `scrollToOn`;  then waits.
 * - Everything is looked for inside the app only, never the runner's menu bar round it.
 */
export type ThumbnailStepJSON = {
  /** click the thing whose text is exactly this, e.g. `"New game"` */
  click?: string
  /**
   * click the thing this CSS selector finds, e.g. `"ui-button"`, or `'button[aria-label="More"]'` for a button with no text;
   * Spell UI's shadow roots are looked into
   */
  clickOn?: string
  /** which match `click`, `clickOn`, `scrollTo` or `scrollToOn` means, from 0, among those showing:  default the first */
  nth?: number
  /** type this text, into what has the focus, or into `into` */
  type?: string
  /** the field `type` types into, by its placeholder or its label, e.g. `"A habit to keep, e.g. Read"` */
  into?: string
  /** press this key, by Playwright's name for it, e.g. `"Enter"` */
  press?: string
  /** scroll the app so the thing with this text is at the top of the picture, e.g. a list's first item */
  scrollTo?: string
  /**
   * scroll the app so the thing this CSS selector finds is at the top of the picture, e.g. `"habit-tracker-habit"`;
   * one that draws no box itself (`display: contents`) goes by the first thing inside it that does
   */
  scrollToOn?: string
  /** how long to wait after the step, in milliseconds:  default 300 */
  wait?: number
}

/**
 * A project file's `development`:  files for working on the project, never compiled or shown in its file list.
 * - e.g. `{ apis: ["StarWars.api.json5"] }`
 */
export type ProjectDevelopmentJSON = {
  /**
   * Each server's description, beside the `.api.spell` that reaches it, by its name in the project's folder:
   * what `spell place ingest` found, and what `spell place update` changes (epic `data`).
   * - The ingest and the update add theirs here.
   * - A `.json5` file is never in a project's file list (`isManifestFile()`), so the editor shows none of them;
   *   a page for looking at a server again would find them here.
   */
  apis?: string[]
}

/**
 * Per-file disk stats, as produced by `fileUtils.getPathInfo()`.
 * - `created` / `modified` -- timestamps in milliseconds.
 * - `size` -- file size in bytes.
 */
export type ManifestEntryJSON = { created: number; modified: number; size: number }

/** Map of file `path` -> `ManifestEntryJSON`, reflecting current on-disk state of a project. */
export type ManifestJSON = Record<string, ManifestEntryJSON>

/**
 * Response shape for `GET /api/projects/index/:projectId` -- see `project-utils.getIndex()`.
 * - And for other project-file routes that return the updated index.
 * - `manifest` -- current on-disk manifest:  NOT persisted, always freshly computed from file system.
 * - `imports` -- import list, synced with `manifest` and persisted back to the project file when it changes.
 * - `title` / `version` / `exports` / `targets` / `listsStartAt` / `development` -- straight from the project file (`ProjectFileJSON`).
 * - `buildFolder` -- where its compiled output goes, inside the checkout's `build/`:  `project-utils.buildFolderInBuild()`.
 * - `namesLanguages` -- the languages it has a names dictionary in, beside its project file (`Solitaire.es.names.json5`);
 *   left out when none:  see `SP.ProjectManifestJSON5`.
 */
export type ProjectIndexJSON = {
  manifest: ManifestJSON
  title?: string
  imports: ImportEntryJSON[]
  version?: string
  exports?: string[]
  targets?: string[]
  listsStartAt?: 0 | 1
  development?: ProjectDevelopmentJSON
  buildFolder?: string
  namesLanguages?: string[]
}
