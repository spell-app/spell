import HOME_ORDER_LIST from "./homeOrder.json"

/**
 * The order of the editor's home page cards, group by group (epic `mockup` P19):  ONE list, the editor's, not each
 * project's.
 * - Kept in `homeOrder.json` beside this file:  each group's address, then its projects' folder names in order,
 *   `{ "@spell/examples": ["fizzbuzz", "Counter", ...] }`.
 * - A project not on its group's list comes after the listed ones, by name:  a new example goes to the end by itself.
 * - Changed by dragging a card on the home page, in dev (`POST /api/home/order`, which writes the file);
 *   the README's table of examples reads it too (`yarn examples:readme`).
 * - Browser-safe:  the editor imports it.
 */
export const HOME_ORDER: Readonly<Record<string, readonly string[]>> = HOME_ORDER_LIST

/** Where the home page's order is saved, and asked whether it may be:  `GET` / `POST`. */
export const HOME_ORDER_URL = "/api/home/order"

/** `GET HOME_ORDER_URL`'s answer:  may this page reorder the cards?  Refused (403) where it may not. */
export type HomeOrderAnswer = { mayReorder: boolean }

/** `POST HOME_ORDER_URL`'s body:  one group's new order. */
export type HomeOrderChange = {
  /** the group's address, `@spell/examples` */
  group: string
  /** its projects' folder names, in their new order */
  names: string[]
}

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

/** A project's folder name, the last part of its address:  `@spell/examples/fizzbuzz` => `fizzbuzz`. */
export function folderNameOf(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1)
}
