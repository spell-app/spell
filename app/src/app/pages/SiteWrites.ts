import { SourceEdits } from "spell/app/lsp/SourceEdits"
import { editor } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { SiteEdits } from "./SiteEdits"

/****************
 * ### `SiteWrites`
 * A site changed from the site editor and the not found page (epic `mockup` P4):  each change written into the site's
 * file, as ONE step of the editor's history, so it saves, undoes and redoes as any edit does.
 * - Shaped like the Inspector's writer (`InspectorWrites`):  what to change comes in, `editor.history` takes it.
 * - The text itself is `SiteEdits`':  plain text in, text out.
 * - Each change compiles the program behind it:  a page added is taken by the running site as it runs (J15, A),
 *   so the run goes on, at the new page;  a page taken out or renamed waits for Restart, as any such edit does.
 * - Every method NEVER throws:  what can't be done is said in the editor's error banner.
 * - Static and instance-free on purpose:  the site file is the editor's project's, found each time.
 ****************/
export class SiteWrites {
  /** The current project's file that declares its site:  none for a project that isn't a site. */
  static siteFile(): SiteFile | undefined {
    return editor.project?.files.find((file) => SiteEdits.hasSite(file.contents ?? ""))
  }

  /** The current project's site's parts, as its file has them now:  none for a project that isn't a site. */
  static parts(): ReturnType<typeof SiteEdits.partsIn> {
    const file = SiteWrites.siteFile()
    return file && SiteEdits.partsIn(file.contents ?? "")
  }

  /**
   * Add a page at `address`, named from it (`/planets/tatooine` => `tatooine page`), titled `title` if given.
   * - `then`:  once it's compiled, e.g. the running site shows it.
   * - Answers its name, for the caller to pick it;  none when it couldn't be added.
   */
  static addPage(address: string, title?: string, then?: () => void): string | undefined {
    let name: string | undefined
    const changed = SiteWrites.change(appTexts.text("siteCreatePage", { address }), then, (text) => {
      name = SiteEdits.pageNameFor(
        address,
        SiteEdits.allParts(SiteEdits.partsIn(text) ?? []).map((part) => part.name)
      )
      const added = SiteEdits.withPageAdded(text, name, address)
      return title ? SiteEdits.withPartChanged(added, name, { title }) : added
    })
    return changed ? name : undefined
  }

  /** Take part `name` out of the site, and a page's own declaration with it. */
  static removePart(name: string): boolean {
    return SiteWrites.change(appTexts.text("siteRemovePart", { name }), undefined, (text) =>
      SiteEdits.withPartRemoved(text, name)
    )
  }

  /** Call part `name` `newName`. */
  static renamePart(name: string, newName: string): boolean {
    return SiteWrites.change(appTexts.text("siteRenamePart", { name, newName }), undefined, (text) =>
      SiteEdits.withPartRenamed(text, name, newName)
    )
  }

  /** Change page `name`'s address or title. */
  static changePart(name: string, change: { address?: string; title?: string }): boolean {
    return SiteWrites.change(appTexts.text("siteChangePart", { name }), undefined, (text) =>
      SiteEdits.withPartChanged(text, name, change)
    )
  }

  /** Move part `name`, with its pages, to just before part `before`;  none:  last in the site. */
  static movePart(name: string, before?: string): boolean {
    return SiteWrites.change(appTexts.text("siteMovePart", { name }), undefined, (text) =>
      SiteEdits.withPartMoved(text, name, before)
    )
  }

  /**
   * Make `edit` to the site's file as one step of the editor's history, then compile:  `true` when it was made.
   * - `title`:  the step's, as Undo's menu names it.
   * - `then`:  after it's compiled, and again after each undo and redo, e.g. show the new page.
   * - NEVER throws:  no site file, or an edit `SiteEdits` refuses, shows in the error banner.
   */
  static change(title: string, then: (() => void) | undefined, edit: (text: string) => string): boolean {
    const file = SiteWrites.siteFile()
    if (!file) {
      editor.showNotice(appTexts.text("siteNoSiteFile"))
      return false
    }
    const before = file.contents ?? ""
    let after: string
    try {
      after = edit(before)
    } catch (error) {
      editor.showError(error)
      return false
    }
    if (after === before) return false
    const { span, newText } = SourceEdits.editBetween(before, after)
    editor.history.change(
      { file, at: span.start, before: before.slice(span.start, span.end), after: newText },
      { title, live: () => SiteWrites.compileBehind(then) }
    )
    SiteWrites.compileBehind(then)
    return true
  }

  /**
   * Compile the project now, so the running site follows the change;  then `then()`, e.g. show the new page.
   * - NEVER throws:  a failure shows in the error banner.
   */
  static compileBehind(then?: () => void): void {
    void editor
      .compileApp()
      .then(() => then?.())
      .catch((error: unknown) => editor.showError(error))
  }
}

/** A file of the editor's project. */
type SiteFile = NonNullable<typeof editor.project>["files"][number]
