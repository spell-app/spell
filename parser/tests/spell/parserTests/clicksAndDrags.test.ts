import { describe, expect, test } from "vite-plus/test"

import { describeWarnings, parseSpellProject } from "spell/parser/spell/test"

/**
 * Clicks and drags as events (epic `debut` P27, Q47):  every short form compiles to the same code as its long form,
 * in the outline and in tags.
 * - Each case is a card and a pile with ONE line (or tag) that differs:  the long form, then its short forms.
 */

/** The outline every case's line sits in:  `{card}` and `{pile}` are where its line goes. */
const OUTLINE = [
  "a card is a two sided view where:",
  "\t- to play it:",
  "\t\tprint 1",
  "{card}",
  "a pile is a viewable list of cards where:",
  "{pile}"
].join("\n")

/** The same in tags. */
const TAGS = [
  '<spell-view "card" template="two sided view">',
  '\t<action "play it">print 1</>',
  "{card}",
  "</spell-view>",
  '<spell-view "pile" template="viewable list of cards">',
  "{pile}",
  "</spell-view>"
].join("\n")

/** Each case:  where its line goes, its long form, then the short forms that must compile the same. */
const OUTLINE_CASES: Array<{ title: string; at: "card" | "pile"; long: string; short: string[] }> = [
  {
    title: "an ability with a condition:  no `it is`, no colon",
    at: "card",
    long: "- it is clickable when: it is face down",
    short: [
      "- clickable when it is face down",
      "- clickable when: it is face down",
      "- it is clickable when it is face down"
    ]
  },
  { title: "an ability alone", at: "card", long: "- it is draggable", short: ["- draggable"] },
  {
    title: "a one-line event:  no colon",
    at: "card",
    long: "- on click:\n\t\tplay it",
    short: ["- on click play it", "- on click: play it", "- when clicked play it", "- when clicked: play it"]
  },
  {
    title: "the passive events",
    at: "card",
    long: "- on double click: play it",
    short: ["- when double clicked play it", "- on double click play it"]
  },
  { title: "on drag", at: "card", long: "- on drag: print 2", short: ["- when dragged print 2", "- on drag print 2"] },
  {
    title: "on drag cancelled",
    at: "card",
    long: "- on drag cancelled: print 3",
    short: ["- on drag cancelled print 3", "- when drag is cancelled print 3", "- when the drag is cancelled: print 3"]
  },
  {
    title: "a drop:  `on` or `when`, the small words optional, `on it` understood",
    at: "pile",
    long: "- when a card is dropped on it:\n\t\tprint 5",
    short: [
      "- on card dropped: print 5",
      "- on card dropped print 5",
      "- when a card is dropped: print 5",
      "- when card dropped on it print 5",
      "- on a card is dropped on it: print 5"
    ]
  },
  {
    title: "dragged out",
    at: "pile",
    long: "- when a card is dragged out of it: print 6",
    short: ["- on card dragged out: print 6", "- when card is dragged out print 6"]
  },
  {
    title: "while dragged over",
    at: "pile",
    long: "- while a card is dragged over it: print 4",
    short: ["- while card dragged over: print 4", "- while a card is dragged over print 4"]
  },
  {
    title: "a list's rule says `when`;  its cards' short form",
    at: "pile",
    long: "- its cards are draggable when the card is face up",
    short: ["- its cards are draggable when: the card is face up"]
  },
  {
    title: "droppable when:  the list's `can take`",
    at: "pile",
    long: "- it can take a card when: the card is face down\n\t- it is droppable",
    short: ["- droppable when the card is face down", "- it is droppable when: the card is face down"]
  }
]

/** Tag cases:  the long form in the outline twin's words, or a long tag, then the short tags. */
const TAG_CASES: Array<{ title: string; at: "card" | "pile"; long: string; short: string[] }> = [
  {
    title: "a one-line event, self-closing;  the colon optional",
    at: "card",
    long: "\t<on click>\n\t\tplay it\n\t</>",
    short: [
      "\t<on click play it/>",
      "\t<on click: play it />",
      "\t<when clicked play it/>",
      "\t<on click>play it</on>",
      "\t<on click>\n\t\tplay it\n\t</on click>"
    ]
  },
  {
    title: "an ability's own tag, its condition's colon optional",
    at: "card",
    long: "\t<clickable when it is face down/>",
    short: [
      "\t<clickable when: it is face down/>",
      "\t<clickable when(it is face down)/>".replace("(", " ").replace(")", "")
    ]
  },
  {
    title: "a drop, the small words optional",
    at: "pile",
    long: "\t<when a card is dropped on it>\n\t\tprint 5\n\t</>",
    short: ["\t<on card dropped print 5/>", "\t<when a card is dropped>print 5</>", "\t<on card dropped: print 5/>"]
  },
  {
    title: "while, one line or nested",
    at: "pile",
    long: "\t<while a card is dragged over it>\n\t\tprint 4\n\t</>",
    short: ["\t<while a card is dragged over: print 4/>", "\t<while card dragged over print 4/>"]
  },
  {
    title: "a list's items draggable",
    at: "pile",
    long: "\t<cards draggable when the card is face up/>",
    short: ["\t<cards draggable when: the card is face up/>"]
  }
]

describe("clicks and drags as events:  each short form compiles as its long form (epic `debut` P27, Q47)", () => {
  describe("in the outline", () => {
    for (const { title, at, long, short } of OUTLINE_CASES) {
      test(title, () => {
        const expected = compile("/test.spell", OUTLINE, at, `\t${long}`)
        for (const form of short) expect(compile("/test.spell", OUTLINE, at, `\t${form}`), form).toBe(expected)
      })
    }
  })

  describe("in tags", () => {
    for (const { title, at, long, short } of TAG_CASES) {
      test(title, () => {
        const expected = compile("/test.spellml", TAGS, at, long)
        for (const form of short) expect(compile("/test.spellml", TAGS, at, form), form).toBe(expected)
      })
    }
  })

  test("a list's cards' short form is its `can give up`, and makes its cards draggable", () => {
    const code = compile("/test.spell", OUTLINE, "pile", "\t- its cards are draggable when the card is face up")
    const long = compile("/test.spell", OUTLINE, "pile", "\t- it can give up a card when: the card is face up")
    expect(code).toBe(long.replace(/(canGiveUp\(card\) \{\n.*\n  \})/, "$1\n  static itemsDraggable = true"))
  })

  test("an ability's tag, the view's bare attribute and the outline's line are the same ability", () => {
    const tag = compile("/test.spellml", TAGS, "card", "\t<draggable/>")
    const attribute = compile(
      "/test.spellml",
      TAGS.replace('template="two sided view"', 'template="two sided view" draggable'),
      "card",
      ""
    )
    expect(attribute).toBe(tag)
    expect(tag).toContain("static draggable = true")
  })

  test("the old words still compile, with a warning", () => {
    const { warnings, code } = compileWithWarnings(
      "- it can be dragged",
      "- it can take a card if: the card is face up"
    )
    expect(code).toContain("static draggable = true")
    expect(code).toMatch(/canTake\(card\) \{\s+card\.isFaceDirection\("up"\)/)
    expect(warnings).toEqual([
      expect.stringContaining('Say "it is draggable":  "it can be dragged" stops working'),
      expect.stringContaining('Say "when:"')
    ])
  })

  test("a one-line tag's code on new lines is an error;  so is a closer naming another tag", () => {
    const errors = errorsOf(
      "/test.spellml",
      TAGS,
      "card",
      "\t<on drag print 1\n\t\tprint 2 />\n\t<on click>\n\t\tprint 3\n\t</on drag>"
    )
    const text = errors.join("\n").replace(/\\"/g, '"')
    expect(text).toContain('put longer code between "<on drag>" and "</>"')
    expect(text).toContain('"</on drag>" can\'t close <on>')
  })
})

/** The javascript for `template` with `line` at `at`, its comments left out;  throws on a parse error. */
function compile(path: string, template: string, at: "card" | "pile", line: string): string {
  const errors = errorsOf(path, template, at, line)
  if (errors.length) throw new Error(`parse errors in ${line}:\n${errors.join("\n")}`)
  return compiledOf(path, template, at, line)
}

/** The project's one file for `template` with `line` at `at`. */
function fileOf(path: string, template: string, at: "card" | "pile", line: string) {
  const contents = template.replace(`{${at}}`, line).replace(/\{card\}|\{pile\}/, "")
  const { files } = parseSpellProject([{ path, contents }])
  return files[0]!
}

/** The compiled javascript, comments and declarations left out. */
function compiledOf(path: string, template: string, at: "card" | "pile", line: string): string {
  const compiled = fileOf(path, template, at, line).compiled
  return normalized(compiled)
}

/** Each parse error's message. */
function errorsOf(path: string, template: string, at: "card" | "pile", line: string): string[] {
  return fileOf(path, template, at, line).errors.map((error) => JSON.stringify(error))
}

/** The outline with `cardLine` and `pileLine`:  its code and its warnings. */
function compileWithWarnings(cardLine: string, pileLine: string): { code: string; warnings: string[] } {
  const contents = OUTLINE.replace("{card}", `\t${cardLine}`).replace("{pile}", `\t${pileLine}`)
  const { files } = parseSpellProject([{ path: "/test.spell", contents }])
  const file = files[0]!
  return { code: normalized(file.compiled), warnings: describeWarnings(file.match) }
}

/**
 * `compiled` without its comments, declarations and blank lines, which name source lines;
 * and without `return`, which a handler's body on its own line has, and one indented under it doesn't.
 */
function normalized(compiled: string): string {
  return compiled
    .replace(/\/\*! SPELL: DECLARES[^]*?\*\//g, "")
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("//"))
    .map((line) => line.replace(/^(\s+)return /, "$1"))
    .join("\n")
}
