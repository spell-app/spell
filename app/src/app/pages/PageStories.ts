import { SiteEdits } from "./SiteEdits"

/****************
 * ### `PageStories`
 * A page's STORIES, read from its file and written back (epic `mockup` P6, P17):  what the page must let people do,
 * kept with it for good, through the mockup and into the real site.
 * - Written in the page's own declaration, first in its body, one `<story>` tag each:
 *   - spellx:  `<stories>` ... `</stories>`, in Spanish `<encanto-historias>` ... `</>`
 *   - code spell:  `<stories>` ... `</stories>`
 *   - both compile to the page's `static stories`;  the running page draws nothing for them.
 * - A story is one piece of text:  its words, then two blank lines and its description, if it has one.
 * - `<story "S1" done>`:  each numbered when it's first written, the number staying with it as stories move.
 * - Plain text in, text out, as `SiteEdits` is:  it loads no parser, so it's tested in node;
 *   the site editor applies the result as one step of the editor's history (`SiteWrites.changeStories()`).
 * - Static and instance-free on purpose:  it holds nothing, and every caller has its own text.
 ****************/
export class PageStories {
  /**
   * Page `name`'s stories, as `text` has them;  `[]` for none written yet.
   * - `undefined` when `text` doesn't declare the page:  another file's, or another project's (a notebook a site
   *   imports), whose stories are written there.
   */
  static of(text: string, name: string): PageStory[] | undefined {
    const declared = SiteEdits.declarationOf(text, name)
    if (!declared) return undefined
    const block = PageStories.blockIn(text, declared)
    return block ? PageStories.parsed(block.inside) : []
  }

  /**
   * `text` with page `name`'s stories `stories`:  its block written, replaced, or taken out when `stories` is empty.
   * - A page written `<spell-page "x"/>` opens up to hold them;  `a "x" is a page` gains its `:`.
   * - `language`:  whose words a new block is written in;  a block already there keeps its own.
   * - throws `TypeError` when `text` doesn't declare the page
   */
  static withStories(text: string, name: string, stories: readonly PageStory[], language: "en" | "es" = "en"): string {
    const declared = SiteEdits.declarationOf(text, name)
    if (!declared) {
      throw new TypeError(
        `PageStories.withStories():  this file doesn't declare "${name}";  its stories go where it's declared`
      )
    }
    const head = text.slice(declared.start, text.indexOf("\n", declared.start) + 1 || declared.end)
    const form = head.startsWith("<") ? "spellx" : "code"
    const block = PageStories.blockIn(text, declared)
    const words = PageStories.wordsFor(form, language, block?.tag)
    const written = stories.length ? PageStories.blockText(words, stories) : ""
    if (block) return text.slice(0, block.span.start) + written + text.slice(block.span.end)
    if (!written) return text
    const headEnd = declared.start + head.length
    const firstLine = head.replace(/\r?\n$/, "")
    if (form === "spellx" && /\/>\s*$/.test(firstLine)) {
      const opened = firstLine.replace(/\s*\/>\s*$/, ">")
      return text.slice(0, declared.start) + `${opened}\n${written}</>\n` + text.slice(headEnd)
    }
    const withColon = form === "code" && !firstLine.trimEnd().endsWith(":") ? `${firstLine.trimEnd()}:` : firstLine
    // code spell reads two raw-text blocks on lines next to each other as one:  a blank line before a `<markdown>`
    const apart = form === "code" && /^[ \t]+<(?:markdown|stories)>/.test(text.slice(headEnd)) ? "\n" : ""
    return text.slice(0, declared.start) + `${withColon}\n${written}${apart}` + text.slice(headEnd)
  }

  /** A new story:  its words, empty when just added, for the person to fill in;  its number comes when it's written. */
  static newStory(text: string): PageStory {
    return { text, done: false }
  }

  /** How many of `stories` are ticked off. */
  static doneIn(stories: readonly PageStory[]): number {
    return stories.filter((story) => story.done).length
  }

  ////////////////
  // ## Reading and writing the block
  ////////////////

  /** The stories block in declaration `declared` of `text`:  its lines, its tag, and what's between its tags. */
  private static blockIn(text: string, declared: { start: number; end: number }): StoriesBlock | undefined {
    const body = text.slice(declared.start, declared.end)
    const open = OPENER.exec(body)
    if (!open) return undefined
    const start = declared.start + open.index
    const indent = open[1]!
    const after = start + open[0].length
    const close = new RegExp(`^${indent}<\\/(?:${open[2]})?>[ \\t]*(?:\\r?\\n|$)`, "m")
    const rest = text.slice(after, declared.end)
    const closed = close.exec(rest)
    if (!closed) return undefined
    return {
      span: { start, end: after + closed.index + closed[0].length },
      tag: open[2]!,
      inside: rest.slice(0, closed.index)
    }
  }

  /** The stories between a block's tags. */
  private static parsed(inside: string): PageStory[] {
    return [...inside.matchAll(STORY)].map(([, , id, attributes, body]) => ({
      ...(id && { id }),
      text: unescaped(textOf(body!)),
      done: DONE.test(attributes!)
    }))
  }

  /** How a block is written, for `form`:  its tag, its closer, a story's tag and what says it's done. */
  private static wordsFor(form: "spellx" | "code", language: "en" | "es", tag: string | undefined): BlockWords {
    const isSpanish = tag ? /historias/.test(tag) : language === "es"
    // the short words, `<stories>`, `<historias>` (epic `language` P41)
    const opener = tag ?? (isSpanish && form === "spellx" ? "historias" : "stories")
    return {
      opener,
      closer: isSpanish && form === "spellx" ? "</>" : `</${opener}>`,
      story: isSpanish ? "historia" : "story",
      done: isSpanish ? "hecha" : "done",
      idLetter: isSpanish ? "H" : "S"
    }
  }

  /** The block for `stories`, one tab in, each story two:  ready to put first in a page's body. */
  private static blockText(words: BlockWords, stories: readonly PageStory[]): string {
    const number = (id: string | undefined) => Number(/\d+$/.exec(id ?? "")?.[0] ?? 0)
    let last = Math.max(0, ...stories.map((story) => number(story.id)))
    const items = stories.map((story) => {
      const id = story.id ?? `${words.idLetter}${++last}`
      return PageStories.storyText(words, id, story)
    })
    return `\t<${words.opener}>\n${items.join("\n")}\n\t${words.closer}\n`
  }

  /** One story's tag:  on one line for words on one line, else its lines one tab further in, blank ones left blank. */
  private static storyText(words: BlockWords, id: string, { text, done }: PageStory): string {
    const opened = `\t\t<${words.story} "${id}"${done ? ` ${words.done}` : ""}>`
    const closed = `</${words.story}>`
    const written = escaped(text.trim())
    if (!written.includes("\n")) return `${opened}${written}${closed}`
    const lines = written.split("\n").map((line) => (line.trim() ? `\t\t\t${line}` : ""))
    return `${opened}\n${lines.join("\n")}\n\t\t${closed}`
  }
}

/** One story of a page:  what it must let people do. */
export type PageStory = {
  /** Its number, `S1`:  none until it's first written. */
  id?: string
  /** Its words:  `see a film's opening crawl`;  two blank lines, then its description, if it has one. */
  text: string
  /** Ticked off? */
  done: boolean
}

/** A stories block in a page's declaration. */
type StoriesBlock = {
  /** Where it's written. */
  span: { start: number; end: number }
  /** Its tag:  `stories`, `spell-stories`, `encanto-historias`. */
  tag: string
  /** What's between its tags. */
  inside: string
}

/** How a stories block is written. */
type BlockWords = { opener: string; closer: string; story: string; done: string; idLetter: string }

/** A stories block's first line, in either form:  `\t<stories>`;  its indent, and its tag. */
const OPENER = /^([ \t]*)<(spell-stories|encanto-historias|historias|stories)>[ \t]*\r?\n/m

/** One `<story "S1" done>...</story>`:  its tag's word, its number, the rest of its tag, what's inside. */
const STORY = /<(story|historia)\b\s*(?:"([^"]*)")?([^>]*)>([^]*?)<\/\1>/g

/** What says a story is done. */
const DONE = /(?:^|\s)(?:done|hecha)(?:\s|$)/

/** A story's text from what's inside its tag:  the shared indent off its lines, no blank lines round it. */
function textOf(body: string): string {
  const lines = body.split("\n")
  const indents = lines.slice(1).flatMap((line) => (line.trim() ? [/^[ \t]*/.exec(line)![0].length] : []))
  const shared = indents.length ? Math.min(...indents) : 0
  return [lines[0]!, ...lines.slice(1).map((line) => line.slice(shared))].join("\n").trim()
}

/** `text` safe inside a tag:  a `</` of its own would close it. */
function escaped(text: string): string {
  return text.replaceAll("</", "&lt;/")
}

/** `text` as it was typed. */
function unescaped(text: string): string {
  return text.replaceAll("&lt;/", "</")
}
