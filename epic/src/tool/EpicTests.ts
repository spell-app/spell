import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import type { PlanDoc } from "./PlanDoc"
import { PlanDocFiles } from "./PlanDocFiles"
import { PlanItem } from "./PlanItem"
import { PlanMarkup } from "./PlanMarkup"
import { Sagas } from "./Sagas"

/****************
 * ### `EpicTests`
 * The node side of Owen's TEST RUN (epic `epic-engine` P4):  the page steps him through an epic's open tests,
 * one at a time, in the Review tab, and he answers each on the page.
 * - which tests are open, in the run's order (`openIn()`):  `epic test <epic> --list`
 * - which epics have open tests, in Owen's saga order (`waiting()`):  `epic test --all`, and the page server's
 *   `GET /api/epics/tests` (`epicRoutes.ts`), which the run's summary card asks for the next epic
 * - his screenshots:  `TestShots`
 * - a test's markup, as `epic add <epic>#T --step ...` writes it (`fieldsHTML()`):  Step, Should, Example, If not,
 *   each an `<epic-field label>` (`TEST_FIELDS`);  an older test has only prose, which the run shows as its Step
 * - Node only (`node:fs`):  NOT in the `spell-epic` barrel, imported by path.
 ****************/
export class EpicTests {
  /** the repo's content folder (`EpicConfig.contentOf()`):  its `epics/`, `sagas/` */
  readonly content: string

  /** The tests of the repo whose content folder is `content` (`EpicConfig.contentOf(<checkout>)`). */
  constructor(content: string) {
    this.content = content
  }

  ////////////////
  // ## Every epic's
  ////////////////

  /**
   * Every epic with open tests, `[{ epic, title, saga, open, page, href }]`, in Owen's saga order:
   * the sagas as his list has them (`Sagas.list()`), each one's epics by title, then the epics of no saga.
   * - read from each epic page's SKELETON:  every item's line is in it, so no parts are read
   * - `page`:  its URL path on the page server, `/epics/<e>/<e>.plan.html`;
   *   `href`:  the same from another epic page's folder, `../<e>/<e>.plan.html`
   * - gathered when asked:  nothing kept
   */
  waiting(): EpicTestCount[] {
    const epics = join(this.content, "epics")
    if (!existsSync(epics)) return []
    const order = new Sagas(this.content).list().map((saga) => saga.id)
    const found = readdirSync(epics, { withFileTypes: true }).flatMap((entry): EpicTestCount[] => {
      const file = entry.isDirectory() ? PlanDocFiles.planDocIn(join(epics, entry.name), entry.name) : undefined
      return file ? EpicTests.countIn(entry.name, readFileSync(file, "utf8"), basenameOf(file)) : []
    })
    const rank = (count: EpicTestCount) => {
      const at = count.saga ? order.indexOf(count.saga) : -1
      return at === -1 ? order.length : at
    }
    return found.sort(
      (a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" })
    )
  }

  /**
   * Epic `epic`'s open tests, as `waiting()` lists it, from its page's skeleton `html` (file name `fileName`);
   * `[]` when it has none, or no `<epic-page>`.
   * - TEXT, not a DOM, as `ReviewInbox.itemIds()` reads a page:  cheap for every epic on every ask
   */
  static countIn(epic: string, html: string, fileName: string): EpicTestCount[] {
    const page = /<epic-page\b[^>]*>/.exec(html)?.[0]
    if (!page) return []
    let open = 0
    for (const [tag] of html.matchAll(/<epic-item\b[^>]*>/g))
      if (TEST_ID.test(attribute(tag, "id") ?? "") && attribute(tag, "status") === "open") open++
    if (!open) return []
    const title = PlanMarkup.squeeze(decode(attribute(page, "title") ?? epic)).replace(/^Epic:\s*/, "")
    return [
      {
        epic,
        title,
        saga: attribute(page, "saga") ?? null,
        open,
        page: `/epics/${epic}/${fileName}`,
        href: `../${epic}/${fileName}`
      }
    ]
  }

  ////////////////
  // ## One epic's
  ////////////////

  /**
   * Epic page `plan`'s open tests, in the run's order:  page order, the deferred ones (Not now, before) last.
   * - each with what the run shows:  its Step (with its action links), Should, Example, If not;
   *   an older test, only prose:  `prose`, which the run shows as its Step
   * - `failed`:  the issue an earlier run filed it as (`<epic-item failed>`)
   */
  static openIn(plan: PlanDoc): OpenTest[] {
    const open = plan.itemsOf("test").filter((item) => item.getAttribute("status") === "open")
    const tests = open.map((item) => EpicTests.testOf(plan, item))
    return [...tests.filter((test) => !test.deferred), ...tests.filter((test) => test.deferred)]
  }

  /** Test `item` of `plan`, as `openIn()` lists it. */
  static testOf(plan: PlanDoc, item: Element): OpenTest {
    const field = (label: TestField) => item.querySelector(`:scope > epic-field[label="${label}"]`)
    const text = (element: Element | null) => (element ? PlanMarkup.squeeze(element.textContent ?? "") : undefined)
    const step = field("Step")
    const example = field("Example")
    const actions = Array.from(step?.querySelectorAll(`a.${TEST_ACTION}`) ?? [], (link) => ({
      text: PlanMarkup.squeeze(link.textContent ?? ""),
      href: link.getAttribute("href") ?? ""
    }))
    const image = example?.querySelector("img")?.getAttribute("src") ?? undefined
    return {
      id: item.id.toUpperCase(),
      title: PlanItem.titleOf(item),
      ...optional({
        deferred: item.getAttribute("deferred"),
        failed: item.getAttribute("failed")?.toUpperCase(),
        step: text(step),
        actions: actions.length ? actions : undefined,
        should: text(field("Should")),
        example: text(example) || undefined,
        image,
        ifNot: text(field("If not")),
        prose: step ? undefined : plan.textOf(item).details || undefined
      })
    }
  }

  /**
   * A test's markup from `epic add <epic>#M` / `epic details <epic>#M3`'s flags, as HTML:  the fields in their order,
   * Step, Should, Example, If not (`TEST_FIELDS`);  `""` when none is given.
   * - each value is HTML, as `--details` is:  a Step may hold ACTION links,
   *   `<a class="epic-test-action" href="...">Open the Epics page</a>`, shown as buttons in the run
   * - `example`:  `{ image?, text? }`:  the image's path from the epic page's folder (`tests/m3.png`), a line of text
   * - throws a `TypeError` for a Should without a Step, or the reverse:  a test says both
   */
  static fieldsHTML({ step, should, example, ifNot }: TestFieldValues): string {
    if (!step && !should && !example && !ifNot) return ""
    if (!step || !should) throw new TypeError("a test says both what to do (--step) and what should happen (--should)")
    const image = example?.image ? `<img src="${PlanMarkup.text(example.image)}" alt="What it should look like">` : ""
    const exampleHTML = [image, example?.text ? EpicTests.proseHTML(example.text) : ""].filter(Boolean).join(" ")
    const fields: [TestField, string | undefined][] = [
      ["Step", EpicTests.proseHTML(step)],
      ["Should", EpicTests.proseHTML(should)],
      ["Example", exampleHTML],
      ["If not", ifNot && EpicTests.proseHTML(ifNot)]
    ]
    return fields
      .filter(([, html]) => html)
      .map(([label, html]) => `<epic-field label="${label}">${html}</epic-field>`)
      .join("")
  }

  /**
   * A test field's value as HTML:  HTML stays as it is;  plain text (no tag in it) is made readable.
   * - why:  the fields take HTML, and a test written as plain text with its steps inline, `1. Open ... 2. Pick ...`,
   *   showed as one run-on paragraph (Owen, 2026-10-22:  "text is not markdown formatted")
   * - steps numbered from 1, inline or a line each:  a numbered list;  lines starting `- `:  a bullet list
   * - else paragraphs, at blank lines;  `` `code` `` in backticks becomes code;  everything else escaped
   * - a FENCED block (```` ```sh ```` ... ```` ``` ````, each on a line of its own) is a code block, kept line for line,
   *   inside its step when it's in one:  the test run shows it with a Copy button (epic `epic-engine` r16)
   */
  static proseHTML(value: string): string {
    if (HTML_TAG.test(value)) return value
    // The fenced blocks first, each a mark of its own paragraph, so their lines and numbers are never read as prose
    const blocks: string[] = []
    const text = value.trim().replace(FENCE, (_, language: string, code: string) => {
      const index = blocks.push(codeHTML(code, language)) - 1
      return `\n\n${BLOCK_MARK}${index}${BLOCK_MARK}\n\n`
    })
    const withBlocks = (html: string) =>
      html
        .replace(BLOCK_PARAGRAPH, (_, index: string) => blocks[Number(index)]!)
        .replace(BLOCK, (_, index: string) => blocks[Number(index)]!)
    const steps = EpicTests.stepsOf(text.trim())
    if (steps) return withBlocks(`<ol>${steps.map((step) => `<li>${inlineHTML(step)}</li>`).join("")}</ol>`)
    const lines = text
      .trim()
      .split("\n")
      .map((line) => line.trim())
    if (lines.length > 1 && lines.every((line) => !line || BULLET.test(line))) {
      const items = lines.filter(Boolean).map((line) => `<li>${inlineHTML(line.replace(BULLET, ""))}</li>`)
      return `<ul>${items.join("")}</ul>`
    }
    return withBlocks(
      text
        .trim()
        .split(/\n\s*\n/)
        .map((paragraph) => `<p>${inlineHTML(paragraph)}</p>`)
        .join("")
    )
  }

  /**
   * `text`'s numbered steps, when it is one:  `1. ...`, then `2. ...`, inline or a line each, numbered from 1 with
   * none skipped;  `undefined` for anything else (fewer than two, or a number out of order).
   * - a number counts only after a space or a line's start, followed by a dot and a space:  `steps 1-5`, `v1.2` and
   *   a path's dot are text
   */
  static stepsOf(text: string): string[] | undefined {
    const starts: number[] = []
    for (const match of text.matchAll(STEP_NUMBER)) {
      if (Number(match[2]) !== starts.length + 1) continue
      starts.push(match.index + match[1]!.length)
    }
    if (starts.length < 2 || starts[0] !== 0) return undefined
    return starts.map((start, index) =>
      text
        .slice(start, starts[index + 1])
        .replace(/^\d+\.\s+/, "")
        .replace(/\s+/g, " ")
        .trim()
    )
  }
}

/** Any HTML tag:  a field holding one is HTML, kept as given (`EpicTests.proseHTML()`). */
const HTML_TAG = /<[a-z][\w-]*[\s>/]/i

/** A step's number:  after the start or a space, a number, a dot, then a space (`EpicTests.stepsOf()`). */
const STEP_NUMBER = /(^|\s)(\d{1,2})\.\s/g

/** A bullet line's start:  `- ` or `* `. */
const BULLET = /^[-*]\s+/

/** A fenced code block:  ```` ``` ```` and its language on a line, the code, ```` ``` ```` on a line. */
const FENCE = /^[ \t]*```([\w-]*)[ \t]*\n([\s\S]*?)\n[ \t]*```[ \t]*$/gm

/** Marks a fenced block's place while the prose around it is read:  a private-use character no text has. */
const BLOCK_MARK = "\uE000"

/** A block's mark, `\uE0003\uE000`;  and the same as a paragraph of its own. */
const BLOCK = new RegExp(`${BLOCK_MARK}(\\d+)${BLOCK_MARK}`, "g")
const BLOCK_PARAGRAPH = new RegExp(`<p>\\s*${BLOCK_MARK}(\\d+)${BLOCK_MARK}\\s*</p>`, "g")

/** A fenced block as HTML:  `<pre><code class="language-sh">`, its text escaped, line for line. */
function codeHTML(code: string, language: string): string {
  const named = language ? ` class="language-${language}"` : ""
  return `<pre><code${named}>${PlanMarkup.text(code)}</code></pre>`
}

/** Plain text as HTML:  escaped, `` `code` `` as code, its lines run together. */
function inlineHTML(text: string): string {
  return PlanMarkup.text(text.replace(/\s+/g, " ").trim()).replace(/`([^`]+)`/g, "<code>$1</code>")
}

////////////////
// ## Types
////////////////

/** An epic with open tests, as `EpicTests.waiting()` lists it (`GET /api/epics/tests`). */
export type EpicTestCount = {
  /** its name, its folder's:  `seo` */
  epic: string
  /** its title, without `Epic: ` */
  title: string
  /** the saga it serves (`<epic-page saga>`), else `null` */
  saga: string | null
  /** how many of its tests are open */
  open: number
  /** its page's URL path on the page server:  `/epics/seo/seo.plan.html` */
  page: string
  /** its page from another epic page's folder:  `../seo/seo.plan.html` */
  href: string
}

/** An open test, as the run shows it (`EpicTests.openIn()`, `epic test <epic> --list --json`). */
export type OpenTest = {
  /** its id, upper case:  `M3` */
  id: string
  /** its title */
  title: string
  /** put off in an earlier run (Not now), that day:  the run puts it last */
  deferred?: string
  /** the issue an earlier run filed its failure as:  `I42` */
  failed?: string
  /** what to do, as text */
  step?: string
  /** the Step's action links:  pages to open, as the run's buttons */
  actions?: { text: string; href: string }[]
  /** what should happen */
  should?: string
  /** the Example's text */
  example?: string
  /** the Example's screenshot, from the epic page's folder:  `tests/m3.png` */
  image?: string
  /** what to tell Claude when it doesn't */
  ifNot?: string
  /** an older test's prose:  it has no Step, so the run shows this as one */
  prose?: string
}

/** `EpicTests.fieldsHTML()`'s values:  each HTML, the example an image path and / or a line of text. */
export type TestFieldValues = {
  step?: string
  should?: string
  example?: { image?: string; text?: string }
  ifNot?: string
}

////////////////
// ## Constants
////////////////

/**
 * A test's fields, in their order:  `<epic-field label>` (epic `epic-engine` P4).
 * - Step:  exactly what to do;  Should:  what should happen;  Example:  a screenshot and / or a line;
 *   If not:  what to tell Claude
 */
export const TEST_FIELDS = ["Step", "Should", "Example", "If not"] as const
/** One of `TEST_FIELDS`. */
export type TestField = (typeof TEST_FIELDS)[number]

/** The page server's route of the epics waiting to test (`epicRoutes.ts`):  `waiting()`'s answer. */
export const TESTS_API = "/api/epics/tests"

/** The class of a Step's action link:  a page to open, shown as a button in the run. */
export const TEST_ACTION = "epic-test-action"

/** A test item's id. */
const TEST_ID = /^m\d+$/

////////////////
// ## Helpers
////////////////

/** Attribute `name` of the tag text `tag`, else `undefined`. */
function attribute(tag: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
}

/** An attribute's text with the entities the tool writes decoded. */
function decode(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
}

/** A file's name:  `seo.plan.html`. */
function basenameOf(file: string): string {
  return file.slice(file.lastIndexOf("/") + 1)
}

/** `values` without the keys whose value is `undefined` or `null`:  a test's JSON keeps only what it has. */
function optional<T extends Record<string, unknown>>(values: T): Partial<{ [K in keyof T]: NonNullable<T[K]> }> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined && value !== null)
  ) as never
}
