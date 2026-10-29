import { existsSync, readdirSync, renameSync } from "node:fs"
import { basename, dirname, join } from "node:path"

import { ThreadFacts } from "spell/epic/comments"
import { DataFile } from "spell/epic/data/DataFile"

import { CommentList, type Comment, type CommentClaim, type CommentReply } from "./CommentList"

/****************
 * ### `SharedComments`
 * A page's comments SHARED through the content repo (epic `epic-friend` P9, Q4 B):  ONE FILE PER PERSON beside the
 * page, committed and synced with the plans, while the page's inbox file keeps only what's this machine's own.
 *
 * ```text
 * epics/seo/seo.plan.html
 * epics/seo/seo.inbox.json5             <- local, git-ignored:  marks, Send, who's listening, the heartbeat
 * epics/seo/seo.comments.ana.json5      <- Ana's comments, and her words on the others' threads
 * epics/seo/seo.comments.ben.json5      <- Ben's
 * ```
 *
 * - WHOSE FILE:  named by the person's name (`slugOf()`:  "Ana Lima" => `ana-lima`;  Q10, A:  the name is who you
 *   are), beside the inbox file:  `<page>.comments.<person>.json5` (`pathFor()`);  a docs page's the same way,
 *   `guides/x.comments.ana.json5` beside `guides/x.inbox.json5`
 * - ONE WRITER PER FILE:  each machine writes only its own person's file, so a pull never conflicts in one
 *   - a person's file holds the comments they wrote, whole (`comments`), with everything said on their threads
 *     from this machine:  their replies, their agent's answers, closing it, their agent taking it
 *   - and what this machine said on SOMEONE ELSE's thread (`on`, by that comment's id):  Ben's reply on Ana's `C3`,
 *     his closing it or opening it again, his agent's answer when it took one nobody owns
 * - READ (`read()`, then `merged()`):  every person's file, put together into ONE list, the shape a page and every
 *   command already read (`CommentList`):  each comment with every reply in time order, closed if its latest close
 *   is later than every reopen and every reply since, "Claude (Ana) is thinking" from the latest claim
 *   - the inbox file's own `comments` (an inbox written before P9) join them, this machine's:  moved into its
 *     person's file by the next write, the inbox move
 * - WRITTEN (`write()`):  the list split again by WHO SAID IT, by what each other file already holds:  whatever
 *   none of them holds is this machine's, into its own person's file;  never another person's file
 * - IDS:  one number series for the page, across every file (`c3`:  `CommentList`'s next free one).  Two people
 *   writing at once may both make `c3`:  the content repo's sync renumbers this machine's before it rebases
 *   (`Renumber.comments()`, as it does items);  read before that, the second one shows under the next free id
 * - Node only (`node:fs`):  imported by path, as the inboxes are.  Pure files and data:  the inboxes take the lock.
 ****************/
export class SharedComments {
  /** the inbox file the comments files are beside:  `<page>.inbox.json5` */
  readonly inbox: string

  /** each person's file as read, by path */
  readonly files: Map<string, CommentsFile>

  constructor(inbox: string, files = new Map<string, CommentsFile>()) {
    this.inbox = inbox
    this.files = files
  }

  ////////////////
  // ## The files
  ////////////////

  /** Person `person`'s comments file beside inbox file `inbox`:  `<page>.comments.<slug>.json5` (`slugOf()`). */
  static pathFor(inbox: string, person: string): string {
    return `${SharedComments.baseOf(inbox)}${PART}${SharedComments.slugOf(person)}${DataFile.SUFFIX}`
  }

  /** Every person's comments file beside inbox file `inbox`, sorted by name. */
  static pathsBeside(inbox: string): string[] {
    const folder = dirname(inbox)
    const prefix = `${basename(SharedComments.baseOf(inbox))}${PART}`
    let names: string[]
    try {
      names = readdirSync(folder)
    } catch {
      return []
    }
    return names
      .filter((name) => name.startsWith(prefix) && SLUGGED.test(name.slice(prefix.length)))
      .sort()
      .map((name) => join(folder, name))
  }

  /** Is `path` a person's comments file (`x.comments.ana.json5`)? */
  static isCommentsFile(path: string): boolean {
    return COMMENTS_FILE.test(path)
  }

  /** The inbox file a comments file `path` is beside:  `x.comments.ana.json5` => `x.inbox.json5`. */
  static inboxOf(path: string): string {
    return path.replace(COMMENTS_FILE, `.inbox${DataFile.SUFFIX}`)
  }

  /**
   * A person's name as their file names it:  lower case, each run of anything but letters and digits one `-`
   * ("Ana Lima" => `ana-lima`, "José" => `josé`);  "someone" for a name with nothing left.
   * - two ways of writing one name (`Ana`, `ana`) are one file, as `epic whois` counts them one person
   */
  static slugOf(person: string): string {
    const slug = person
      .normalize("NFC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
    return slug || SOMEONE
  }

  /** Inbox file `inbox` without its kind:  `epics/seo/seo.inbox.json5` => `epics/seo/seo`. */
  private static baseOf(inbox: string): string {
    return inbox.replace(/\.inbox\.json5?$/, "")
  }

  ////////////////
  // ## Reading
  ////////////////

  /**
   * Every person's comments file beside inbox file `inbox`, as they are now.
   * - a file that isn't JSON5 throws a `SyntaxError` naming it:  the inbox's readers say so as they do for theirs
   */
  static read(inbox: string): SharedComments {
    const files = new Map<string, CommentsFile>()
    for (const path of SharedComments.pathsBeside(inbox)) {
      let record: Partial<CommentsFile> | undefined
      try {
        record = DataFile.read<Partial<CommentsFile>>(path)
      } catch (error) {
        throw new SyntaxError(`${path} is not JSON5:  ${(error as Error).message}`)
      }
      if (!record) continue
      const comments = CommentList.migrate(isRecord(record.comments) ? record.comments : {})
      files.set(path, {
        version: record.version ?? COMMENTS_VERSION,
        comments,
        on: isRecord(record.on) ? record.on : {}
      })
    }
    return new SharedComments(inbox, files)
  }

  /**
   * Every person's comments as ONE record, by id, the shape `CommentList` edits (a fresh copy each call):
   * - each file's own comments, in file order;  then `local`'s, an inbox file's from before P9 (this machine's)
   * - an id two of them use (both wrote `c3` before a sync):  the later one under the next free id, until the sync
   *   renumbers it for good
   * - each comment's thread from every file (`on`):  replies in time order (the same reply twice, once), closed only
   *   by a close later than every reopen and every reply of a person's, the latest claim and its `working`;  `new`
   *   reads `answered` once an agent answered on it
   * - remembers where each piece came from (`write()` splits by it)
   */
  merged(local: Record<string, Comment> = {}): Record<string, Comment> {
    const comments: Record<string, Comment> = {}
    const take = (id: string, comment: Comment, path: string | null) => {
      const key = Object.hasOwn(comments, id) ? nextFree(comments) : id
      const copy = structuredClone(comment)
      if (path) this.origin.set(copy, { path, id })
      for (const reply of copy.replies ?? []) if (path) this.saidIn.set(reply, path)
      for (const each of [copy.done, copy.reopened, copy.claim]) if (each && path) this.saidIn.set(each, path)
      comments[key] = copy
    }
    for (const [path, file] of this.files)
      for (const [id, comment] of Object.entries(file.comments)) take(id, comment, path)
    for (const [id, comment] of Object.entries(CommentList.migrate(local))) take(id, comment, null)
    for (const [path, file] of this.files) {
      for (const [id, said] of Object.entries(file.on)) {
        const comment = this.commentFor(comments, id, path)
        if (comment) this.join(comment, structuredClone(said), path)
      }
    }
    for (const comment of Object.values(comments)) settle(comment)
    return comments
  }

  /** Where each comment of the last `merged()` came from:  its file and its id there.  None for this machine's own. */
  private readonly origin = new WeakMap<Comment, { path: string; id: string }>()

  /** Which file said each reply, close, reopen and claim of the last `merged()`. */
  private readonly saidIn = new WeakMap<object, string>()

  /** The comment `on` entry `id` of file `path` is about:  the one keyed `id` in another file. */
  private commentFor(comments: Record<string, Comment>, id: string, path: string): Comment | undefined {
    const key = CommentList.keyOf(id)
    const others = Object.values(comments).filter((each) => {
      const origin = this.origin.get(each)
      return origin?.id === key && origin.path !== path
    })
    return others[0] ?? (Object.hasOwn(comments, key) ? comments[key] : undefined)
  }

  /** `said` (a file's words on someone else's thread) joined into `comment`, each piece remembered as `path`'s. */
  private join(comment: Comment, said: ThreadAdds, path: string): void {
    for (const reply of Array.isArray(said.replies) ? said.replies : []) {
      this.saidIn.set(reply, path)
      comment.replies = [...(comment.replies ?? []), reply]
    }
    if (said.done && isLater(said.done.at, comment.done?.at)) {
      this.saidIn.set(said.done, path)
      comment.done = said.done
    }
    if (said.reopened && isLater(said.reopened.at, comment.reopened?.at)) {
      this.saidIn.set(said.reopened, path)
      comment.reopened = said.reopened
    }
    if (said.claim && isLater(said.claim.at, comment.claim?.at)) {
      this.saidIn.set(said.claim, path)
      comment.claim = said.claim
      if (said.working) comment.working = said.working
      else delete comment.working
    }
  }

  ////////////////
  // ## Writing
  ////////////////

  /**
   * Write `person`'s file from `comments` (the record `merged()` gave, as changed since):  what no OTHER person's file
   * holds is theirs.
   * - their comments whole, with the replies, close, reopen and claim no other file holds;  a comment with no `by`
   *   (an inbox's from before names) stamped theirs
   * - on another person's comment:  only what they said on it, under its id in that file (`on`)
   * - nothing of theirs left:  the file goes
   * - call it under the inbox's lock:  the same machine's other writers take it too
   * - SIDE EFFECT:  writes or removes the file
   */
  write(comments: Record<string, Comment>, person: string): void {
    const mine = SharedComments.pathFor(this.inbox, person)
    const others = (piece: object | undefined) => {
      const path = piece && this.saidIn.get(piece)
      return !!path && path !== mine
    }
    const own: Record<string, Comment> = {}
    const on: Record<string, ThreadAdds> = {}
    for (const [id, comment] of Object.entries(comments)) {
      const origin = this.origin.get(comment)
      const replies = (comment.replies ?? []).filter((reply) => !others(reply))
      const done = comment.done && !others(comment.done) ? comment.done : undefined
      const reopened = comment.reopened && !others(comment.reopened) ? comment.reopened : undefined
      const claim = comment.claim && !others(comment.claim) ? comment.claim : undefined
      const theirs = !!origin && origin.path !== mine
      // `working` goes with its claim;  an old one with none is the comment's own
      const working = claim || (!comment.claim && !theirs) ? comment.working : undefined
      if (theirs) {
        const said: ThreadAdds = {
          ...(replies.length && { replies }),
          ...(done && { done }),
          ...(reopened && { reopened }),
          ...(claim && { claim }),
          ...(working && { working })
        }
        if (Object.keys(said).length) on[origin.id] = said
        continue
      }
      const { replies: _replies, done: _done, reopened: _reopened, claim: _claim, working: _working, ...rest } = comment
      own[id] = {
        ...rest,
        by: comment.by ?? person,
        ...(replies.length && { replies }),
        ...(done && { done }),
        ...(reopened && { reopened }),
        ...(claim && { claim }),
        ...(working && { working })
      } as Comment
    }
    if (!Object.keys(own).length && !Object.keys(on).length) return DataFile.remove(mine)
    DataFile.write(mine, { version: COMMENTS_VERSION, comments: own, on })
  }

  ////////////////
  // ## A rename (`epic whoami --rename`)
  ////////////////

  /**
   * Move every comments file of `from` under `content` to `to`'s name (`slugOf()`):  the paths moved, `[from, to]`,
   * from `content`.  The names INSIDE them are `NameSweep`'s, run before.
   * - the same file name both ways (`ana` => `Ana`):  nothing to move
   * - `to` has a file there already (two names joined into one):  the two put together, `to`'s first
   * - `dryRun`:  moves nothing, says the same
   * - SIDE EFFECT:  renames and writes files
   */
  static rename(files: string[], from: string, to: string, { dryRun = false } = {}): [string, string][] {
    const [old, slug] = [SharedComments.slugOf(from), SharedComments.slugOf(to)]
    if (old === slug) return []
    const moved: [string, string][] = []
    for (const path of files) {
      if (!COMMENTS_FILE.test(path) || !path.endsWith(`${PART}${old}${DataFile.SUFFIX}`)) continue
      const target = `${path.slice(0, -`${old}${DataFile.SUFFIX}`.length)}${slug}${DataFile.SUFFIX}`
      moved.push([path, target])
      if (dryRun) continue
      if (!existsSync(target)) {
        renameSync(path, target)
        continue
      }
      const [kept, joining] = [DataFile.read<CommentsFile>(target), DataFile.read<CommentsFile>(path)]
      DataFile.write(target, {
        version: COMMENTS_VERSION,
        comments: { ...joining?.comments, ...kept?.comments },
        on: { ...joining?.on, ...kept?.on }
      })
      DataFile.remove(path)
    }
    return moved
  }
}

/**
 * A person's comments file (`SharedComments`):
 * - `comments`:  the comments they wrote, by id, each with everything said on it from their machine
 * - `on`:  what they said on other people's comments, by that comment's id
 */
export type CommentsFile = {
  version: number
  comments: Record<string, Comment>
  on: Record<string, ThreadAdds>
}

/** What one person said on someone else's thread (`CommentsFile.on`):  replies, a close, a reopen, their agent's claim. */
export type ThreadAdds = {
  replies?: CommentReply[]
  done?: Comment["done"]
  reopened?: Comment["reopened"]
  claim?: CommentClaim
  working?: string
}

/** The comments file's shape version. */
const COMMENTS_VERSION = 1

/** What names a comments file, before the person:  `<page>.comments.<slug>.json5`. */
const PART = ".comments."

/** A person's part of a comments file's name, with its suffix:  `ana-lima.json5`. */
const SLUGGED = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*\.json5$/u

/** A comments file's own part of its name, at the end of a path:  `.comments.ana-lima.json5`. */
const COMMENTS_FILE = /\.comments\.[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*\.json5$/u

/** The file of a person with no name, as `EpicHome.SOMEONE` says them. */
const SOMEONE = "someone"

/**
 * `comment`'s thread put in order once every file's part is in:  replies by time (the same one twice, once), closed
 * only by a close later than every reopen and every person's reply, `answered` once an agent answered a `new` one.
 */
function settle(comment: Comment): void {
  if (comment.replies?.length) {
    const seen = new Set<string>()
    comment.replies = comment.replies
      .filter((reply) => {
        const key = `${reply.by}\u0000${reply.at}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  }
  const done = comment.done?.at
  if (done) {
    const spoke = (comment.replies ?? []).some((reply) => !ThreadFacts.isAgents(reply) && isLater(reply.at, done))
    if (spoke || (comment.reopened && !isLater(done, comment.reopened.at))) delete comment.done
  }
  if (comment.status === "new" && comment.replies?.some((reply) => ThreadFacts.isAgents(reply)))
    comment.status = "answered"
}

/** Is ISO time `a` later than `b` (none:  any is)? */
function isLater(a: string, b: string | undefined): boolean {
  return !b || Date.parse(a) > Date.parse(b)
}

/** Is `value` a plain record? */
function isRecord(value: unknown): value is Record<string, never> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

/** The id one past the highest of `comments`' (`c3` after `c2`). */
function nextFree(comments: Record<string, Comment>): string {
  const numbers = Object.keys(comments).map((id) => Number(/^c(\d+)$/.exec(id)?.[1] ?? 0))
  return `c${Math.max(0, ...numbers) + 1}`
}
