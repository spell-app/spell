import { LSP } from "spell/app/lsp"
import { SourceEdits } from "spell/app/lsp/SourceEdits"
import { editor } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { PageJobs, type PageJob } from "./PageJobs"
import { SiteEdits, type SitePart } from "./SiteEdits"

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

  /**
   * Take part `name` out of the site, and a page's own declaration with it.
   * - A page with pages under it asks first, naming them:  "Delete films page and its 1 page(s) under it (Film)?"
   *   (Owen, on J20);
   *   yes takes them all, as ONE step of the editor's history.
   * - Answers whether it was taken out.  NEVER throws.
   */
  static async removePart(name: string): Promise<boolean> {
    const file = SiteWrites.siteFile()
    let under: SitePart[] = []
    try {
      under = file ? SiteEdits.allParts(SiteEdits.partNamed(file.contents ?? "", name).parts) : []
    } catch (error) {
      editor.showError(error)
      return false
    }
    if (under.length) {
      const pages = under.map((part) => part.title ?? part.name).join(", ")
      const message = appTexts.text("siteRemoveWithPages", { name, count: under.length, pages })
      if (!(await editor.confirm({ message, ok: appTexts.text("siteRemoveAll") }))) return false
    }
    return SiteWrites.change(appTexts.text("siteRemovePart", { name }), undefined, (text) =>
      SiteEdits.withPartRemoved(text, name)
    )
  }

  /**
   * Call part `name` `newName`:  in the site's list, in its own declaration, and in every line naming it,
   * `go to the films page`, `show ...`, `the address of ...`, in every file of the project (T13).
   * - ONE step of the editor's history, however many files it changes.
   * - NEVER throws:  a name refused shows in the error banner.
   */
  static renamePart(name: string, newName: string): boolean {
    const file = SiteWrites.siteFile()
    const project = editor.project
    if (!file || !project) return false
    const wanted = newName.trim().replace(/\s+/g, " ")
    let siteText: string
    try {
      siteText = SiteEdits.withPartRenamed(file.contents ?? "", name, wanted)
    } catch (error) {
      editor.showError(error)
      return false
    }
    if (siteText === file.contents) return false
    // every use, by the parse:  its words' place in each file, as it was before the rename
    const uses = new Map<SiteFile, Array<{ start: number; end: number }>>()
    for (const { file: at, match } of LSP.SpellLanguageService.sitePartUses(project, name)) {
      const written = project.files.find((each) => each.path === at.path)
      const span = written && SiteWrites.nameSpanIn(written.contents ?? "", match, name)
      if (span) uses.set(written, [...(uses.get(written) ?? []), span])
    }
    const title = appTexts.text("siteRenamePart", { name, newName: wanted })
    editor.history.transaction(title, () => {
      // the site's file:  its uses first, by their places, then its list and declaration, found by their text
      const renamed = SiteWrites.withNamesReplaced(file.contents ?? "", uses.get(file) ?? [], wanted)
      SiteWrites.changeText(file, title, undefined, () => SiteEdits.withPartRenamed(renamed, name, wanted))
      for (const [at, spans] of uses) {
        if (at !== file)
          SiteWrites.changeText(at, title, undefined, (text) => SiteWrites.withNamesReplaced(text, spans, wanted))
      }
    })
    return true
  }

  /** Page `name`'s jobs, from the file that declares it;  `undefined` when no file of this project does. */
  static jobsOf(name: string): PageJob[] | undefined {
    const file = SiteWrites.declaringFile(name)
    return file && PageJobs.of(file.contents ?? "", name)
  }

  /**
   * Page `name`'s jobs made `jobs`, in the file that declares it:  ONE step of the editor's history (P6).
   * - NEVER throws:  a page no file here declares shows in the error banner.
   */
  static changeJobs(name: string, jobs: readonly PageJob[]): boolean {
    const file = SiteWrites.declaringFile(name)
    if (!file) {
      editor.showNotice(appTexts.text("siteJobsElsewhere", { name }))
      return false
    }
    return SiteWrites.changeText(file, appTexts.text("siteChangeJobs", { name }), undefined, (text) =>
      PageJobs.withJobs(text, name, jobs)
    )
  }

  /** The project's file declaring page `name`:  the site's own, else another of its files;  none for an imported page. */
  static declaringFile(name: string): SiteFile | undefined {
    const files = editor.project?.files ?? []
    const site = SiteWrites.siteFile()
    return [...(site ? [site] : []), ...files.filter((file) => file !== site)].find(
      (file) => !!SiteEdits.declarationOf(file.contents ?? "", name)
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
    return SiteWrites.changeText(file, title, then, edit)
  }

  /** `change()`, for any of the project's files:  `edit` made to `file`, as one step, then a compile. */
  static changeText(
    file: SiteFile,
    title: string,
    then: (() => void) | undefined,
    edit: (text: string) => string
  ): boolean {
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

  /**
   * Where the words naming `name` are in `text`, from `words`, a use's match:  inside its quotes, if quoted.
   * - none when they aren't there:  the file changed since its parse
   */
  private static nameSpanIn(text: string, words: { start?: number; end?: number }, name: string) {
    if (words.start === undefined || words.end === undefined) return undefined
    const at = text.slice(words.start, words.end).indexOf(name)
    return at < 0 ? undefined : { start: words.start + at, end: words.start + at + name.length }
  }

  /** `text` with each of `spans` replaced by `newName`, the last first, so the others stay where they are. */
  private static withNamesReplaced(text: string, spans: readonly { start: number; end: number }[], newName: string) {
    let after = text
    for (const { start, end } of [...spans].sort((a, b) => b.start - a.start))
      after = after.slice(0, start) + newName + after.slice(end)
    return after
  }
}

/** A file of the editor's project. */
type SiteFile = NonNullable<typeof editor.project>["files"][number]
