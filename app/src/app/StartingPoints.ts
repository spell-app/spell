/****************
 * ### `StartingPoints`
 * Each file's text as it was when its project was opened:  what "Discard Changes" goes back to in the public preview
 * (`editor.discardChanges()`);  elsewhere it deletes your draft (epic `editor` P24).
 * - With AutoSave on, what's saved is already the latest, so this is the only way back to before you started trying things.
 * - Kept for the open tab, in the browser, so a reload doesn't lose it:  opening another project starts afresh.
 * - Plain data:  no Solid, no editor.
 * - NEVER throws:  storage that's full or blocked means it lasts only until a reload.
 ****************/
export class StartingPoints {
  /** The project they're for, and each file's text, by its path. */
  private kept: { project?: string; texts: Record<string, string> } = StartingPoints.read()

  /** Note `files`, of project `project`, at the text each has now:  a file noted already stays as it was. */
  note(project: string, files: readonly { path: string; contents?: string | null }[]): void {
    if (this.kept.project !== project) this.kept = { project, texts: {} }
    let changed = false
    for (const { path, contents } of files) {
      if (typeof contents !== "string" || path in this.kept.texts) continue
      this.kept.texts[path] = contents
      changed = true
    }
    if (changed) StartingPoints.write(this.kept)
  }

  /** The text file `path` started at:  `undefined` if it wasn't noted. */
  of(path: string): string | undefined {
    return this.kept.texts[path]
  }

  /** What this tab kept. */
  private static read(): StartingPoints["kept"] {
    try {
      const text = sessionStorage.getItem(STORAGE_KEY)
      return text ? (JSON.parse(text) as StartingPoints["kept"]) : { texts: {} }
    } catch (ignored) {
      return { texts: {} }
    }
  }

  /** Keep `kept` for this tab. */
  private static write(kept: StartingPoints["kept"]): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(kept))
    } catch (ignored) {
      // too big, or blocked:  it lasts until a reload
    }
  }
}

/** Where a tab keeps them. */
const STORAGE_KEY = "spellEditor:startingPoints"
