import { isEqual } from "lodash-es"
import { createEffect, createMemo, createSignal } from "solid-js"

import { SP } from "spell/parser/spell"
import { SPACES } from "spell/app/spaces"
import { editor } from "spell/app/app/editor"
import { appTexts, type GroupWords } from "spell/app/app/ui/AppTexts"
import { tracked } from "./tracked"

/**
 * A group of projects (a project root:  the Examples, the Guides ...) as Solid reads it, and opening one of them.
 * - Read by the Spell menu's project list (`<ProjectsMenu>`, `MenuBar.tsx`), the editor page and the landing page.
 * - None of them lists a project made from a start card and left untouched (epic `mockup` I42).
 * - No component of its own:  the lists that draw a root draw it their own way.
 */

/** What the Spell menu's `<ProjectsMenu>`, the editor and the landing page's cards show of a project root. */
export type ProjectRootState = {
  /** Has it loaded its list of projects? */
  loaded: boolean
  /** Did loading it fail?  Then it never loads:  see `trackProjectRoot()`. */
  failed: boolean
  /**
   * Its projects, in order:  `path`, the name to show, its description, if its project file has one, its language,
   * when it's all written in another than English (`SP.ProjectListEntry`), and `onHome: false` when it says so;
   * whether it has a thumbnail, for the home page's cards (`SPACES.ProjectListEntryWithHome`).
   */
  projects: {
    path: string
    name: string
    description?: string
    language?: string
    isSite?: boolean
    onHome?: false
    hasThumbnail?: true
  }[]
  /** Its icon name. */
  icon?: string
  /** Its words, in the page's language:  its title (`Examples`), what its projects are called (`Example`) ... */
  words: GroupWords
}

/**
 * `root()` (default:  `editor.projectRoot`), read through `tracked()`:  Solid sees it load and change.
 * - SIDE EFFECT:  loads the root once it's known, if it isn't yet.
 *   A failure is a console warning and `failed`, e.g. a root whose folder doesn't exist (the server answers 500).
 * - A memo makes a new `tracked()` per root (disposing the last):  `tracked()`'s read can't follow Solid props.
 * - Each project keeps its object while nothing about it changes, so a `<For>` over `projects` keeps its rows
 *   when the root is read again (Solid's `UNSTABLE_LIST_IDENTITY`:  21 of 21 rows redrawn, epic `editor` I178).
 * - Call in a component body:  it's owned by the component.
 */
export function trackProjectRoot(root: () => SPACES.SpellProjectRoot | undefined): () => ProjectRootState {
  const editorRoot = tracked(() => editor.projectRoot)
  const current = createMemo(() => root() ?? editorRoot())
  const [failed, setFailed] = createSignal<SPACES.SpellProjectRoot>()
  createEffect(current, (projectRoot) => {
    if (!projectRoot || projectRoot.isLoaded) return
    projectRoot.load().catch((error: unknown) => {
      console.warn(`Couldn't load ${projectRoot.path}:`, error)
      setFailed(projectRoot)
    })
  })
  // each project's last object, by its path:  handed out again while it's the same
  const kept = new Map<string, ProjectRootState["projects"][number]>()
  const state = createMemo(() => {
    const projectRoot = current()
    return tracked(() => {
      const read = readProjectRoot(projectRoot)
      read.projects = read.projects.map((project) => {
        const last = kept.get(project.path)
        if (last && isEqual(last, project)) return last
        kept.set(project.path, project)
        return project
      })
      return read
    })
  })
  return () => ({ ...state()(), failed: !!failed() && failed() === current() })
}

/** What `trackProjectRoot()` shows of `projectRoot`, read now. */
function readProjectRoot(projectRoot: SPACES.SpellProjectRoot | undefined): Omit<ProjectRootState, "failed"> {
  const loaded = !!projectRoot?.isLoaded
  return {
    loaded,
    projects: loaded
      ? // each project's title:  its file's `"title"`, which the list gave, else made from its name (Q45)
        // not one made from a start card and left untouched:  not one of your apps yet (epic `mockup` I42)
        projectRoot!.projectPaths
          .filter((path) => !isUntouched(projectRoot!, path))
          .map((path) => {
            const entry: SPACES.ProjectListEntryWithHome | undefined = projectRoot!.contents?.find(
              (each) => each.path === path
            )
            return {
              path,
              name: new SP.SpellProject(path).title,
              description: entry?.description,
              language: entry?.language,
              isSite: entry?.isSite,
              onHome: entry?.onHome,
              hasThumbnail: entry?.hasThumbnail
            }
          })
      : [],
    icon: projectRoot?.icon,
    words: appTexts.groupWords(projectRoot)
  }
}

/** Is project `path` of `projectRoot` one made from a start card, nothing changed yet (`SPACES.UnsavedApp`)? */
function isUntouched(projectRoot: SPACES.SpellProjectRoot, path: string): boolean {
  const entry: SPACES.ProjectListEntryWithHome | undefined = projectRoot.contents?.find((each) => each.path === path)
  return entry?.unsaved === "untouched"
}

/** Show the project at `path`, in the editor or the runner. */
export function openProject(path: string, useRunner?: boolean) {
  if (useRunner) void editor.showRunner(path)
  else editor.showEditor(path)
}
