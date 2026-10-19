/**
 * Loose types and constants of the `epic-thread` family:  a comment's THREAD (`<epic-thread>`), its messages
 * (`<epic-thread-message>`) and the box of threads under one block (`<epic-threads>`), as the docs runtime's comments
 * draw them on every page that takes comments (epic `epic-engine` P3).
 * - Data only:  nothing here runs.  The vocabularies read it too.
 */

import type { UIJSXAttributes } from "$/epics/components/epic-page/EpicPage.types"

////////////////
// ## A thread
////////////////

/**
 * Where Owen's words stand in for a message (`<epic-thread boxed>`):  they're in the box under the thread, to change,
 * so the thread leaves them out.
 * - `first`:  his first words, in the pen's box, while Claude hasn't had them
 * - `pending`:  his pending reply, in the reply box (his last words, not taken since)
 */
export const THREAD_BOXED = ["first", "pending"] as const

/** One of `THREAD_BOXED`. */
export type ThreadBoxed = (typeof THREAD_BOXED)[number]

/** The event a thread sends when its header is clicked:  `{ open }`, as it now stands. */
export const THREAD_FOLD = "epic-thread-fold"

/** The event a thread's pen sends:  Owen will change his first words. */
export const THREAD_EDIT = "epic-thread-edit"

/** The event a thread's trash sends:  Owen deletes the comment. */
export const THREAD_DELETE = "epic-thread-delete"

/** Classes of a thread's shadow markup (`EpicThread.css`). */
export const BASE = "base"
export const HEAD = "head"
export const FOLD = "fold"
export const CHEVRON = "chevron"
export const MARK = "mark"
export const DONE = "done"
export const ID = "id"
export const HEADLINE = "headline"
export const TOOL = "tool"
export const BODY = "body"
export const MOVED = "moved"
export const HTML = "html"
export const CHECK = "check"
export const SPIN = "spin"
export const REPLY = "reply"
export const FLOPPY = "floppy"

////////////////
// ## A message
////////////////

/**
 * Who said a message (`<epic-thread-message by>`), which its colour says:
 * - `owen`:  his words, plain on the thread's ivory
 * - `claude`:  Claude's, a light violet box
 * - `done`:  the green Done line, once closed
 * - `thinking`:  Claude thinking about it now:  the stub his answer replaces
 */
export const MESSAGE_BY = ["owen", "claude", "done", "thinking"] as const

/** One of `MESSAGE_BY`. */
export type MessageBy = (typeof MESSAGE_BY)[number]

/** Classes of a message's shadow markup (`EpicThreadMessage.css`). */
export const ROOM = "room"
export const WHEN = "when"
export const WORDS = "words"
export const WHO = "who"

/**
 * `<epic-thread>`'s family in JSX:  the tags a thread draws in its shadow root.
 * - Types only.
 */
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      "epic-thread-message": UIJSXAttributes
    }
  }
}
