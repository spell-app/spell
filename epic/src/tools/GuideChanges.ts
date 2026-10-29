import { existsSync, readFileSync } from "node:fs"
import { dirname, join, posix, relative } from "node:path"

import { escapeHTML } from "spell/util/string"
import { PhaseIds } from "spell/epic/phases"
import { ThreadFacts } from "spell/epic/comments"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { CommentList, type IdentifiedComment } from "spell/epic/tool/CommentList"
import { GuideInbox } from "spell/epic/tool/GuideInbox"
import { PlanDocCommands } from "spell/epic/tool/PlanDocCommands"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"
import { FEEDBACK, SeeAlso, epicNamed } from "spell/epic/tool/SeeAlso"

import { targetOf } from "./BlockAnchors.js"
import { editNotes, notesIn, type PageNote } from "./notesOnDisk"
import { PageInboxes } from "./PageInboxes"
import { htmlOf } from "./PageNotes.js"

/** The standing epic Owen's comments on pages no epic owns go to, one phase per page (epic `epic-engine` T9). */
export { FEEDBACK }

/** The folders, from the content folder, whose pages may hold page notes (written before P11). */
const NOTE_FOLDERS = ["guides", "pages", "epics"]

/** The kickoff prompt of the epic, when the first gather makes it (the real one's is written by hand). */
const PROMPT =
  "Owen's comments on the pages no epic owns (guides no epic claims, Epic UI's pages, the list pages, the " +
  "changelog), sent with each page's Send or gathered from each page's inbox by `epic comments gather`:  one phase " +
  "per page.  Work each comment into its page, send it on to the epic that should do it, or say why not;  then " +
  "answer it under the comment:  `epic comments answer <page>#<id> --file <reply.html>`."

/****************
 * ### `GuideChanges`
 * Gathers the comments Owen left on docs pages into ONE epic, the standing `feedback` (epic `airplane`, P11;  called
 * `guide-changes` before epic `epic-engine` T9, a name still read as `feedback`):  `epic comments gather`
 * (`comments.ts`), and `/airplane land`.
 * - since T9 a page no epic owns has a Send too, which wakes `feedback`'s session (`commentsRoutes.ts`);  its
 *   session runs this to take what was sent into phases, and the sweep takes what was never sent
 * - what it gathers, per page:
 *   - its inbox's comments still waiting (`GuideInbox`, `<page>.inbox.json5`;  `CommentList` `waiting`), on a page
 *     NO epic owns (`SeeAlso.ownerOf()`, epic `epic-workflow` P13):  an owned page's go to its epic's session with
 *     the page's Send (`epic inbox wait <epic>`), or wait for its next `/epic review`;  a page the caller names
 *     is gathered all the same
 *   - its page notes still `new` (`<spell-note status="new">`, written before P11:  `notesOnDisk.ts`)
 *   - the component sets' pages too (`PageInboxes`):  no epic owns one, so their comments come here;  each by its
 *     served path, `components/epics/<page>`, `components/app/<page>` (`pageOf()`)
 *     - Epic UI's since epic `epic-engine` P2;  App UI's and Brand's since they load the comments (`epic-engine`)
 * - ONE PHASE PER PAGE:  the comments its goal, each linked back to the page and its block, quoted;
 *   a page with a phase still open (to do or under way) gets an update in it instead (`addPhaseUpdate()`):
 *   an `<epic-update>` block at the end of its description, `Update: N comments more from Owen`
 *   - a page's phase is found by the link to it in the phase's Symptom
 * - the epic is made the first time, if it isn't there yet (`epic create feedback --title "Feedback"`, then
 *   `epic update feedback --standing on`):  each phase done merges on its own, the epic never done
 * - then each comment is marked taken (`taken:  { epic, phase }`), each note answered with a link to the phase:
 *   the page shows where it went, and Owen can no longer edit it
 * - epic pages' comments are NOT gathered:  they wait in their epic's review inbox for `/epic review`
 ****************/
export class GuideChanges {
  /** the checkout's root:  its epic pages' tool (`PlanDocFiles`) and owners (`SeeAlso`) */
  readonly root: string
  /** its repo's content folder (`EpicConfig.contentOf()`):  its `guides/`, `pages/`, `epics/` */
  readonly content: string
  /** the epic gathered into:  `feedback` (asked as its old name, `guide-changes`, too), or another (a test's) */
  readonly epic: string
  /** the docs pages' inbox files, and which page each is for */
  readonly inboxes: PageInboxes

  constructor({ root, epic = FEEDBACK, epicUi }: { root: string; epic?: string; epicUi?: string }) {
    this.root = root
    this.content = EpicConfig.contentOf(root)
    this.epic = epicNamed(epic)
    this.inboxes = new PageInboxes({ root, epicUi })
  }

  /** The page path of inbox file `inbox`'s page (`PageInboxes.pageOf()`). */
  pageOf(inbox: string): string {
    return this.inboxes.pageOf(inbox)
  }

  /** Page path `page`'s file (`PageInboxes.fileOf()`). */
  fileOf(page: string): string {
    return this.inboxes.fileOf(page)
  }

  /**
   * Every page with comments waiting or new notes, in page order;  `pages` (page paths:  `guides/x.html`) only
   * those.
   * - no `pages`:  the comments on a page an epic owns are left out (`SeeAlso.ownerOf()`):  they're that epic's
   */
  waiting(pages?: string[]): PageWaiting[] {
    const notes = notesIn(
      NOTE_FOLDERS.map((folder) => join(this.content, folder)),
      this.content
    )
    const found = new Map<string, PageWaiting>()
    const entry = (page: string) => {
      if (!found.has(page)) found.set(page, { page, title: titleOf(this.fileOf(page)), comments: [], notes: [] })
      return found.get(page)!
    }
    const owners = new SeeAlso(this.root)
    for (const inbox of this.inboxFiles()) {
      const page = this.pageOf(inbox)
      // another epic's page:  its comments are that epic's, unless the caller named the page
      const owner = !pages && owners.ownerOf(page)
      if (owner && owner !== this.epic) continue
      const comments = GuideInbox.read(inbox).commentList.waiting
      if (comments.length) entry(page).comments.push(...comments)
    }
    for (const note of notes) entry(note.page).notes.push(note)
    const wanted = pages && new Set(pages.map((page) => posix.normalize(page)))
    return [...found.values()]
      .filter((each) => !wanted || wanted.has(each.page))
      .sort((a, b) => a.page.localeCompare(b.page))
  }

  /**
   * Gather what's waiting (`waiting(pages)`) into the epic:  a phase per page, or an update in its open phase;
   * then mark each comment taken and answer each note.  Resolves to what went where.
   * - nothing waiting:  `[]`, and no epic is made
   * - throws what the `epic` tool throws;  nothing is marked taken until the doc is written
   * - SIDE EFFECT:  writes the epic page (made the first time), the pages' inboxes and the notes' pages
   */
  async gather(pages?: string[]): Promise<Gathered[]> {
    const waiting = this.waiting(pages)
    if (!waiting.length) return []
    const files = new PlanDocFiles({ root: this.root })
    const doc = await this.epicDoc(files)
    const gathered = await files.edit(doc, (plan) =>
      waiting.map((page): Gathered => {
        const link = this.hrefTo(page.page)
        const open = plan.phases.find(
          (phase) => phase.status !== "done" && plan.phase(phase.n).querySelector(`a[href="${link}"]`)
        )
        const list = `<ul>${[...page.comments.map((each) => this.commentItem(page.page, each)), ...page.notes.map((each) => this.noteItem(page.page, each))].join("")}</ul>`
        const count = page.comments.length + page.notes.length
        const many = (n: number) => `${n} ${n === 1 ? "comment" : "comments"}`
        let phase: number
        if (open) {
          phase = open.n
          plan.addPhaseUpdate(phase, `<p>${many(count)} more from Owen:</p>${list}`, {
            summary: `${many(count)} more from Owen`
          })
        } else {
          phase = plan.addPhase(page.title, {
            symptom: `Owen left ${many(count)} on <a href="${link}">${escapeHTML(page.title)}</a> (<code>${escapeHTML(page.page)}</code>).`,
            changes:
              `Work each into the page, or say why not;  then answer it under the comment:  ` +
              `<code>epic comments answer ${escapeHTML(page.page)}#&lt;id&gt; --file reply.html</code>.`,
            goal: list
          })
          plan.log(`${plan.phaseLabel(phase)} added:  ${page.title} (${many(count)}, epic comments gather)`)
        }
        return {
          page: page.page,
          epic: this.epic,
          phase: PhaseIds.numberOf(plan.phase(phase)),
          phaseId: plan.phase(phase).id,
          phaseTitle: PhaseIds.titleOf(plan.phase(phase)),
          as: open ? "update" : "phase",
          comments: page.comments.map((each) => each.id),
          notes: page.notes.map((each) => each.id)
        }
      })
    )
    for (const each of gathered) await this.markTaken(each)
    files.reindex()
    return gathered
  }

  ////////////////
  // ## The epic
  ////////////////

  /**
   * The epic's epic page;  made the first time, as `epic create feedback --title "Feedback"`, then made standing
   * (`epic update feedback --standing on`):  its phases merge on their own, and it's never done.
   */
  private async epicDoc(files: PlanDocFiles): Promise<string> {
    const found = PlanDocFiles.planDocIn(join(files.epics, this.epic), this.epic)
    if (found) return found
    const commands = new PlanDocCommands({ files })
    // the tool prints what it wrote;  here that goes nowhere
    commands.print = () => {}
    const title = this.epic === FEEDBACK ? "Feedback" : this.epic
    const made = await commands.run(["create", this.epic, "--title", title, "--prompt", PROMPT])
    if (made !== 0) throw new Error(`GuideChanges.gather():  couldn't make epic ${this.epic}`)
    if (this.epic === FEEDBACK) await commands.run(["standing", this.epic, "on"])
    return files.docPath(this.epic)
  }

  /** A link to `page` (a page path), with `hash`:  its root path, from any folder (epic `epic-engine` P46). */
  private hrefTo(page: string, hash = ""): string {
    return `/${page}${hash ? `#${hash}` : ""}`
  }

  /**
   * A comment, as its line in the phase's goal:  where (linked), what it quotes, Owen's words, its id;  then his
   * latest reply on its thread, when he has one.
   */
  private commentItem(page: string, comment: IdentifiedComment): string {
    const where =
      comment.kind === "page"
        ? "the page"
        : comment.kind === "section"
          ? comment.label
          : `${comment.kind}${comment.label ? ` in ${comment.label}` : ""}`
    const about = comment.quote
      ? ` on <q>${escapeHTML(comment.quote)}</q>`
      : comment.excerpt && comment.kind !== "section"
        ? ` (<q>${escapeHTML(comment.excerpt)}</q>)`
        : ""
    const words = htmlOf(comment.text).join("")
    // a reply on its thread since Claude answered:  the person's latest words are the work now
    const reply = ThreadFacts.lastPersonReply(comment)
    const replied = reply?.text
      ? `<p>${escapeHTML(reply.by)} replied on the thread:</p>${htmlOf(reply.text).join("")}`
      : ""
    return `<li><a href="${this.hrefTo(page, targetOf(comment.anchor))}">${escapeHTML(where || comment.anchor)}</a>${about}, <code>${CommentList.label(comment.id)}</code>:  ${words}${replied}</li>`
  }

  /** A page note (before P11), as its line in the phase's goal. */
  private noteItem(page: string, note: PageNote): string {
    const target = note.for === "page" ? "" : note.for
    return `<li><a href="${this.hrefTo(page, target)}">${escapeHTML(note.label)}</a>, page note <code>${note.id}</code>:  ${htmlOf(note.text).join("")}</li>`
  }

  /** Mark what went into a phase as taken:  the comments in the page's inbox, the notes answered with a link. */
  private async markTaken({ page, phase, phaseId, phaseTitle, comments, notes }: Gathered): Promise<void> {
    const file = this.fileOf(page)
    // the phase's id too (epic `epic-engine` I16):  its thread's link finds it after an insert moves its number
    if (comments.length)
      GuideInbox.update(GuideInbox.fileFor(file), (list) => {
        for (const id of comments) list.take(id, { epic: this.epic, phase, phaseId, title: phaseTitle })
      })
    if (!notes.length) return
    const doc = relative(dirname(file), join(this.content, "epics", this.epic, `${this.epic}.plan.html`))
    const reply = `<p>Taken into <a href="${doc}#${phaseId}">${this.epic} P${phase}</a>.</p>`
    await editNotes(file, (pageNotes) => {
      for (const id of notes) pageNotes.answer(id, reply)
    })
  }

  ////////////////
  // ## Finding inboxes
  ////////////////

  /** Every docs page's inbox file, sorted (`PageInboxes.inboxFiles()`). */
  inboxFiles(): string[] {
    return this.inboxes.inboxFiles()
  }
}

/** A page with comments or notes waiting. */
export type PageWaiting = {
  /** the page, a page path (from the content folder):  `guides/x.html` */
  page: string
  /** its `<title>`, short:  the phase's name */
  title: string
  /** its comments still waiting */
  comments: IdentifiedComment[]
  /** its page notes still `new` */
  notes: PageNote[]
}

/** What a gather did for one page. */
export type Gathered = {
  page: string
  epic: string
  /** the phase it went into, by its number:  `3`, a decimal phase's `11.1` */
  phase: string
  /** the phase it went into, by its stable id (`p-solid-2`):  where a link to it goes */
  phaseId: string
  /** that phase's title (`Solid 2`):  what a taken comment's link says */
  phaseTitle: string
  /** `phase`:  a new phase;  `update`:  an update (`<epic-update>`) in the page's open phase */
  as: "phase" | "update"
  /** the comments' ids, now taken */
  comments: string[]
  /** the notes' ids, now answered */
  notes: string[]
}

/** Page `file`'s `<title>`, without a site suffix (` · Spell docs`);  its file name when it has none. */
function titleOf(file: string): string {
  const html = existsSync(file) ? readFileSync(file, "utf8") : ""
  const title = /<title>([^<]*)<\/title>/
    .exec(html)?.[1]
    ?.split(/\s+[·|—–-]\s+/)[0]
    ?.replace(/&amp;/g, "&")
    .trim()
  return title || file.replace(/^.*\/|\.html$/g, "")
}
