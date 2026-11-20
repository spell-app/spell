import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UI } from "spell/ui/core"
import { DroppedFiles, type Arrival as DropArrival, type Taken, type TakenFolder } from "./DroppedFiles"
import { uploaderVocabulary } from "./UIUploader.en"

import uploaderCSS from "./UIUploader.css?inline"

/****************
 * ### `DOMUploaderElement`
 * The `<ui-uploader>` in the page:  a few members of script API over its component.
 ****************/
export class DOMUploaderElement extends E.DOMElement<UIUploader> {
  /** The files it holds now, kept or turned away, in the order they came. */
  @E.untracked get files(): File[] {
    return this.component?.rows.map((row) => row.file) ?? []
  }

  /** Open the file dialog, as its button does.  The browser opens it only from a person's click or key. */
  open(): void {
    this.component?.openDialog()
  }

  /** Forget every file it holds, stopping any post still going. */
  clear(): void {
    this.component?.clear()
  }
}

/****************
 * ### `<ui-uploader>`
 * The component behind `<ui-uploader>`:  takes files someone picks or drops, or whole folders,
 * then posts them to its `destination`, or hands them to its `action`.
 *
 * - What happens when files come in, picked in the file dialog or dropped (`take()`):
 *   1. Each is checked:  a kind it doesn't take, too big, or past the count is turned away, with its reason.
 *   2. `ui-file-dropping` (cancel to leave it out), then `ui-file-dropped`, for each;
 *      a `folder` uploader sends `ui-folder-dropping` / `-dropped` for each folder first, then its files'.
 *   3. `ui-uploading`, with the files kept:  a handler that cancels it takes the upload over.
 *   4. `action` set:  it's called with them.  Else `destination` set:  each file is posted there, one request each,
 *      so each row shows its own progress and failure.  Neither:  it only holds them.
 * - The events are the same for a pick as for a drop:  their detail's `via` says which.
 * - Four looks, `appearance`, each drawn from Spell UI's own elements:
 *   - `hero`:  a placeholder `<ui-segment>` as its drop area, a row per file under it
 *     (a `<ui-list>`, a `<ui-item>` per file)
 *   - `button`:  a `<ui-button>`, its file rows in a `<ui-popup>`:  a glimpse as an upload starts,
 *     then on hover or focus
 *   - `input`:  a read-only `<ui-input>` with a Browse `<ui-button>` joined to it, its rows under it
 *   - `compact`:  a one-line drop area, a line of status and one `<ui-progress>` for every file
 * - `drop-zone`:  a drop elsewhere counts too (`page`, a selector, an element);  `DropZones` decides which uploader.
 * - The file dialog is the browser's:  a hidden `<ui-input type="file">` opens it (`openDialog()`),
 *   for every look, with its `showPicker()`;  its `folder` picks folders.
 * - Posting is `XMLHttpRequest`'s:  `fetch()` can't tell how far an upload has got.
 *   A failure is an `ApiError`, the same shape `UI.api` throws.
 * - NEVER imports Spell's own words:  the bridge into Spell's events is the parser's core's (Q14).
 ****************/
export class UIUploader extends E.UIComponent<typeof uploaderVocabulary> {
  @E.proto static vocabulary = uploaderVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { uploader: uploaderCSS },
    DOMElement: DOMUploaderElement
  } satisfies Partial<E.ElementSetup>

  /** Its look:  `hero` unless it says otherwise. */
  get look(): Appearance {
    const appearance = this.appearance as Appearance | undefined
    return appearance && APPEARANCES.includes(appearance) ? appearance : HERO
  }

  /** Its states:  its look, a drag over it, a post going on. */
  protected cssStates() {
    return {
      hero: this.look === HERO,
      button: this.look === BUTTON,
      input: this.look === INPUT,
      compact: this.look === COMPACT,
      "dragged-over": this.isDraggedOver,
      uploading: this.isUploading
    }
  }

  ////////////////
  // ## What it takes
  ////////////////

  /** The extensions it takes, without their dots:  `["json", "csv"]`;  empty, any. */
  get kinds(): string[] {
    return E.commaList(this.extensions).map((kind) => kind.replace(/^\./, "").toLowerCase())
  }

  /** The kinds for people:  `.json`, `.json, .csv`. */
  get kindsText(): string {
    return this.kinds.map((kind) => `.${kind}`).join(", ")
  }

  /** The file input's `accept`:  `.json,.csv`. */
  private get accept(): string | undefined {
    return this.kinds.length ? this.kinds.map((kind) => `.${kind}`).join(",") : undefined
  }

  /** The largest file it takes, in bytes;  `undefined`, any size. */
  get largest(): number | undefined {
    return UIUploader.bytesFor(this.maxSize)
  }

  /** Why `file` would be turned away, before the count:  its kind or its size;  `undefined`, it's fine. */
  private reasonFor(file: File): Refusal | undefined {
    const { kinds, largest } = this
    const extension = /\.([^./]+)$/.exec(file.name)?.[1]?.toLowerCase()
    if (kinds.length && (!extension || !kinds.includes(extension))) {
      return this.refusal("wrongKind", "wrongKindLong", { kinds: this.kindsText })
    }
    if (largest !== undefined && file.size > largest) {
      return this.refusal("tooBig", "tooBigLong", { size: this.maxSizeText })
    }
    return undefined
  }

  /** Why a file is turned away:  its row's short words, and the full sentence for its tooltip. */
  private refusal(short: RefusalKey, full: RefusalKey, params?: Record<string, string | number>): Refusal {
    return { reason: this.translationForKey(short, params), why: this.translationForKey(full, params) }
  }

  /** `max-size` for people:  `2 MB`. */
  private get maxSizeText(): string {
    const { largest } = this
    return largest === undefined ? "" : this.sizeText(largest)
  }

  /** Its limits, under the hero's button:  `Up to 5 files, 2 MB each`;  empty for none. */
  get limitsText(): string {
    const count = this.maxFiles
    const size = this.maxSizeText
    if (count && size) return this.translationForKey("limitsBoth", { count, size })
    if (count) return this.translationForKey("limitsFiles", { count })
    if (size) return this.translationForKey("limitsSizeOnly", { size })
    return ""
  }

  /** `bytes` for people:  `96 KB`, `1.2 MB`. */
  sizeText(bytes: number): string {
    const [unit, size] = bytes >= MB ? (["MB", MB] as const) : bytes >= KB ? (["KB", KB] as const) : ["B", 1]
    const digits = unit === "MB" && bytes / size < 10 ? 1 : 0
    return `${UI.i18n.formatNumber(bytes / size, { maximumFractionDigits: digits })} ${unit}`
  }

  ////////////////
  // ## The files
  ////////////////

  /** A row per file taken, kept or turned away, in the order they came. */
  @E.state accessor rows: readonly FileRow[] = []

  /** The rows of the files kept:  not turned away. */
  get keptRows(): FileRow[] {
    return this.rows.filter((row) => row.status !== TURNED_AWAY)
  }

  /** How many are posted, or handed to the action. */
  get doneCount(): number {
    return this.rows.filter((row) => row.status === UPLOADED || row.status === TAKEN).length
  }

  /** How many were turned away. */
  get turnedAwayCount(): number {
    return this.rows.filter((row) => row.status === TURNED_AWAY).length
  }

  /** Is a post going on, or the action running? */
  get isUploading(): boolean {
    return this.rows.some((row) => row.status === WAITING || row.status === UPLOADING)
  }

  /** How far every file kept has got, 0 to 100:  compact's one bar. */
  get overallPercent(): number {
    const rows = this.keptRows
    const size = rows.reduce((sum, row) => sum + row.file.size, 0)
    if (!size) return this.isUploading ? 0 : 100
    const sent = rows.reduce(
      (sum, row) => sum + (row.status === UPLOADING ? row.sent : DONE.has(row.status) ? row.file.size : 0),
      0
    )
    return Math.round((100 * sent) / size)
  }

  /** Change the row `id` (a new record, so its `<For>` row redraws). */
  private changeRow(id: number, changes: Partial<FileRow>) {
    this.rows = this.rows.map((row) => (row.id === id ? { ...row, ...changes } : row))
  }

  /** The row `id`, as it is now. */
  private rowFor(id: number): FileRow | undefined {
    return this.rows.find((row) => row.id === id)
  }

  /** Remove a row, stopping its post if it's still going. */
  @E.untracked
  remove(id: number) {
    this.requests.get(id)?.abort()
    this.requests.delete(id)
    this.rows = this.rows.filter((row) => row.id !== id)
  }

  /** Forget every file, stopping every post still going. */
  @E.untracked
  clear() {
    for (const request of this.requests.values()) request.abort()
    this.requests.clear()
    this.rows = []
  }

  ////////////////
  // ## Taking files in
  ////////////////

  /**
   * Take what came in:  check each file, send the events before and after, add the rows, then upload.
   * - SIDE EFFECT:  without `multiple`, what it held before is replaced.
   * - NEVER throws:  a post that fails shows on its row.
   */
  @E.untracked
  async take(arrival: Arrival): Promise<void> {
    if (this.isDisabled) return
    const { via } = arrival
    const isFolderUploader = !!this.folder
    if (!this.multiple) this.clear()
    const turnedAway = (taken: Taken, refusal: Refusal): Taken => ({ ...taken, ...refusal })
    const folders = isFolderUploader ? arrival.folders : []
    const files: Taken[] = []
    // a plain file on a folder uploader, a folder on a plain one:  turned away
    for (const stray of isFolderUploader ? arrival.files : arrival.folders.map(UIUploader.folderAsFile)) {
      const refusal = isFolderUploader
        ? this.refusal("notAFolder", "notAFolderLong")
        : this.refusal("aFolder", "aFolderLong")
      files.push(turnedAway(stray, refusal))
    }
    if (!isFolderUploader) files.unshift(...arrival.files)

    // the folders, and their files
    let kept = this.keptRows.length
    const checked = (taken: Taken): Taken => {
      if (taken.reason) return taken
      const refusal = this.reasonFor(taken.file)
      if (refusal) return turnedAway(taken, refusal)
      if (!this.multiple && !isFolderUploader && kept >= 1) {
        return turnedAway(taken, this.refusal("oneOnly", "oneOnlyLong"))
      }
      if (this.maxFiles && kept >= this.maxFiles) {
        return turnedAway(taken, this.refusal("tooMany", "tooManyLong", { count: this.maxFiles }))
      }
      kept++
      return taken
    }

    const taken: Taken[] = []
    for (const [index, folder] of folders.entries()) {
      const detail = { ...DroppedFiles.folderDetail(folder, via) }
      if (!this.multiple && index > 0) {
        const refusal = this.refusal("oneOnly", "oneOnlyLong")
        detail.reason = refusal.reason
        for (const file of folder.files) taken.push(turnedAway(file, refusal))
        continue
      }
      if (!this.send("ui-folder-dropping", detail)) continue
      this.send("ui-folder-dropped", detail)
      taken.push(...folder.files.map(checked))
    }
    taken.push(...files.map(checked))

    // each file, before and after
    const rows: FileRow[] = []
    for (const file of taken) {
      const detail = DroppedFiles.fileDetail(file, via)
      if (!this.send("ui-file-dropping", detail)) {
        if (!file.reason) kept--
        continue
      }
      this.send("ui-file-dropped", detail)
      rows.push({
        id: ++lastRowId,
        file: file.file,
        path: file.path,
        status: file.reason ? TURNED_AWAY : WAITING,
        sent: 0,
        reason: file.reason,
        why: file.why
      })
    }
    if (!rows.length) return
    this.rows = [...this.rows, ...rows]
    await this.upload(rows.filter((row) => row.status === WAITING))
  }

  /** A folder turned away by a plain uploader, as a file for its row. */
  private static folderAsFile(folder: TakenFolder): Taken {
    return { file: new File([], folder.name), path: folder.path, entry: folder.entry, handle: folder.handle }
  }

  ////////////////
  // ## Uploading
  ////////////////

  /** The posts going on, by row id:  each one's request, to stop it. */
  private readonly requests = new Map<number, XMLHttpRequest>()

  /** Have both `action` and `destination` been warned about? */
  private warnedBoth = false

  /**
   * `ui-uploading`, then the action, the posts, or nothing.
   * - A cancelled `ui-uploading`, or neither set:  the rows are held.
   */
  private async upload(rows: FileRow[]): Promise<void> {
    if (!rows.length) return
    const files = rows.map((row) => row.file)
    const action = typeof this.action === "function" ? (this.action as UploadAction) : undefined
    const { destination } = this
    if (!this.send("ui-uploading", { files }) || (!action && !destination)) {
      for (const row of rows) this.changeRow(row.id, { status: HELD })
      return
    }
    if (action && destination && !this.warnedBoth) {
      this.warnedBoth = true
      E.Warnings.warn(
        "<ui-uploader>",
        "both `action` and `destination` are set:  the action takes the files",
        this.domElement
      )
    }
    if (action) return this.callAction(action, rows)
    await Promise.all(rows.map((row) => this.post(row, destination!)))
  }

  /** Hand the files to the action:  every row done when it's done, or failed with what it threw. */
  private async callAction(action: UploadAction, rows: FileRow[]) {
    for (const row of rows) this.changeRow(row.id, { status: UPLOADING })
    try {
      const response = await action(rows.map((row) => row.file))
      for (const row of rows) {
        if (!this.rowFor(row.id)) continue
        this.changeRow(row.id, { status: TAKEN })
        this.send("ui-uploaded", { file: row.file, response })
      }
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error))
      for (const row of rows) {
        if (!this.rowFor(row.id)) continue
        this.changeRow(row.id, { status: FAILED, reason: failure.message })
        this.send("ui-upload-failed", { file: row.file, error: failure })
      }
    }
  }

  /**
   * Post one file to `destination`, as form data:  its row follows how far it's got.
   * - NEVER throws:  a failure shows on its row, and in `ui-upload-failed`.
   */
  private post(row: FileRow, destination: string): Promise<void> {
    const { file, id } = row
    const request = new XMLHttpRequest()
    this.requests.set(id, request)
    this.changeRow(id, { status: UPLOADING })
    return new Promise<void>((resolve) => {
      request.upload.addEventListener("progress", (event) => {
        if (!this.rowFor(id)) return
        this.changeRow(id, { sent: event.loaded })
        this.send("ui-upload-progress", { file, sent: event.loaded, size: event.total || file.size })
      })
      request.addEventListener("loadend", () => {
        this.requests.delete(id)
        if (this.rowFor(id) && request.readyState === XMLHttpRequest.DONE && request.status !== 0) {
          this.posted(row, request, destination)
        } else if (this.rowFor(id)) {
          this.failed(
            row,
            new Error(`<ui-uploader>:  couldn't reach ${destination}`),
            this.translationForKey("noConnection")
          )
        }
        resolve()
      })
      const data = new FormData()
      data.append(FORM_FIELD, file, row.path || file.name)
      request.open("POST", destination)
      request.send(data)
    })
  }

  /** A post answered:  OK, `ui-uploaded` with the answer;  else failed, an `ApiError` as `UI.api` throws. */
  private posted(row: FileRow, request: XMLHttpRequest, destination: string) {
    const { status } = request
    const type = request.getResponseHeader("content-type") ?? ""
    if (status >= 200 && status < 300) {
      this.changeRow(row.id, { status: UPLOADED, sent: row.file.size })
      this.send("ui-uploaded", { file: row.file, response: UIUploader.answerOf(request.responseText, type) })
      return
    }
    const response = new Response(request.responseText, {
      status,
      statusText: request.statusText,
      headers: { "content-type": type }
    })
    const error = new E.ApiError(
      `<ui-uploader>:  POST ${destination} answered ${status} ${request.statusText}`.trim(),
      {
        cause: { response }
      }
    )
    this.failed(row, error, this.translationForKey("serverError", { status }))
  }

  /** A post failed:  its row says why, and `ui-upload-failed`. */
  private failed(row: FileRow, error: Error, reason: string) {
    this.changeRow(row.id, { status: FAILED, reason })
    this.send("ui-upload-failed", { file: row.file, error })
  }

  /** A server's answer:  JSON when it says so (and parses), else its text. */
  private static answerOf(text: string, type: string): unknown {
    if (!/json/i.test(type)) return text
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  ////////////////
  // ## The file dialog
  ////////////////

  /** The hidden `<ui-input type="file">` that opens the browser's file dialog. */
  private fileInput: FileInputElement | undefined

  /** The file input drawn:  it tells us what was picked. */
  private readonly fileInputDrawn = (input: HTMLElement) => {
    this.fileInput = input as FileInputElement
    input.addEventListener("ui-changed", this.onPicked)
  }

  /**
   * Open the file dialog.  The browser opens it only from a person's click or key.
   * - NEVER throws:  a dialog the browser won't open (no click) is warned about.
   */
  @E.untracked
  openDialog() {
    if (this.isDisabled) return
    try {
      this.fileInput?.showPicker()
    } catch (error) {
      E.Warnings.warn("<ui-uploader>", "the browser wouldn't open the file dialog", error)
    }
  }

  /** A click on its button, or on a page's own in the `button` slot:  the file dialog. */
  private readonly onButtonClick = (event: MouseEvent) => {
    event.preventDefault()
    this.openDialog()
  }

  /**
   * Files picked in the dialog:  taken, then the input emptied, so the same file can be picked again.
   * - Its `ui-changed` stops here:  it's composed, and the page hears the uploader's own events instead.
   */
  @E.untracked
  private readonly onPicked = (event: Event) => {
    event.stopPropagation()
    const input = event.currentTarget as FileInputElement
    const picked = [...input.files]
    if (!picked.length) return
    input.value = ""
    void this.take(UIUploader.arrivalFromDialog(picked, !!this.folder)).catch((error) =>
      E.Warnings.warn("<ui-uploader>", "couldn't take the files picked", error)
    )
  }

  /** What a dialog gave:  files, or with `folder`, folders, by each file's path in it (`webkitRelativePath`). */
  private static arrivalFromDialog(files: File[], isFolderUploader: boolean): Arrival {
    if (!isFolderUploader) return { via: DIALOG, files: files.map((file) => ({ file, path: file.name })), folders: [] }
    const folders = new Map<string, TakenFolder>()
    for (const file of files) {
      const path = file.webkitRelativePath || file.name
      const name = path.split("/")[0]!
      let folder = folders.get(name)
      if (!folder) folders.set(name, (folder = { name, path: name, files: [] }))
      folder.files.push({ file, path })
    }
    return { via: DIALOG, files: [], folders: [...folders.values()] }
  }

  ////////////////
  // ## Drops
  ////////////////

  /** Are files dragged over it, or its zone? */
  @E.state accessor isDraggedOver = false

  /** How many files are dragged over it, while they are. */
  @E.state accessor draggedCount = 0

  /** Is the drag over its zone, not itself?  Its zone's overlay shows. */
  @E.state accessor isOverZone = false

  /** Ends the drag when no `dragover` comes for a moment:  the files left without a drop. */
  private dragEnd: E.CancelablePromise<void> | undefined

  /** Files are dragged over it:  allow the drop, and say so. */
  @E.on("dragover")
  protected onDragOver(event: DragEvent) {
    if (!DroppedFiles.hasFiles(event) || this.isDisabled) return
    HANDLED.add(event)
    this.draggedOver(event, DROP)
  }

  /** Files dropped on it. */
  @E.on("drop")
  protected onDrop(event: DragEvent) {
    if (!DroppedFiles.hasFiles(event) || this.isDisabled) return
    HANDLED.add(event)
    this.dropped(event, DROP)
  }

  /**
   * Files are dragged over it (`drop`) or its zone (`zone`):  the drop is allowed,
   * and the first `dragover` sends `ui-file-dragged-over` (a `folder` uploader's `ui-folder-dragged-over`).
   */
  @E.untracked
  draggedOver(event: DragEvent, via: typeof DROP | typeof ZONE) {
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy"
    this.dragEnd?.cancel()
    this.dragEnd = E.after(DRAG_LINGER, () => this.dragOver(via))
    this.isOverZone = via === ZONE
    if (this.isDraggedOver) return
    const detail = DroppedFiles.dragDetail(event, via)
    this.isDraggedOver = true
    this.draggedCount = detail.count
    this.send(this.folder ? "ui-folder-dragged-over" : "ui-file-dragged-over", detail)
  }

  /** The drag is over:  dropped, or gone without a drop (`ui-file-dragged-out`). */
  private dragOver(via: typeof DROP | typeof ZONE, wasDropped = false) {
    this.dragEnd?.cancel()
    this.dragEnd = undefined
    if (!this.isDraggedOver) return
    const count = this.draggedCount
    this.isDraggedOver = false
    this.isOverZone = false
    this.draggedCount = 0
    if (!wasDropped) this.send(this.folder ? "ui-folder-dragged-out" : "ui-file-dragged-out", { count, kinds: [], via })
  }

  /** Files dropped on it or its zone:  read what the drop holds (folders walked), then take it. */
  @E.untracked
  dropped(event: DragEvent, via: typeof DROP | typeof ZONE) {
    event.preventDefault()
    this.dragOver(via, true)
    // the items must be read now, while the drop event lasts
    const pending = DroppedFiles.itemsOf(event.dataTransfer)
    void DroppedFiles.arrivalFromDrop(pending, via)
      .then((arrival) => this.take(arrival))
      .catch((error) => E.Warnings.warn("<ui-uploader>", "couldn't read what was dropped", error))
  }

  ////////////////
  // ## Its drop zone
  ////////////////

  /** The element its `drop-zone` names, as it is now:  the page's root for `page`. */
  get zoneElement(): Element | undefined {
    if (isServer) return undefined
    const zone = this.dropZone as unknown
    if (!zone) return undefined
    if (typeof zone === "object" && (zone as Node).nodeType === Node.ELEMENT_NODE) return zone as Element
    if (typeof zone !== "string") return undefined
    if (zone === PAGE) return document.documentElement
    try {
      const around = E.closestAcrossShadow(this.domElement, zone)
      if (around) return around
      const root = this.domElement.getRootNode() as ParentNode
      return root.querySelector(zone) ?? document.querySelector(zone) ?? undefined
    } catch {
      E.Warnings.warn(
        "<ui-uploader drop-zone>",
        `${JSON.stringify(zone)} is no selector:  write \`page\`, or a selector`
      )
      return undefined
    }
  }

  /** While connected:  its zone hands it the drops on it (`DropZones`). */
  @E.onChange("isConnected", "dropZone")
  protected onZoneChanged(isConnected: boolean) {
    if (!isConnected || isServer) return
    const zone = this.zoneElement
    if (!zone) return
    DropZones.add(zone, this)
    return () => DropZones.remove(zone, this)
  }

  /** Where its zone's overlay goes:  over the zone's box, in the window. */
  private get zoneBox(): { top: number; left: number; width: number; height: number } {
    const zone = this.isOverZone ? this.zoneElement : undefined
    if (!zone || zone === document.documentElement) return { top: 0, left: 0, width: innerWidth, height: innerHeight }
    return UIUploader.boxOf(zone)
  }

  /**
   * `element`'s box in the window;  for a host with no box of its own (`display: contents`, as many `<ui-*>` are),
   * the box round what it draws.
   */
  private static boxOf(element: Element): { top: number; left: number; width: number; height: number } {
    const own = element.getBoundingClientRect()
    if (own.width || own.height) return { top: own.top, left: own.left, width: own.width, height: own.height }
    const drawn = [...(element.shadowRoot?.children ?? element.children)]
      .map((child) => child.getBoundingClientRect())
      .filter((box) => box.width || box.height)
    if (!drawn.length) return { top: own.top, left: own.left, width: 0, height: 0 }
    const top = Math.min(...drawn.map((box) => box.top))
    const left = Math.min(...drawn.map((box) => box.left))
    const bottom = Math.max(...drawn.map((box) => box.bottom))
    const right = Math.max(...drawn.map((box) => box.right))
    return { top, left, width: right - left, height: bottom - top }
  }

  /** Show or hide the zone's overlay, in the top layer, as the drag comes and goes. */
  private zoneOverlayDrawn(overlay: HTMLElement) {
    if (isServer || !overlay.showPopover) return
    if (this.isOverZone && !overlay.matches(":popover-open")) overlay.showPopover()
    else if (!this.isOverZone && overlay.matches(":popover-open")) overlay.hidePopover()
  }

  /** Follows the zone's drag:  its overlay shows or hides. */
  @E.onChange("isOverZone", "isReady")
  protected onOverZoneChanged() {
    if (this.zoneOverlay) this.zoneOverlayDrawn(this.zoneOverlay)
  }

  /** The zone's overlay, once drawn. */
  private zoneOverlay: HTMLElement | undefined

  ////////////////
  // ## Its words
  ////////////////

  /** Fill `{name}`s in a page's own message. */
  private static filled(template: string, params: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (whole, name: string) => String(params[name] ?? whole))
  }

  /** Its line of help:  `message`, else its own for its look, naming the kinds it takes. */
  get messageText(): string {
    if (this.message) return this.message
    const kinds = this.kindsText
    const [one, any, folders] =
      this.look === COMPACT
        ? (["compactMessage", "compactMessageAny", "compactMessageFolders"] as const)
        : this.look === BUTTON
          ? (["buttonLabel", "buttonLabelAny", "buttonLabelFolders"] as const)
          : (["message", "messageAny", "messageFolders"] as const)
    if (this.folder) return this.translationForKey(folders)
    return kinds ? this.translationForKey(one, { kinds }) : this.translationForKey(any)
  }

  /** What it says while files are dragged over it. */
  get dropText(): string {
    const count = this.draggedCount
    if (this.dropMessage) return UIUploader.filled(this.dropMessage, { count })
    return count === 1 ? this.translationForKey("dropMessageOne") : this.translationForKey("dropMessage", { count })
  }

  /** What it says while it posts, and once they're all done;  empty before. */
  get statusText(): string {
    const count = this.keptRows.length
    const done = this.doneCount
    if (this.isUploading) {
      if (this.uploadingMessage) return UIUploader.filled(this.uploadingMessage, { done, count })
      return this.translationForKey("uploadingMessage", { done, count })
    }
    if (!done) return ""
    if (this.doneMessage) return UIUploader.filled(this.doneMessage, { count: done })
    return done === 1
      ? this.translationForKey("doneMessageOne")
      : this.translationForKey("doneMessage", { count: done })
  }

  /** How many were turned away, for people;  empty for none. */
  get turnedAwayText(): string {
    const count = this.turnedAwayCount
    if (!count) return ""
    return count === 1 ? this.translationForKey("turnedAwayOne") : this.translationForKey("turnedAway", { count })
  }

  /** A row's status, for people. */
  private statusOf(row: FileRow): string {
    if (row.status === UPLOADED) return this.translationForKey("uploaded")
    if (row.status === TAKEN) return this.translationForKey("taken")
    if (row.status === HELD) return this.translationForKey("held")
    if (row.status === FAILED) return this.translationForKey("failed", { reason: row.reason ?? "" })
    return row.reason ?? ""
  }

  /** The `button` look's label:  what it's doing, else its line of help. */
  private get buttonText(): string {
    if (this.isDraggedOver) return this.dropText
    if (this.isUploading) return this.statusText
    return this.messageText
  }

  /** The `input` look's field:  how many files, and how many are up. */
  private get fieldText(): string {
    const count = this.rows.length
    if (!count || this.isDraggedOver) return ""
    const done = this.doneCount
    return done
      ? this.translationForKey("fileCountDone", { count, done })
      : this.translationForKey("fileCount", { count })
  }

  ////////////////
  // ## The `button` look's popup
  ////////////////

  /** The popup of file rows, once drawn. */
  private popupElement: HTMLElement | undefined

  /** Hides the popup at the end of its glimpse. */
  private popupHide: E.CancelablePromise<void> | undefined

  /** The popup was drawn:  aimed at the button, and a glimpse of it if it's posting. */
  private popupDrawn(popup: HTMLElement & { target?: Element }, button: HTMLElement | undefined) {
    this.popupElement = popup
    if (button) popup.target = button
    if (this.isUploading) this.glimpse(popup)
  }

  /**
   * The `button` look shows its popup for a moment as an upload starts, then only on hover or focus,
   * so it never sits over the page while files post.
   */
  @E.onChange("isUploading")
  protected onUploadingChanged(isUploading: boolean) {
    const popup = this.popupElement
    if (this.look !== BUTTON || !popup || !isUploading) return
    this.glimpse(popup)
  }

  /** Show the popup, then hide it after `POPUP_GLIMPSE`, unless the pointer or the focus is on it, or its button. */
  private glimpse(popup: HTMLElement) {
    this.popupHide?.cancel()
    popup.hidden = false
    this.popupHide = E.after(POPUP_GLIMPSE, () => {
      if (!this.domElement.matches(":hover, :focus-within")) popup.hidden = true
    })
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <>
        <ui-input
          ref={this.fileInputDrawn}
          class="picker"
          type="file"
          hidden=""
          tabindex="-1"
          aria-hidden="true"
          accept={this.folder ? undefined : this.accept}
          multiple={!!this.multiple || !!this.folder}
          folder={!!this.folder}
        />
        <Show when={this.look === BUTTON}>{this.buttonLook()}</Show>
        <Show when={this.look === INPUT}>{this.inputLook()}</Show>
        <Show when={this.look === COMPACT}>{this.compactLook()}</Show>
        <Show when={this.look === HERO}>{this.heroLook()}</Show>
        <Show when={this.dropZone}>{this.zoneOverlayBox()}</Show>
      </>
    )
  }

  /** The overlay over its zone while files are dragged over it, in the top layer. */
  private zoneOverlayBox(): JSX.Element {
    return (
      <>
        <div
          ref={(overlay: HTMLElement) => {
            this.zoneOverlay = overlay
            this.zoneOverlayDrawn(overlay)
          }}
          class="zone"
          part={this.partForName("zone")}
          popover="manual"
          style={{
            top: `${this.zoneBox.top}px`,
            left: `${this.zoneBox.left}px`,
            width: `${this.zoneBox.width}px`,
            height: `${this.zoneBox.height}px`
          }}
        >
          <ui-segment appearance="placeholder" color="blue">
            <ui-icon name="cloud upload" size="big" />
            <ui-text bold="">{this.dropText}</ui-text>
          </ui-segment>
        </div>
      </>
    )
  }

  /** The hero:  a big drop area, then a row per file. */
  private heroLook(): JSX.Element {
    return (
      <>
        <ui-segment
          class="drop-area"
          part={this.partForName("drop-area")}
          appearance="placeholder"
          color={this.isDraggedOver && !this.isOverZone ? "blue" : undefined}
        >
          <div class="hero">
            <span class="icon">
              <slot name={this.slotForName("icon")}>
                <ui-icon name={this.folder ? "folder outline" : "cloud upload"} size="big" />
              </slot>
            </span>
            <Show
              when={!this.isDraggedOver}
              fallback={
                <ui-text class="message" bold="">
                  {this.dropText}
                </ui-text>
              }
            >
              <span class="message">
                <slot name={this.slotForName("message")}>{this.messageText}</slot>
              </span>
              {this.chooseButton(this.translationForKey(this.folder ? "chooseFolders" : "choose"))}
            </Show>
            <Show when={this.limitsText}>
              <ui-text class="limits" color="grey" size="small">
                {this.limitsText}
              </ui-text>
            </Show>
          </div>
        </ui-segment>
        {this.fileRows()}
      </>
    )
  }

  /** The compact look:  a one-line drop area, then one line of status and one bar. */
  private compactLook(): JSX.Element {
    return (
      <>
        <ui-segment
          class="drop-area"
          part={this.partForName("drop-area")}
          appearance="placeholder"
          padding="compact"
          color={this.isDraggedOver && !this.isOverZone ? "blue" : undefined}
        >
          <div class="line">
            <span class="icon">
              <slot name={this.slotForName("icon")}>
                <ui-icon name={this.folder ? "folder outline" : "cloud upload"} />
              </slot>
            </span>
            <Show
              when={!this.isDraggedOver}
              fallback={
                <ui-text class="message" bold="">
                  {this.dropText}
                </ui-text>
              }
            >
              <span class="message">
                <slot name={this.slotForName("message")}>{this.messageText}</slot>
              </span>
              {this.chooseButton(this.translationForKey("chooseShort"), "mini")}
            </Show>
          </div>
        </ui-segment>
        <Show when={this.rows.length}>
          <div class="summary" part={this.partForName("status")} role="status">
            <span>
              <Show when={this.statusText}>{this.statusText}</Show>
              <Show when={this.statusText && this.turnedAwayText}>{" · "}</Show>
              <ui-text class="turned-away-count" state="error">
                {this.turnedAwayText}
              </ui-text>
            </span>
            <Show when={this.isUploading}>
              <ui-progress
                part={this.partForName("progress")}
                value={String(this.overallPercent)}
                size="tiny"
                color="blue"
                aria-label={this.translationForKey("uploading")}
              />
            </Show>
          </div>
        </Show>
      </>
    )
  }

  /** The button look:  a button, and its file rows in a popup from it. */
  private buttonLook(): JSX.Element {
    let button: HTMLElement | undefined
    return (
      <>
        <slot name={this.slotForName("button")} onClick={this.onButtonClick}>
          <ui-button
            ref={(element: HTMLElement) => (button = element)}
            class="choose"
            part={this.partForName("button")}
            icon={this.folder ? "folder outline" : "cloud upload"}
            color={this.isDraggedOver || this.isUploading ? "blue" : undefined}
            appearance={this.isUploading ? "basic" : undefined}
            disabled={this.isDisabled ? "" : undefined}
            data-tooltip={this.limitsText || undefined}
          >
            {this.buttonText}
          </ui-button>
        </slot>
        <Show when={this.rows.length}>
          <ui-popup
            ref={(popup: HTMLElement & { target?: Element }) => this.popupDrawn(popup, button)}
            part={this.partForName("popup")}
            open-on="hover"
            position="bottom left"
            flowing=""
          >
            <div class="popup-rows">
              <ui-text class="popup-summary" color="grey" size="small">
                <Show when={this.statusText}>{this.statusText}</Show>
                <Show when={this.statusText && this.turnedAwayText}>{". "}</Show>
                {this.turnedAwayText}
              </ui-text>
              {this.fileRows("popup")}
            </div>
          </ui-popup>
        </Show>
      </>
    )
  }

  /** The input look:  a read-only field with a Browse button joined to it, then the rows. */
  private inputLook(): JSX.Element {
    return (
      <>
        <ui-input
          class="field"
          part={this.partForName("input")}
          readonly=""
          fluid=""
          value={this.fieldText}
          placeholder={this.isDraggedOver ? this.dropText : this.translationForKey("noFiles")}
          state={this.isDraggedOver ? "info" : undefined}
          aria-label={this.attributes["aria-label"] ?? this.messageText}
          onClick={this.onButtonClick}
        >
          <ui-button
            slot="action"
            class="choose"
            part={this.partForName("button")}
            color={this.isDraggedOver ? "blue" : undefined}
          >
            {this.translationForKey("browse")}
          </ui-button>
        </ui-input>
        {this.fileRows("small")}
      </>
    )
  }

  /** The button that opens the file dialog, in the `button` slot:  a page's own, else ours. */
  private chooseButton(label: string, size?: "mini"): JSX.Element {
    return (
      <span class="choose-slot" onClick={this.onButtonClick}>
        <slot name={this.slotForName("button")}>
          <ui-button class="choose" part={this.partForName("button")} size={size}>
            {label}
          </ui-button>
        </slot>
      </span>
    )
  }

  /** A row per file, an item of a `<ui-list>`:  its glyph, name, size, then its progress or status, and Remove. */
  private fileRows(variant?: "popup" | "small"): JSX.Element {
    return (
      <Show when={this.rows.length}>
        <ui-list
          class={["files", variant]}
          part={this.partForName("files")}
          aria-label={this.translationForKey("files")}
        >
          <For each={this.rows} keyed={(row) => row.id}>
            {(row) => (
              <ui-item class={["file", row().status.replace(" ", "-")]} part={this.partForName("file")}>
                <Show when={!variant}>
                  <ui-icon class="glyph" name="file outline" />
                </Show>
                <span
                  class="name"
                  part={this.partForName("name")}
                  data-tooltip={row().path !== row().file.name ? row().path : undefined}
                >
                  {row().file.name}
                </span>
                <ui-text class="size" part={this.partForName("size")} color="grey">
                  {this.sizeText(row().file.size)}
                </ui-text>
                <Show
                  when={row().status === UPLOADING}
                  fallback={
                    <ui-text
                      class="status"
                      part={this.partForName("status")}
                      state={STATUS_LOOKS[row().status]?.state}
                      color={STATUS_LOOKS[row().status]?.color}
                      data-tooltip={row().why}
                    >
                      <Show when={STATUS_ICONS[row().status]}>
                        <ui-icon name={STATUS_ICONS[row().status]} />
                      </Show>
                      {this.statusOf(row())}
                    </ui-text>
                  }
                >
                  <ui-progress
                    part={this.partForName("progress")}
                    value={String(row().file.size ? Math.round((100 * row().sent) / row().file.size) : 0)}
                    size="tiny"
                    color="blue"
                    aria-label={this.translationForKey("uploading")}
                  />
                </Show>
                <Show when={variant !== "popup"}>
                  <ui-button
                    class="remove"
                    part={this.partForName("remove")}
                    icon="close"
                    size="mini"
                    appearance="basic"
                    aria-label={this.translationForKey("remove")}
                    data-tooltip={this.translationForKey("remove")}
                    onClick={() => this.remove(row().id)}
                  />
                </Show>
              </ui-item>
            )}
          </For>
        </ui-list>
      </Show>
    )
  }

  ////////////////
  // ## Sizes
  ////////////////

  /** `max-size`'s text in bytes:  `2 MB`, `500 KB`, `1.5 GB`, `2048`;  `undefined` for none, or text it can't read. */
  static bytesFor(text: string | undefined): number | undefined {
    if (!text) return undefined
    const match = /^\s*([\d.]+)\s*(b|bytes?|kb|mb|gb)?\s*$/i.exec(text)
    if (!match) {
      E.Warnings.warn(
        "<ui-uploader max-size>",
        `can't read ${JSON.stringify(text)}:  write \`2 MB\`, \`500 KB\` or bytes`
      )
      return undefined
    }
    const unit = (match[2] ?? "b").toLowerCase()
    return Math.round(Number(match[1]) * (UNITS[unit[0] as keyof typeof UNITS] ?? 1))
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIUploader extends E.AttributeValues<typeof uploaderVocabulary> {}

////////////////
// ## Types
////////////////

/** Its looks, `appearance`. */
export type Appearance = (typeof APPEARANCES)[number]

/** How files came in:  the file dialog, a drop on it, or a drop on its zone. */
export type Via = typeof DIALOG | typeof DROP | typeof ZONE

/** What `action` is:  called with the files kept;  what it returns (or resolves to) is `ui-uploaded`'s `response`. */
export type UploadAction = (files: File[]) => unknown

/** Where a file's row has got. */
export type UploadStatus = (typeof UPLOAD_STATUSES)[number]

/** A file's row. */
export type FileRow = {
  /** its own number, for `<For>` and removing it */
  id: number
  /** the file */
  file: File
  /** its path in its folder;  its name, for a file on its own */
  path: string
  /** where it's got */
  status: UploadStatus
  /** bytes posted so far */
  sent: number
  /** why it was turned away, or failed:  short, for its row */
  reason?: string
  /** why it was turned away, in a full sentence:  its row's tooltip */
  why?: string
}

/** Why a file is turned away:  short, for its row, and in full, for its tooltip. */
type Refusal = { reason: string; why: string }

/** The words a refusal reads. */
type RefusalKey = Parameters<UIUploader["translationForKey"]>[0]

/** The hidden `<ui-input type="file">`:  the members of its DOM element the uploader uses (`DOMInputElement`). */
type FileInputElement = HTMLElement & {
  /** the files picked */
  readonly files: readonly File[]
  /** `""` forgets them */
  value: string
  /** opens the file dialog */
  showPicker(): void
}

/** Everything that came in at once. */
type Arrival = DropArrival<Via>

////////////////
// ## Constants
////////////////

/** `appearance`'s values. */
const APPEARANCES = ["hero", "button", "input", "compact"] as const
const [HERO, BUTTON, INPUT, COMPACT] = APPEARANCES

/** How files came in. */
const DIALOG = "dialog"
const DROP = "drop"
const ZONE = "zone"

/** `drop-zone`'s word for the whole page. */
const PAGE = "page"

/** Where a row has got. */
const UPLOAD_STATUSES = ["waiting", "uploading", "uploaded", "taken", "held", "failed", "turned away"] as const
const [WAITING, UPLOADING, UPLOADED, TAKEN, HELD, FAILED, TURNED_AWAY] = UPLOAD_STATUSES

/** The statuses that count as done, for compact's bar. */
const DONE = new Set<UploadStatus>([UPLOADED, TAKEN])

/** A status's icon. */
const STATUS_ICONS: Partial<Record<UploadStatus, string>> = {
  held: "circle outline",
  uploaded: "check circle",
  taken: "check circle",
  failed: "exclamation triangle",
  "turned away": "exclamation circle"
}

/** A status's colour:  `<ui-text>`'s `state`, or `color` for a muted one. */
const STATUS_LOOKS: Partial<Record<UploadStatus, { state?: "success" | "error"; color?: "grey" }>> = {
  held: { color: "grey" },
  uploaded: { state: "success" },
  taken: { state: "success" },
  failed: { state: "error" },
  "turned away": { state: "error" }
}

/** The form field each file is posted in. */
const FORM_FIELD = "file"

/** How long a drag lingers after its last `dragover`, in seconds:  a browser sends one every 50ms or so. */
const DRAG_LINGER = 0.25

/** How long the `button` look's popup shows as an upload starts, in seconds:  then only on hover or focus. */
const POPUP_GLIMPSE = 2

/** Bytes in a KB and an MB. */
const KB = 1024
const MB = KB * KB

/** `max-size`'s units, by their first letter. */
const UNITS = { b: 1, k: KB, m: MB, g: MB * KB }

/** The drag events an uploader handled on its own drop area:  its zone's listener leaves them. */
const HANDLED = new WeakSet<Event>()

/** The last row's number. */
let lastRowId = 0

/****************
 * ### `DropZones`
 * Which uploader a drop on a `drop-zone` goes to:  one set of document listeners for every zone on the page.
 * - A drop on an uploader's own drop area always goes to that uploader (it handles it first:  `HANDLED`).
 * - A drop elsewhere goes to the uploader whose zone is the closest around where it landed;
 *   `page` (the page's root) is the farthest.
 * - Two uploaders with the same zone:  the first on the page takes the drops, and the second logs one warning.
 * - Static and page-wide:  `reset()` for tests.
 ****************/
export class DropZones {
  /** Each zone's uploaders, in the order they joined. */
  private static readonly zones = new Map<Element, UIUploader[]>()

  /** Are the document's listeners on? */
  private static isListening = false

  /** `uploader` takes the drops on `zone`. */
  static add(zone: Element, uploader: UIUploader) {
    const uploaders = DropZones.zones.get(zone) ?? []
    if (uploaders.length) {
      E.Warnings.warn(
        "<ui-uploader drop-zone>",
        "two uploaders share a drop zone:  the first on the page takes the drops",
        uploaders[0]!.domElement,
        uploader.domElement
      )
    }
    DropZones.zones.set(
      zone,
      [...uploaders, uploader].sort((a, b) => E.byDocumentOrder(a.domElement, b.domElement))
    )
    DropZones.listen()
  }

  /** `uploader` no longer takes the drops on `zone`. */
  static remove(zone: Element, uploader: UIUploader) {
    const uploaders = DropZones.zones.get(zone)?.filter((each) => each !== uploader) ?? []
    if (uploaders.length) DropZones.zones.set(zone, uploaders)
    else DropZones.zones.delete(zone)
  }

  /** Forget every zone:  for tests. */
  static reset() {
    DropZones.zones.clear()
  }

  /** The uploader a drag event over the page goes to:  the closest zone round where it is. */
  private static uploaderFor(event: DragEvent): UIUploader | undefined {
    if (HANDLED.has(event) || !DroppedFiles.hasFiles(event)) return undefined
    for (const node of event.composedPath()) {
      const uploader = DropZones.zones.get(node as Element)?.[0]
      if (uploader && !uploader.isDisabled) return uploader
    }
    return undefined
  }

  /** The document's listeners, on once a zone joins, for the life of the page. */
  private static listen() {
    if (DropZones.isListening || isServer) return
    DropZones.isListening = true
    document.addEventListener("dragover", (event) => DropZones.uploaderFor(event)?.draggedOver(event, ZONE))
    document.addEventListener("drop", (event) => DropZones.uploaderFor(event)?.dropped(event, ZONE))
  }
}
