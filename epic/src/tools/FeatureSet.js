/**
 * The FEATURE SET template (epic `epic-engine` P80):  a details page that's a ranked list to pick from, made from
 * data (`epic ask create <slug> --template feature-set --from <data.json5>`).
 * - Its starter data, to copy:  `templates/feature-set.json5` beside this;  its shape is `FeatureSetSpec`, below.
 * - After Solid TLDR (epic `solid-2-final`):  a table per section, three columns, Item | Your pick | Facts.
 * - Plain node JS, as `answerPages.js`, whose makers it builds with:  no HTML put together in strings.
 *   NEVER imports `details.js`, which imports it.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { parseHTML } from "linkedom"

import { ORDER_KEY, orderKeyFor } from "spell/epic/answers/answers.types.ts"
import {
  ASK,
  CHOICES,
  FIELD,
  OPTION,
  SECTION_FLAGS,
  TOOL_TEMPLATES,
  appendHTML,
  fillWords,
  htmlIn,
  make
} from "./answerPages.js"
import { fromTemplate } from "./pages.js"

/** The template's name, as `--template` takes it. */
export const FEATURE_SET = "feature-set"

/** The element that makes a page a Feature Set. */
const TAG = "epic-feature-set"

/** A section's attribute:  it's one of the list's, its id the value's. */
const SECTION = "data-feature-section"

/** The highest number given so far, on the page's element (sections) and on each section (its items). */
const LAST = "data-feature-last"

/** A name as data writes it:  `S2`, `F3`. */
const SECTION_NAME = /^s([1-9]\d*)$/i
const ITEM_NAME = /^f([1-9]\d*)$/i

/** An item's picks, and the one that greys its Priority out. */
const PICKS = [
  { letter: "Y", title: "Yes" },
  { letter: "N", title: "No" },
  { letter: "M", title: "Modify" },
  { letter: "R", title: "Revisit" }
]
const NO = "N"

/** An item's priorities, first to last. */
const PRIORITIES = ["1", "2", "3"].map((letter) => ({ letter, title: `Priority ${letter}` }))

/** The name of the follow-up question, and the tail of its key. */
const PRIORITY = "Priority"
const PRIORITY_SUFFIX = "-priority"

/** What the table's columns are:  never more than these three. */
const COLUMNS = [
  { name: "item", head: "Item" },
  { name: "pick", head: "Your pick" },
  { name: "facts", head: "Facts" }
]

/*
 * `FeatureSetSpec`, what `--from` reads (JSON5):
 * - `title`, `lede`, `askedBy`, `where`:  as a details page's (`DetailsSpec`);  HTML allowed except in titles
 * - `howToRead`:  a last line in "Where we are":  what the facts mean
 * - `changesTitle`:  the heading over each item's `changes` (default "What changes")
 * - `sections[]`:  `{ id?, title, text?, icon?, items[] }`, in the order shown
 * - an item:  `{ id?, title, text?, changes?, decided?, picked?, recommended?, priority?, facts? }`
 *   - `changes`:  a list of HTML lines
 *   - `decided`:  HTML after an "Already decided" label, for one the person picked before;  `picked` says which
 *   - `picked`, `recommended`:  `Y`, `N`, `M` or `R`
 *   - `priority`:  `{ recommended?, picked?, why? }`, each pick 1, 2 or 3
 *   - `facts`:  `{ label, value, why? }`s, e.g. Read, Risk, Depends
 * - `id`:  a name it has already, `S2` or `F3` (needed only when a round changes its title)
 */

/****************
 * ### `FeatureSet`
 * One Feature Set page, being made from its data.
 * - Names, `S1` and `F1`, STAY with what they name (Owen's answer to Q83, 2026-11-22):
 *   - written in the page as ids (`s1`, `s1f3`), which are the keys of the answer too
 *   - a reorder moves elements, and renames nothing
 *   - a new round keeps each by its `id`, else by its title;  a new one takes the next number never used
 *   - an item moved to another section is new there
 * - Links:  outside ones open a new tab, the page's own and the repo's open in this window (`aimLinks()`).
 ****************/
export class FeatureSet {
  /** Is parsed page `document` a Feature Set? */
  static isOne(document) {
    return !!document.querySelector(TAG)
  }

  /** The starter data's file, to copy. */
  static get starter() {
    return join(TOOL_TEMPLATES, `${FEATURE_SET}.json5`)
  }

  /** The template, parsed:  the head and an empty list. */
  static blankPage() {
    return parseHTML(fromTemplate(readFileSync(join(TOOL_TEMPLATES, `${FEATURE_SET}.html`), "utf8"))).document
  }

  /**
   * `document`:  the page being made, from `blankPage()`;  `spec`:  its data;
   * `previous`:  the page of the round before, whose names it keeps.
   */
  constructor({ document, spec, previous }) {
    this.document = document
    this.spec = spec
    this.previous = previous && FeatureSet.isOne(previous) ? previous : undefined
  }

  /**
   * Fill the page from its data.
   * - throws, naming the place, for data it can't draw, and for a name used twice or used before
   */
  fill() {
    const { document, spec } = this
    if (!spec?.sections?.length)
      throw new Error(`a Feature Set is made from data with sections:  --from <data.json5>, like ${FeatureSet.starter}`)
    fillWords(document, spec)
    if (spec.howToRead)
      document
        .querySelector("ui-message.spell-where")
        ?.append(appendHTML(make(document, FIELD, { label: "How to read it" }), spec.howToRead))
    const host = document.querySelector(TAG)
    const old = this.oldSections()
    const { named, last } = numbered(spec.sections, {
      old,
      last: Number(this.previous?.querySelector(TAG)?.getAttribute(LAST)) || 0,
      pattern: SECTION_NAME,
      what: "section"
    })
    host.setAttribute(LAST, String(last))
    const sections = named.map(({ number, entry }) =>
      this.section(entry, number, old.find((each) => each.number === number)?.element)
    )
    host.after(...sections)
    FeatureSet.aimLinks(document)
  }

  /** The sections of the round before, each with its number and title. */
  oldSections() {
    return [...(this.previous?.querySelectorAll(`ui-section[${SECTION}]`) ?? [])].map((element) => ({
      element,
      number: Number(element.id.slice(1)),
      title: (element.getAttribute("label") ?? "").replace(/^S\d+ · /, "")
    }))
  }

  /** The items of `section` in the round before. */
  oldItems(section) {
    return [...(section?.querySelectorAll("tr[data-feature-item]") ?? [])].map((row) => ({
      number: Number(row.id.slice(section.id.length + 1)),
      title: row.querySelector(".spell-feature-title > b")?.textContent.trim() ?? ""
    }))
  }

  /** Section `number`, from its data:  its title, its Reorder button, its table. */
  section(entry, number, previous) {
    const { document } = this
    const id = `s${number}`
    if (!entry.items?.length) throw new Error(`S${number} · ${entry.title}:  a section needs items`)
    const { named, last } = numbered(entry.items, {
      old: this.oldItems(previous),
      last: Number(previous?.getAttribute(LAST)) || 0,
      pattern: ITEM_NAME,
      what: `item in S${number}`
    })
    const reorder = make(
      document,
      "ui-button",
      {
        slot: "actions",
        "data-feature-reorder": id,
        size: "mini",
        appearance: "basic circular",
        icon: "arrows up down",
        "aria-label": `Reorder the items in S${number}`
      },
      ["Reorder"]
    )
    const table = make(document, "table", {}, [
      make(
        document,
        "colgroup",
        {},
        COLUMNS.map(({ name }) => make(document, "col", { class: `spell-feature-col-${name}` }))
      ),
      make(document, "thead", {}, [
        make(
          document,
          "tr",
          {},
          COLUMNS.map(({ head }) => make(document, "th", {}, [head]))
        )
      ]),
      make(
        document,
        "tbody",
        {},
        named.map((each) => this.row(each.entry, number, each.number))
      )
    ])
    return make(
      document,
      "ui-section",
      { id, label: `S${number} · ${entry.title}`, [SECTION]: true, [LAST]: last, ...SECTION_FLAGS },
      [
        make(document, "ui-icon", { slot: "icon", name: entry.icon ?? "list ol" }),
        ...(named.length > 1 ? [reorder] : []),
        ...(entry.text ? [htmlIn(document, "p", entry.text)] : []),
        make(document, "ui-table", { class: "spell-feature-table spell-full-width", celled: true, compact: true }, [
          table
        ])
      ]
    )
  }

  /** One item's row:  its name and text, its pick, its facts. */
  row(item, section, number) {
    const { document, spec } = this
    const id = `s${section}f${number}`
    const name = id.toUpperCase()
    const link = make(
      document,
      "a",
      { class: "spell-feature-name", href: `#${id}`, "aria-label": name, "data-tooltip": `Link to ${name}` },
      [`F${number}`]
    )
    const told = make(document, "td", { class: "spell-feature-item" }, [
      make(document, "p", { class: "spell-feature-title" }, [link, " ", make(document, "b", {}, [item.title])])
    ])
    if (item.decided)
      told.append(
        appendHTML(
          make(document, "p", {}, [
            make(document, "ui-label", { size: "mini", color: "green" }, ["Already decided"]),
            " "
          ]),
          item.decided
        )
      )
    if (item.text) told.append(htmlIn(document, "p", item.text))
    if (item.changes?.length)
      told.append(
        make(document, "p", { class: "spell-feature-changes-head" }, [
          make(document, "b", {}, [spec.changesTitle ?? "What changes"])
        ]),
        make(
          document,
          "ul",
          { class: "spell-feature-changes" },
          item.changes.map((line) => htmlIn(document, "li", line))
        )
      )
    return make(document, "tr", { id, "data-feature-item": true }, [
      told,
      make(document, "td", { class: "spell-feature-pick" }, [this.pick(item, id, name)]),
      this.facts(item)
    ])
  }

  /** An item's Your pick:  the pick, the Priority in it, then the one comment box the question draws. */
  pick(item, id, name) {
    const { document } = this
    const { recommended, picked: priorityPicked, why } = item.priority ?? {}
    const priority = make(
      document,
      ASK,
      { slot: "then", compact: true, name: `${id}${PRIORITY_SUFFIX}`, label: PRIORITY, "off-for": NO },
      [
        // plain text, not an `<epic-question>`:  that draws a "Question" label, and this is the item's second pick
        appendHTML(make(document, "p", {}, [make(document, "b", {}, [PRIORITY]), ...(why ? [" "] : [])]), why),
        this.choices(PRIORITIES, { recommended, picked: priorityPicked, where: `${name}'s priority` })
      ]
    )
    return make(document, ASK, { compact: true, "no-chip": true, name: id, label: `${name} · ${item.title}` }, [
      this.choices(PICKS, { recommended: item.recommended, picked: item.picked, where: name }),
      priority
    ])
  }

  /** The options of a pick, the recommended and the picked marked;  throws for a letter it hasn't. */
  choices(options, { recommended, picked, where }) {
    const marks = [recommended, picked].map((letter) =>
      letter === undefined || letter === null ? undefined : String(letter)
    )
    const letters = options.map((option) => option.letter)
    for (const letter of marks)
      if (letter !== undefined && !letters.includes(letter))
        throw new Error(`${where}:  '${letter}' isn't one of ${letters.join(", ")}`)
    return make(
      this.document,
      CHOICES,
      { fixed: true },
      options.map(({ letter, title }) =>
        make(this.document, OPTION, {
          selected: letter === marks[1],
          letter,
          title,
          recommended: letter === marks[0]
        })
      )
    )
  }

  /** An item's Facts cell:  a line each, its reason muted. */
  facts(item) {
    const { document } = this
    const lines = (item.facts ?? []).map(({ label, value, why }) => {
      const line = make(document, "p", {}, [make(document, "b", {}, [label]), " "])
      appendHTML(line, value === undefined ? "" : String(value))
      if (why) line.append(" ", appendHTML(make(document, "span", { class: "spell-feature-why" }), String(why)))
      return line
    })
    return make(document, "td", { class: "spell-feature-facts" }, lines)
  }

  /** Aim the links of `document`'s text:  another site's opens a new tab, every other one this window. */
  static aimLinks(document) {
    for (const link of document.querySelectorAll("main a[href], main ui-breadcrumb[link]")) {
      link.removeAttribute("target")
      if (!/^(https?:)?\/\//i.test(link.getAttribute("href") ?? "")) continue
      link.setAttribute("target", "_blank")
      link.setAttribute("rel", "noopener")
    }
  }

  ////////////////
  // ## The answer, for Claude
  ////////////////

  /**
   * The answer's lines about the order, for `epic ask answer`:  the sections', then each section's items';
   * one put back as it was written says so while it's new.
   * - `changed`:  the keys new since the send before;  `isNew(key)`:  how a line says so
   */
  static orderLines(document, answer, { changed, isNew }) {
    if (!FeatureSet.isOne(document)) return []
    const lists = [
      { key: ORDER_KEY, what: "of the sections" },
      ...[...document.querySelectorAll(`ui-section[${SECTION}]`)].map((section) => ({
        key: orderKeyFor(section.id),
        what: `in ${section.id.toUpperCase()}`
      }))
    ]
    return lists.flatMap(({ key, what }) => {
      const ids = answer.answers?.[key]?.picked ?? []
      if (ids.length) return [`  New order ${what}:  ${ids.map((id) => id.toUpperCase()).join(", ")}${isNew(key)}`]
      return changed.has(key) ? [`  The order ${what} is back as the page has it${isNew(key)}`] : []
    })
  }
}

/**
 * `entries` numbered, in their order:  by the `id` each gives, else by its title in the round before (`old`),
 * else the next number never used (after `last`).
 * - throws for an entry with no title, an `id` that isn't a name, one used twice, or a retired one
 */
function numbered(entries, { old, last, pattern, what }) {
  const used = Math.max(last, ...old.map((each) => each.number))
  const numbers = entries.map((entry) => {
    if (!entry.title) throw new Error(`every ${what} needs a title`)
    if (entry.id === undefined) return undefined
    const number = Number(pattern.exec(String(entry.id))?.[1])
    if (!number) throw new Error(`${entry.title}:  '${entry.id}' isn't a name like S1 or F1`)
    if (number <= used && !old.some((each) => each.number === number))
      throw new Error(`${entry.title}:  ${entry.id} named another ${what} before, and a name is never used again`)
    return number
  })
  const given = numbers.filter((number) => number !== undefined)
  if (new Set(given).size < given.length) throw new Error(`two ${what}s have the same id`)
  const taken = new Set(given)
  entries.forEach((entry, i) => {
    if (numbers[i] !== undefined) return
    const kept = old.find((each) => !taken.has(each.number) && each.title === String(entry.title).trim())
    if (!kept) return
    numbers[i] = kept.number
    taken.add(kept.number)
  })
  let next = Math.max(used, ...taken)
  entries.forEach((_entry, i) => {
    numbers[i] ??= ++next
  })
  return { named: entries.map((entry, i) => ({ entry, number: numbers[i] })), last: next }
}
