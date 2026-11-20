/**
 * Reading files dragged in from the desktop:  what a drag holds while it moves, and what a drop gave, folders walked.
 * - Plain DOM, no Solid, no element:  `<ui-uploader>` reads its drops with it, and so does a Spell view that takes
 *   files (app's `SpellElement`, epic `language` P67), so both send the same events with the same detail.
 * - Imported by file, `spell/ui/components/ui-uploader/DroppedFiles`:  the family's barrel defines the tag.
 */

/****************
 * ### `DroppedFiles`
 * The ONE reading of a desktop drag and drop, for every element that takes files.
 * - `hasFiles()`, `dragDetail()` while it's dragged;  `itemsOf()` the moment it's dropped, then `arrivalFromDrop()`
 * - `fileDetail()` and `folderDetail()`:  what `ui-file-dropped` and `ui-folder-dropped` carry
 * - STATIC and instance-free on purpose:  it holds nothing between events.
 ****************/
export class DroppedFiles {
  /** Does the drag hold files? */
  static hasFiles(event: DragEvent): boolean {
    return !!event.dataTransfer?.types.includes("Files")
  }

  /** A drag's detail:  how many files, and their kinds;  a browser shows no names or sizes until the drop. */
  static dragDetail<V extends string>(event: DragEvent, via: V): DragDetail<V> {
    const items = [...(event.dataTransfer?.items ?? [])].filter((item) => item.kind === "file")
    return { count: items.length, kinds: items.map((item) => item.type), via }
  }

  /**
   * The drop's items, read while its event lasts:  each one's file, entry and handle (the handle a promise).
   * - MUST be called in the `drop` event itself:  the browser empties its data after.
   * - `getAsFileSystemHandle()` is Chrome's and Edge's only;  `webkitGetAsEntry()` every browser's.
   */
  static itemsOf(transfer: DataTransfer | null): DroppedItem[] {
    if (!transfer) return []
    const items = [...transfer.items].filter((item) => item.kind === "file")
    if (!items.length) return [...transfer.files].map((file) => ({ file }))
    return items.map((item) => {
      const withHandle = item as DataTransferItem & { getAsFileSystemHandle?: () => Promise<FileSystemHandle | null> }
      return {
        file: item.getAsFile() ?? undefined,
        entry: item.webkitGetAsEntry?.() ?? undefined,
        handle: withHandle.getAsFileSystemHandle?.().catch(() => null)
      }
    })
  }

  /** What a drop gave:  its files, and its folders walked, each file with its path in its folder. */
  static async arrivalFromDrop<V extends string>(items: DroppedItem[], via: V): Promise<Arrival<V>> {
    const arrival: Arrival<V> = { via, files: [], folders: [] }
    for (const item of items) {
      const handle = (await item.handle) ?? undefined
      const { entry } = item
      if (entry?.isDirectory) {
        const files = await DroppedFiles.filesIn(entry as FileSystemDirectoryEntry)
        arrival.folders.push({ name: entry.name, path: entry.name, files, entry, handle })
      } else if (item.file) {
        arrival.files.push({ file: item.file, path: item.file.name, entry, handle })
      }
    }
    return arrival
  }

  /** Every file in a dropped folder, and its folders, each with its path from the folder dropped. */
  static async filesIn(folder: FileSystemDirectoryEntry): Promise<Taken[]> {
    const files: Taken[] = []
    const reader = folder.createReader()
    // `readEntries()` gives a batch at a time, until an empty one
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject))
      if (!batch.length) break
      for (const entry of batch) {
        if (entry.isDirectory) files.push(...(await DroppedFiles.filesIn(entry as FileSystemDirectoryEntry)))
        else {
          const file = await new Promise<File>((resolve, reject) =>
            (entry as FileSystemFileEntry).file(resolve, reject)
          )
          files.push({ file, path: entry.fullPath.replace(/^\//, ""), entry })
        }
      }
    }
    return files
  }

  /** A file's events' detail:  `ui-file-dropping`, `ui-file-dropped`. */
  static fileDetail<V extends string>({ file, path, entry, handle, reason }: Taken, via: V) {
    const { name, size, type, lastModified } = file
    return { file, name, path, size, type, lastModified, via, reason, entry, handle }
  }

  /** A folder's events' detail:  `ui-folder-dropping`, `ui-folder-dropped`. */
  static folderDetail<V extends string>({ name, path, files, entry, handle }: TakenFolder, via: V) {
    return {
      name,
      path,
      files: files.map((each) => each.file),
      via,
      reason: undefined as string | undefined,
      entry,
      handle
    }
  }
}

/** What a drag's events carry while it moves:  `ui-file-dragged-over`, `ui-file-dragged-out`. */
export type DragDetail<V extends string = string> = {
  /** how many files */
  count: number
  /** their kinds, e.g. `image/png`:  `""` when the browser doesn't say */
  kinds: string[]
  /** how they came:  the element's word, e.g. `drop` */
  via: V
}

/** A file taken in, before it's checked. */
export type Taken = {
  /** the browser's own file */
  file: File
  /** its path in the folder dropped;  its name, for a file on its own */
  path: string
  /** its entry, on any drop */
  entry?: FileSystemEntry
  /** its handle, on a drop in Chrome and Edge */
  handle?: FileSystemHandle
  /** why it's turned away, once checked:  short, for its row */
  reason?: string
  /** why it's turned away, in a full sentence */
  why?: string
}

/** A folder taken in, with its files. */
export type TakenFolder = {
  /** its name */
  name: string
  /** its path:  its name, for the folder dropped */
  path: string
  /** every file in it, its folders' too */
  files: Taken[]
  /** its entry */
  entry?: FileSystemEntry
  /** its handle, in Chrome and Edge */
  handle?: FileSystemHandle
}

/** Everything that came in at once. */
export type Arrival<V extends string = string> = { via: V; files: Taken[]; folders: TakenFolder[] }

/** A drop's item, read while its event lasted. */
export type DroppedItem = {
  /** its file;  none for a folder in some browsers */
  file?: File
  /** its entry, which says whether it's a folder */
  entry?: FileSystemEntry
  /** its handle, a promise, in Chrome and Edge */
  handle?: Promise<FileSystemHandle | null>
}
