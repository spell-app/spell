import type { Migration, MigrationContext } from "./migrations.types"

/****************
 * ### `CommitsLast`
 * The migration `commits-last` (epic `epic-engine` I493):  an item's commits after everything else it holds, where
 * `<epic-item>`'s content model lists them, `epic lint` checks them, and the tool places a new one (`Markup.place()`).
 * - why:  older tools (October) appended an item's new text AFTER the commits listed under it, so data's Q21 and T76
 *   read paragraph, commit, paragraph, commit;  `epic lint` called each paragraph out of order, and a hand edit
 *   moving the commits to the end didn't last
 * - only an item's own commits (`:scope > epic-commit`), moved to its end in the order they were;  every other child
 *   stays where it is, every word kept
 *   - NOT a phase's:  its commits go after its Done, before Files, and the tool places them there already
 * - IDEMPOTENT:  an item whose commits are last is left as it is
 * - Cheap markup:  every edit runs it too (`everyEdit`), so the tool, not a hand edit, keeps them there
 ****************/
export class CommitsLast implements Migration {
  readonly name = "commits-last"
  readonly kind = "epic"
  readonly date = "2026-11-26"
  readonly everyEdit = true
  readonly description = "an item's commits after its text, as the content model lists them"

  /** Move every item's commits in `document` to its end, IN PLACE;  did it change the page? */
  run(document: Document, context: MigrationContext): boolean {
    const moved: string[] = []
    for (const item of Array.from(document.querySelectorAll("epic-item"))) {
      const commits = Array.from(item.querySelectorAll(":scope > epic-commit"))
      if (!commits.length || !CommitsLast.hasTextAfter(commits[0]!)) continue
      for (const commit of commits) item.append(commit)
      moved.push(item.id.toUpperCase())
    }
    if (moved.length) context.notes?.push(`commits-last:  commits moved after the text:  ${moved.join(", ")}`)
    return moved.length > 0
  }

  /** Does anything but a commit, a slotted child or white space come after `commit`? */
  private static hasTextAfter(commit: Element): boolean {
    for (let node = commit.nextSibling; node; node = node.nextSibling) {
      if (node.nodeType === TEXT_NODE && node.textContent?.trim()) return true
      if (node.nodeType !== ELEMENT_NODE) continue
      const element = node as Element
      if (element.localName !== "epic-commit" && !element.hasAttribute("slot")) return true
    }
    return false
  }
}

/** `Node.ELEMENT_NODE`:  linkedom's `Node` isn't a global in node. */
const ELEMENT_NODE = 1

/** `Node.TEXT_NODE`. */
const TEXT_NODE = 3
