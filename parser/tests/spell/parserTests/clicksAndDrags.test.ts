import { describe, expect, test } from "vite-plus/test"

import { describeWarnings, parseSpellProject } from "spell/parser/spell/test"

/**
 * Clicks and drags as events (epic `debut` P27, Q47):  every short form compiles to the same code as its long form,
 * in the outline.
 * - Each case is a card and a pile with ONE line that differs:  the long form, then its short forms.
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

describe("clicks and drags as events:  each short form compiles as its long form (epic `debut` P27, Q47)", () => {
  describe("in the outline", () => {
    for (const { title, at, long, short } of OUTLINE_CASES) {
      test(title, () => {
        const expected = compile("/test.spell", OUTLINE, at, `\t${long}`)
        for (const form of short) expect(compile("/test.spell", OUTLINE, at, `\t${form}`), form).toBe(expected)
      })
    }
  })

  test("a list's cards' short form is its `can give up`, and makes its cards draggable", () => {
    const code = compile("/test.spell", OUTLINE, "pile", "\t- its cards are draggable when the card is face up")
    const long = compile("/test.spell", OUTLINE, "pile", "\t- it can give up a card when: the card is face up")
    expect(code).toBe(long.replace(/(canGiveUp\(card\) \{\n.*\n  \})/, "$1\n  static itemsDraggable = true"))
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

describe("files and folders dragged in from the desktop:  the drag lines, `file` or `folder` their thing (epic `language` P67, Q78)", () => {
  /** A drop area with `lines` in its outline:  its code and its warnings. */
  function dropArea(lines: string[], before = ""): { code: string; warnings: string[] } {
    const contents = `${before}a drop area is a view where:\n${lines.map((line) => `\t${line}`).join("\n")}`
    const { files } = parseSpellProject([{ path: "/test.spell", contents }])
    const file = files[0]!
    expect(file.errors.map((error) => JSON.stringify(error))).toEqual([])
    return { code: normalized(file.compiled), warnings: describeWarnings(file.match) }
  }

  test("the four lines Q78 OK'd, and the one from-console asked for:  `File` or `Folder` in the method the page calls", () => {
    const { code, warnings } = dropArea([
      "- when a file is dragged over it:",
      "\tprint 1",
      "- when a file is dragged out of it:",
      "\tprint 2",
      "- when a file is dropped on it:",
      "\tprint the file",
      "- while a file is dragged over it:",
      "\tprint 3",
      "- when a folder is dropped on it:",
      "\tprint the folder"
    ])
    expect(warnings).toEqual([])
    expect(code).toMatch(/whenFileDraggedOver\(file\)/)
    expect(code).toMatch(/whenFileDraggedOutOf\(file\)/)
    expect(code).toMatch(/whenFileDroppedOn\(file\) \{\s+core\.console\.log\(file\)/)
    expect(code).toMatch(/whileFileDraggedOver\(file\)/)
    expect(code).toMatch(/whenFolderDroppedOn\(folder\) \{\s+core\.console\.log\(folder\)/)
  })

  test("a program's own `file` type wins, with a warning:  its own files, not the desktop's", () => {
    const { code, warnings } = dropArea(["- when a file is dropped on it:", "\tprint the file"], "a file is a thing\n")
    expect(code).toMatch(/whenFileDroppedOn\(file\)/)
    expect(warnings).toEqual([expect.stringContaining('Your program makes its own kind of thing called "file"')])
  })
})
