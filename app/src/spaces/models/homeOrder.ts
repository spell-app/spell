import HOME_ORDER_LIST from "./homeOrder.json"

/**
 * The order of the editor's home page:  its sections, and each group's cards (epic `mockup` P19).
 * ONE list, Spell's own, not each project's.
 * - Kept in `homeOrder.json` beside this file:  each group's address, then its projects' folder names in order,
 *   `{ "@spell/examples": ["fizzbuzz", "Counter", ...] }`.
 *   - And the sections' order, under `HOME_SECTIONS_KEY`, `"sections"` (epic `repo-split` P28):
 *     no group's address is a bare word, so a reader of a group's list never meets it.
 *   - And what the page leaves out, under `HOME_HIDDEN_KEY`, `"hidden"` (epic `mockup` I40).
 * - A project not on its group's list comes after the listed ones, by name:  a new example goes to the end by itself.
 * - Changed by dragging a card, or a section by its header, on the home page, while it's being rearranged
 *   (epic `mockup` T51, `homeLayout.ts`):  by `@spell`'s people, in Spell's own checkout, it's this file;
 *   by anyone else, their own order, laid over it.
 * - The README's table of examples reads it too (`yarn examples:readme`).
 * - Browser-safe:  the editor imports it.
 */
export const HOME_ORDER: Readonly<Record<string, readonly string[]>> = HOME_ORDER_LIST

/** One group's new order, or the sections', or the start cards':  part of a `HomeLayoutChange`. */
export type HomeOrderChange = {
  /** the group's address, `@spell/examples`;  or `HOME_SECTIONS_KEY`, `HOME_START_KEY` */
  group: string
  /** its projects' folder names, in their new order;  or the sections' ids (`HomeSection`), the start cards' */
  names: string[]
}

/** The key in the home page's order that holds its SECTIONS' order, not a group's:  `"sections"`. */
export const HOME_SECTIONS_KEY = "sections"

/**
 * The home page's sections under its hero, by id, in their order when the saved list names none of them.
 * - `projects`:  this machine's person's own, first (Owen, epic `mockup` I40:  "my apps should be at the top");
 *   not shown while they have none
 * - `start`:  the ways to start something new
 * - `examples`, `library`, `guides`:  Spell's own groups, their projects in English
 * - `spanish`:  the examples and guides written in Spanish, "En español" (Owen, epic `mockup` I46)
 * - `org`:  each of their org's own groups (`orgGroups`), one section each;  none in Spell's own org
 * - `editor`:  the editor's own pieces, in dev only
 * - Any of them may be left off the page, in the saved list's `HOME_HIDDEN_KEY` (`library` and `editor`, for now).
 */
export const HOME_SECTIONS = ["projects", "start", "examples", "library", "guides", "spanish", "org", "editor"] as const

/** One of `HOME_SECTIONS`. */
export type HomeSection = (typeof HOME_SECTIONS)[number]

/**
 * The home page's sections, in order (epic `repo-split` P28):  `order`'s list of them, then any it leaves out.
 * - `inOrg`, in an app made for an org (its org isn't Spell's own, `localPerson.org`):
 *   the person's own projects and the org's groups come first (`HOME_ORG_FIRST`), and the library isn't shown.
 *   (Owen, 2026-11-16:  "Your own projects and the org's projects AT THE TOP.  NOT Library there.")
 * - A name the list holds that isn't a section is skipped:  an old list never breaks the page.
 * - A section `order` hides (`HOME_HIDDEN_KEY`) isn't there.
 */
export function homeSections(
  inOrg: boolean,
  order: Readonly<Record<string, readonly string[]>> = HOME_ORDER
): HomeSection[] {
  const saved = (order[HOME_SECTIONS_KEY] ?? []).filter(isHomeSection)
  const all = [...new Set([...saved, ...HOME_SECTIONS])].filter((section) => isOnHome(section, order))
  if (!inOrg) return all
  const first = all.filter((section) => HOME_ORG_FIRST.includes(section))
  return [...first, ...all.filter((section) => !HOME_ORG_FIRST.includes(section) && section !== "library")]
}

/** Is `name` one of the home page's sections? */
export function isHomeSection(name: string): name is HomeSection {
  return (HOME_SECTIONS as readonly string[]).includes(name)
}

/**
 * The sections an org's app shows first, in their saved order:  the person's own, then the org's.
 * - Above the home page's hero, too (`<ProjectChooser>`).
 */
export const HOME_ORG_FIRST: readonly HomeSection[] = ["projects", "org"]

/**
 * `projects` of group `group` in the home page's order, `order` (default:  the saved one).
 * - Each project's folder name is the end of its `path`:  `@spell/examples/fizzbuzz` => `fizzbuzz`.
 * - Those not listed:  after the listed ones, by name.
 * - A new array;  `projects` is left as it is.
 */
export function inHomeOrder<Project extends { path: string }>(
  group: string,
  projects: readonly Project[],
  order: Readonly<Record<string, readonly string[]>> = HOME_ORDER
): Project[] {
  const listed = order[group] ?? []
  const rank = (project: Project) => {
    const index = listed.indexOf(folderNameOf(project.path))
    return index === -1 ? listed.length : index
  }
  return projects.toSorted((a, b) => rank(a) - rank(b) || folderNameOf(a.path).localeCompare(folderNameOf(b.path)))
}

/**
 * The key in the home page's order that holds what the page leaves out:  `"hidden"` (Owen, epic `mockup` I40).
 * - Projects by their address, `@spell/examples/fizzbuzz`;  sections by their id, `library`.
 * - Left out of the page only:  the project menu still lists them, and the README's table of examples.
 * - Kept by hand in `homeOrder.json`;  dragging never changes it.
 * - NOT a project file's `"onHome": false`:  that means "no app of its own", which the tests and the README's table
 *   read too (a library's), where a hidden example still has its app.
 */
export const HOME_HIDDEN_KEY = "hidden"

/** Is `name`, a project's address or a section's id, on the home page:  not in `order`'s hidden list? */
export function isOnHome(name: string, order: Readonly<Record<string, readonly string[]>> = HOME_ORDER): boolean {
  return !(order[HOME_HIDDEN_KEY] ?? []).includes(name)
}

/**
 * Group `group`'s whole order, `all` (its projects' folder names), with the run `run` of them in its new order:
 * each of `run`'s names takes the place one of the run had, the others stay where they are.
 * - So a row showing some of a group's projects (the examples without the hidden ones, `HOME_HIDDEN_KEY`)
 *   saves its new order without moving the others' (epic `mockup` I40).
 * - A name of `run` that isn't in `all` goes at the end.
 * - A new array.
 */
export function withRunReordered(all: readonly string[], run: readonly string[]): string[] {
  const inRun = new Set(run)
  const next = [...run.filter((name) => all.includes(name))]
  return [...all.map((name) => (inRun.has(name) ? next.shift()! : name)), ...run.filter((name) => !all.includes(name))]
}

/** A project's folder name, the last part of its address:  `@spell/examples/fizzbuzz` => `fizzbuzz`. */
export function folderNameOf(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1)
}
