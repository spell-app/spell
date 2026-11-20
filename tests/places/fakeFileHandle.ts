import type { FileHandle, FileRead, KeptFile, PickedFileBrowser, PickedFileMemory } from "spell/places/PickedFilePlace"

/**
 * A file on a fake disk, behind a fake handle, for `PickedFilePlace`'s tests:  each case the P41 spike found.
 * - `permission`:  what the browser says the page may do;  `answer`, what it says when asked
 * - `editElsewhere()`:  another program changing it;  `remove()`:  moved, renamed or deleted (its handle then reads
 *   `NotFoundError`);  `writes`:  every write that reached it
 */
export class FakeFileHandle implements FileHandle {
  /** What the page may do now. */
  permission: PermissionState = "granted"
  /** What asking answers;  default:  yes. */
  answer: PermissionState = "granted"
  /** How many times it was asked. */
  asked = 0
  /** Every text written to it, in order. */
  readonly writes: string[] = []
  /** Its text;  `undefined` once it's gone. */
  private text: string | undefined
  /** When it last changed. */
  private time = 1_000

  constructor(
    readonly name: string,
    text: string
  ) {
    this.text = text
  }

  /** The file now.  - throws `NotFoundError` once it's gone */
  async getFile(): Promise<FileRead> {
    if (this.text === undefined) throw new DOMException("gone", "NotFoundError")
    return readOf(this.name, this.text, this.time)
  }

  async createWritable() {
    return {
      write: async (data: string | Uint8Array) => {
        this.text = typeof data === "string" ? data : new TextDecoder().decode(data)
      },
      close: async () => {
        this.writes.push(this.text!)
        this.time++
      }
    }
  }

  async queryPermission(): Promise<PermissionState> {
    return this.permission
  }

  async requestPermission(): Promise<PermissionState> {
    this.asked++
    this.permission = this.answer
    return this.answer
  }

  /** Another program changes it. */
  editElsewhere(text: string): void {
    this.text = text
    this.time += 10
  }

  /** Moved, renamed or deleted. */
  remove(): void {
    this.text = undefined
  }

  /** Its text now. */
  get contents(): string | undefined {
    return this.text
  }
}

/** A plain file, as Safari and Firefox give one:  no handle. */
export function plainFile(name: string, text: string): FileRead {
  return readOf(name, text, 1_000)
}

/** A file read, as the browser's `File` answers. */
function readOf(name: string, text: string, time: number): FileRead {
  const bytes = new TextEncoder().encode(text)
  return {
    name,
    lastModified: time,
    size: bytes.length,
    text: async () => text,
    arrayBuffer: async () => bytes.buffer as ArrayBuffer
  }
}

/** A browser that hands out what a test says, and remembers what it was asked. */
export class FakeBrowser implements PickedFileBrowser {
  /** What the picker gives next. */
  picks: (FileHandle | FileRead | undefined)[] = []
  /** What the save picker gives next. */
  newFiles: (FileHandle | undefined)[] = []
  /** Every download, its name and text. */
  readonly downloads: { name: string; text: string }[] = []
  /** Who hears the tab come back. */
  private readonly tabListeners = new Set<() => void>()

  constructor(readonly canPickHandles = true) {}

  async pickFile() {
    return this.picks.shift()
  }

  async pickNewFile() {
    return this.newFiles.shift()
  }

  download(name: string, data: string | Uint8Array): void {
    this.downloads.push({ name, text: typeof data === "string" ? data : new TextDecoder().decode(data) })
  }

  onTabShown(listener: () => void): () => void {
    this.tabListeners.add(listener)
    return () => this.tabListeners.delete(listener)
  }

  observe() {
    return undefined
  }

  /** The tab comes back into view. */
  showTab(): void {
    for (const listener of this.tabListeners) listener()
  }
}

/** A place's memory kept in a test, like the browser's database:  `kept` is what a reload would find. */
export class FakeMemory implements PickedFileMemory {
  kept: KeptFile | undefined
  aside: string | Uint8Array | undefined
  downloaded = false

  async load() {
    return this.kept && { ...this.kept }
  }
  async save(kept: KeptFile) {
    this.kept = { ...kept }
  }
  async setAside(data: string | Uint8Array) {
    this.aside = data
  }
  async setAsideData() {
    return this.aside
  }
  async hasDownloaded() {
    return this.downloaded
  }
  async noteDownloaded() {
    this.downloaded = true
  }
}
