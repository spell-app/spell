// Import directly:  the persist barrel would bring the database and server places too
import { PrefStore } from "spell/util/persist/PrefStore"
import { PageStore, ServerLink, clockOf, sentence, type ServerInfo } from "spell/epic/review"

import type { AnswerFormOptions } from "./AnswerForm"
import { DraftSaver } from "./DraftSaver"
import {
  CHOICES_API,
  CHOICES_KEY_PREFIX,
  CHOICES_SAVE_MS,
  FOLD_KEY_PREFIX,
  SAVED_CHOICES_PAGE,
  type ChoiceRowPart,
  type ChoicesAnswer,
  type ChoicesOrder,
  type ChoicesDraft,
  type ChoicesValues
} from "./answers.types"

/****************
 * ### `ChoicesForm`
 * A CHOICE page's boxes, as its elements hold them (epic `epic-workflow` P12):
 * what Owen typed over Claude's recommendations, the draft that keeps it, and "Do it".
 * - One per page (`forPage()`), a `PageStore` the elements follow (`subscribe()`).
 * - Each row, `<epic-choice-row>`, registers while connected (`add()`);
 *   `<epic-choices-bar>` holds the feedback and "Do it", and draws where things stand.
 * - Keeps a DRAFT of what's typed, so nothing typed lives only in the open page
 *   (epic `epic-engine` P15, r14:  a page server gone lost 76 boxes Owen filled):
 *   - every change goes into the browser's storage at once (`localStorage`, `CHOICES_KEY_PREFIX` + the page's path)
 *   - and to the page server as he types (`src/tools/choicesRoutes.ts`, `POST /api/docs/choices/draft`):
 *     `CHOICES_SAVE_MS` (half a second) after the last change, one save at a time
 *   - and as the page goes away (`watch()`:  `pagehide`, the page hidden), a request that outlives the page
 *   - a save that fails says so in red (`isSaveError`), and tries again every 3s until one goes through:
 *     a page server back on its address takes it, with its new token (`ServerLink`), no keystroke, no reload
 *   - all of it the page's `DraftSaver`'s (epic `coherence` C10), as every form's
 *   - the draft never wakes anyone:  only "Do it" does;  "Do it" drops the browser's copy
 *   - Copy my answers (`copyText()`):  what's typed, as the draft, for a page whose server is gone for good
 * - "Do it" (`send()`):  `POST /api/docs/choices/answer`, which `epic choices wait` exits with.
 *   Pressed again after changes, it sends again.
 * - On load (`restore()`):  the newest of the server's draft, the browser's copy and the answer
 *   comes back into the boxes and the feedback.
 *   - The browser's copy, newer than what the server has, is saved to it.
 * - Only the boxes that differ from the recommendation are sent, by row id (`values`), with the feedback.
 *   - A `blank` row's box (epic `epic-engine` P13):  when it holds something other than today's text.
 * - A table Owen can put in order (`<epic-choice-rows reorder>`, epic `epic-workflow` P15):
 *   its rows' ids in the order he left them go too (`order`), by its section's id.
 *   - On load they come back in `restoredOrder`, which the table puts its rows in.
 * - Node-safe at import:  no `window` / `document` touched until `forPage()`, `watch()` or `expandAll()`;
 *   `fetch` and the storage come in through `AnswerFormOptions`, so tests stub them.
 * - Position in the import graph:  `spell/epic/review` (the link), `spell/epic/dates`, its peer types.
 *   NEVER imports Solid or Spell UI.
 ****************/
export class ChoicesForm extends PageStore {
  /** The feedback box's text, as typed. */
  feedback = ""

  /** The answer last sent, if any. */
  sent: ChoicesAnswer | undefined

  /** Changed since the answer was sent:  "press Do it again". */
  isStale = false

  /** Why "Do it" failed, as a sentence;  `""` for none. */
  error = ""

  /** "Do it" on its way. */
  isSending = false

  /** The rows, by id. */
  private readonly rows = new Map<string, ChoiceRowPart>()

  /** The values read back on load, for a row that registers later. */
  private restored: Record<string, string> = {}

  /** The order of each reorderable table read back on load, by its section's id:  the table puts its rows in it. */
  restoredOrder: ChoicesOrder = {}

  /** The page server, as drafts and answers are sent to it. */
  private readonly link: ServerLink

  /** The draft's saves, its browser copy (`CHOICES_KEY_PREFIX` + the page's path) and where it stands. */
  private readonly drafts: DraftSaver

  /** A word of the page's own where the save status goes ("a template:  nothing here is saved");  `""` for none. */
  private note = ""

  constructor(private readonly options: AnswerFormOptions) {
    super()
    this.link = new ServerLink(options)
    this.drafts = new DraftSaver({
      save: async ({ keepalive }) => ((await this.post("draft", keepalive)) as { draft: ChoicesDraft }).draft.saved,
      wait: CHOICES_SAVE_MS,
      key: `${CHOICES_KEY_PREFIX}${options.page}`,
      storage: options.storage,
      link: this.link,
      onChange: () => this.changed()
    })
  }

  ////////////////
  // ## The page's form
  ////////////////

  /** The page's form, made on the first call (browser only);  a test hands it its own (`adopt()`). */
  static forPage(): ChoicesForm {
    return ChoicesForm.onePerPage(
      // a browser that blocks it throws here:  `StoragePlace` keeps the draft's copy in memory then
      () => new ChoicesForm({ ...ServerLink.pageOptions(), storage: () => window.localStorage })
    )
  }

  ////////////////
  // ## Rows
  ////////////////

  /** Register `row` while it's connected (a value read back already goes into its box);  returns the undo. */
  add(row: ChoiceRowPart): () => void {
    this.rows.set(row.rowName, row)
    const value = this.restored[row.rowName]
    if (value !== undefined) row.showValue(value)
    this.changed()
    return () => {
      if (this.rows.get(row.rowName) === row) this.rows.delete(row.rowName)
      this.changed()
    }
  }

  /** How many rows, and how many Owen changed. */
  get counts(): { rows: number; changed: number } {
    const rows = [...this.rows.values()]
    return { rows: rows.length, changed: rows.filter((row) => row.isChanged).length }
  }

  /** The changed boxes, by row id, as typed. */
  collect(): Record<string, string> {
    const values: Record<string, string> = {}
    for (const row of this.rows.values()) if (row.isChanged) values[row.rowName] = row.value
    return values
  }

  /** Each reorderable table's row ids, in their order now, by its section's id;  `{}` for a page with none. */
  collectOrder(): ChoicesOrder {
    const tables = new Map<string, ChoiceRowPart[]>()
    for (const row of this.rows.values()) {
      if (row.orderKey === undefined) continue
      if (!tables.has(row.orderKey)) tables.set(row.orderKey, [])
      tables.get(row.orderKey)!.push(row)
    }
    const order: ChoicesOrder = {}
    for (const [key, rows] of tables)
      order[key] = rows.sort((one, other) => one.orderIndex - other.orderIndex).map((row) => row.rowName)
    return order
  }

  ////////////////
  // ## Changes
  ////////////////

  /**
   * Owen changed a box, the feedback or a row's place:  everyone listening hears it, and a sent answer is stale;  on a
   * page that keeps drafts (`SAVED_CHOICES_PAGE`), the browser's copy is written at once, the server's a moment later
   * (`CHOICES_SAVE_MS`).
   */
  edited() {
    if (this.keepsDrafts) {
      this.writeLocal()
      this.saveSoon()
    }
    if (this.sent) this.isStale = true
    this.changed()
  }

  /** The feedback box changed to `text`. */
  setFeedback(text: string) {
    this.feedback = text
    this.edited()
  }

  /**
   * Save what's typed as the page goes away (`pagehide`, or the page hidden), on `window`'s page;  returns the undo.
   * - SIDE EFFECT:  listens on `window` and its document until undone
   */
  watch(window: Window): () => void {
    return this.drafts.watch(window)
  }

  ////////////////
  // ## Saving and sending
  ////////////////

  /**
   * Save the draft to the page server now, if anything changed since the last save;  after any save on its way.
   * - `keepalive`:  the page is going away;  the request outlives it
   * - NEVER throws:  a failure shows in `savedText`, in red (the browser's copy still has it),
   *   and it tries again in 3s (`DraftSaver`)
   */
  async save({ keepalive = false }: { keepalive?: boolean } = {}): Promise<void> {
    await this.drafts.save({ keepalive })
  }

  /** The save status:  `saved 12:04`, `saving…`, or why it can't save (`isSaveError`):  `DraftSaver.text`. */
  get savedText(): string {
    if (this.note) return this.note
    return this.isSaveError ? sentence(this.drafts.text) : this.drafts.text
  }

  /** The last save failed, or can't be made (off the page server):  `savedText` says why. */
  get isSaveError(): boolean {
    return this.drafts.isError
  }

  /** Save the draft `CHOICES_SAVE_MS` after the last change;  a failure keeps showing until a save goes through. */
  private saveSoon() {
    this.drafts.changed()
  }

  /**
   * "Do it":  send every changed box and the feedback;  `sent` is what went, or `error` why not.
   * - NEVER throws
   */
  async send(): Promise<void> {
    if (this.isSending) return
    this.error = ""
    this.isSending = true
    this.changed()
    try {
      const { answer } = (await this.post("answer")) as { answer: ChoicesAnswer }
      this.sent = answer
      this.isStale = false
      // sent:  the draft is done with, its browser copy too
      this.drafts.done()
      this.drafts.tell(`saved ${clockOf(answer.answered)}`)
    } catch (failure) {
      this.error = `Not sent:  ${(failure as Error).message}`
    } finally {
      this.isSending = false
      this.changed()
    }
  }

  /**
   * The "Sent" message for the answer sent, or `""`:  when, how often, what;
   * `isStale`:  changed since, so it says to press Do it again.
   */
  get sentText(): string {
    const answer = this.sent
    if (!answer) return ""
    const changes = Object.keys(answer.values ?? {}).length
    const again = answer.changes ? ` (sent ${answer.changes + 1} times)` : ""
    const at = clockOf(answer.answered)
    if (this.isStale) return `Sent at ${at}${again};  changed since:  press Do it again to send the new ones.`
    const left = [...this.rows.values()].every((row) => row.blank) ? "left as they are" : "as recommended"
    const what = `${changes} changed, ${this.rows.size - changes} ${left}`
    return `Sent to Claude at ${at}${again}:  ${what}.  Change anything and press Do it again to resend.`
  }

  /**
   * What was typed and sent before, back into the boxes:  the newest of the server's draft, the browser's copy and
   * the answer sent;  the feedback returns in `feedback`.
   * - the browser's copy, newer than both:  typed while the server couldn't take it, so it's saved to it now
   * - the template (a page outside a `details/` folder, not naming its rows):  says nothing is saved
   * - from `file://` or without a page server:  only the browser's copy
   * - NEVER throws:  a failure shows in `savedText`, and the browser's copy still comes back
   */
  async restore(): Promise<void> {
    const isServed = this.link.isServed
    if (!this.keepsDrafts) {
      if (!isServed) return
      this.note = "a template:  nothing here is saved"
      return this.changed()
    }
    let draft: ChoicesDraft | undefined
    let answer: ChoicesAnswer | undefined
    try {
      if (isServed)
        [draft, answer] = (await Promise.all([this.fetchJson("draft"), this.fetchJson("answer")])) as [
          ChoicesDraft | undefined,
          ChoicesAnswer | undefined
        ]
    } catch (failure) {
      this.drafts.tell(`can't load what you typed:  ${(failure as Error).message}`, { isError: true })
    }
    const local = this.readLocal()
    const last = newestOf(draft, local, answer)
    if (last) {
      this.restored = last.values ?? {}
      for (const [id, value] of Object.entries(this.restored)) this.rows.get(id)?.showValue(value)
      this.feedback = last.feedback ?? ""
      this.restoredOrder = last.order ?? {}
    }
    if (draft && !this.isSaveError) this.drafts.tell(`saved ${clockOf(draft.saved)}`)
    if (answer) this.sent = answer
    if (last && last === local) this.saveSoon()
    this.changed()
  }

  /**
   * What's typed, for Copy my answers:  the draft as the page server would save it, as JSON.
   * - A `ChoicesDraft`:  the page, when, the changed boxes by row id, the feedback, the order.
   * - Why:  a page whose server is gone for good can't save, and a reload brings back nothing;
   *   this gets it out without developer tools (r14).
   * - Saved as `<slug>.draft.json5` beside the page, the page shows it again.
   */
  copyText(): string {
    return JSON.stringify(this.draftNow(), null, 2)
  }

  ////////////////
  // ## Files
  ////////////////

  /**
   * `file` (from the repo's root) at `line`, for VS Code:
   * `vscode://file/<checkout>/<file>:<line>`, which VS Code opens AT the line.
   * - `#` before the page server says where the checkout is:  the link then does nothing.
   * - the checkout:  the one the page server serves (`root`)
   *   - a `/worktrees/<w>/` page's:
   *     that worktree, in the folder the server serves them from (`worktrees`, `SPELL_SERVER.worktrees`)
   */
  static fileUrl(
    file: string,
    line: number,
    { root, worktrees, pathname }: { root?: string; worktrees?: string; pathname: string }
  ): string {
    if (!root) return "#"
    const worktree = /^\/worktrees\/([^/]+)\//.exec(pathname)?.[1]
    const checkout = worktree && worktrees ? `${worktrees}/${worktree}` : root
    return `vscode://file${encodeURI(`${checkout}/${file}`)}:${line}`
  }

  /** `fileUrl()` on this page (browser only):  the checkout the page server serves (`window.SPELL_SERVER`). */
  static fileUrlHere(file: string, line: number): string {
    const server = (window as { SPELL_SERVER?: ServerInfo }).SPELL_SERVER
    return ChoicesForm.fileUrl(file, line, {
      root: server?.root,
      worktrees: server?.worktrees,
      pathname: location.pathname
    })
  }

  /**
   * Open `url` (a `vscode://` link) for `event`'s click, in VS Code's side bar:  its frame can't follow the link, so
   * the view opens it (`DocView.open()`);  in a browser the link opens it by itself.
   * - the ONE place a page asks the side bar to open a file:  a choice row's, the syntax page's class names
   */
  static openFile(event: Event, url: string, window: Window = globalThis.window) {
    if (window.parent === window) return
    event.preventDefault()
    window.parent.postMessage({ spell: "open", url, kind: "external" }, "*")
  }

  ////////////////
  // ## Folds
  ////////////////

  /**
   * Unfold every section holding rows in `document`, or, once they all are, fold them again.
   * - Returns true when they're now all open.
   * - Remembered as the reader's own folds are:  a property set fires no `ui-opening`,
   *   so this writes the docs runtime's store itself (`FOLD_KEY_PREFIX` + path, through `PrefStore`).
   */
  static expandAll(document: Document): boolean {
    const sections = ChoicesForm.sectionsOf(document)
    const isAllOpen = ChoicesForm.isAllOpen(document)
    for (const section of sections) section.open = !isAllOpen
    const key = `${FOLD_KEY_PREFIX}${document.location.pathname}`
    const saved = PrefStore.getAt(key)
    const folds = (saved && typeof saved === "object" ? saved : {}) as Record<string, boolean>
    for (const section of sections) folds[section.id] = isAllOpen
    PrefStore.setAt(key, folds)
    return !isAllOpen
  }

  /** Is every section holding rows in `document` open? */
  static isAllOpen(document: Document): boolean {
    return ChoicesForm.sectionsOf(document).every((section) => section.open)
  }

  /** The `<ui-section>`s holding rows (`<epic-choice-rows>`). */
  private static sectionsOf(document: Document): Array<Element & { open: boolean; id: string }> {
    return [...document.querySelectorAll("ui-section:has(> epic-choice-rows)")] as Array<
      Element & { open: boolean; id: string }
    >
  }

  ////////////////
  // ## The browser's copy
  ////////////////

  /** Does this page keep drafts:  a choice page in a `details/` folder (`SAVED_CHOICES_PAGE`), not the template? */
  get keepsDrafts(): boolean {
    return SAVED_CHOICES_PAGE.test(this.options.page)
  }

  /** The draft as it stands now, stamped now. */
  private draftNow(): ChoicesDraft {
    return { page: this.options.page, saved: new Date().toISOString(), ...this.body() }
  }

  /** Write the draft to the browser's copy, at once. */
  private writeLocal() {
    this.drafts.keep(this.draftNow())
  }

  /** The browser's copy of the draft, or `undefined` (none, or not a draft). */
  private readLocal(): ChoicesDraft | undefined {
    const draft = this.drafts.kept<ChoicesDraft>()
    return draft && typeof draft.saved === "string" && draft.values && typeof draft.values === "object"
      ? draft
      : undefined
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** What the routes take for this page:  the changed boxes, the feedback (trimmed), the order (when there is one). */
  private body(): ChoicesValues {
    const order = this.collectOrder()
    return {
      values: this.collect(),
      feedback: this.feedback.trim(),
      ...(Object.keys(order).length > 0 && { order })
    }
  }

  /**
   * POST the page's boxes to `/api/docs/choices/<what>`;  the route's reply.
   * - throws an `Error` saying, in Owen's words, what to do:  reload, restart the server, open it from the server
   */
  private async post(what: "draft" | "answer", keepalive = false): Promise<unknown> {
    if (!this.link.isServed) throw new Error("this page isn't on the page server:  open it with `epic choices show`")
    const body: ChoicesValues & { page: string } = { page: this.options.page, ...this.body() }
    return this.link.post(`${CHOICES_API}/${what}`, body, { keepalive })
  }

  /**
   * `GET /api/docs/choices/<what>` for this page:  the draft or answer, or `undefined`.
   * - throws when the route isn't there (404):  a page server from before it;  any other failure answers nothing
   */
  private async fetchJson(what: "draft" | "answer"): Promise<unknown> {
    const reply = await this.link
      .getForPage<Record<string, unknown> | null>(`${CHOICES_API}/${what}`, { missing: null })
      .catch(() => undefined)
    if (reply === null) throw new Error("page server too old, restart it")
    return reply?.[what] ?? undefined
  }
}

/**
 * The newest of the server's `draft`, the browser's copy (`local`) and the `answer` sent, by when each was written;
 * `undefined` for none.
 * - a tie goes to the server's:  it has it already (Do it writes the draft, then the answer)
 */
function newestOf(
  draft: ChoicesDraft | undefined,
  local: ChoicesDraft | undefined,
  answer: ChoicesAnswer | undefined
): ChoicesValues | undefined {
  const dated: Array<[ChoicesValues | undefined, string | undefined]> = [
    [answer, answer?.answered],
    [draft, draft?.saved],
    [local, local?.saved]
  ]
  let newest: ChoicesValues | undefined
  let at = -Infinity
  for (const [values, when] of dated) {
    // undated (a file written by hand):  older than any dated one
    const time = Date.parse(when ?? "") || 0
    if (values && time > at) [newest, at] = [values, time]
  }
  return newest
}
