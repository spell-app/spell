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
    expect(warnings).toEqual([
      expect.stringContaining('Your program already uses the name "file" for something it makes')
    ])
  })

  test("`can take a file when:` is `canTakeFile(file)`, the page's to ask as one is dropped;  never a card's `canTake()` (I167)", () => {
    const { code } = dropArea([
      "- can take a file when:",
      "\tthe file's size is less than 100",
      "- can take a folder when:",
      "\tyes",
      "- when a file is dropped on it:",
      "\tprint the file"
    ])
    expect(code).toMatch(/canTakeFile\(file\) \{\s+file\.size < 100/)
    expect(code).toMatch(/canTakeFolder\(folder\)/)
    expect(code).not.toMatch(/canTake\(/)
  })

  test("in Spanish, `puede tomar un archivo cuando:` is `canTakeFile(archivo)`;  a program's own `file` type keeps `canTake()`", () => {
    const contents = "una zona es una vista:\n\tpuede tomar un archivo cuando:\n\t\tsí\n"
    const { files } = parseSpellProject([{ path: "/zona.es.spell", contents }])
    expect(files[0]!.errors.map((error) => JSON.stringify(error))).toEqual([])
    expect(normalized(files[0]!.compiled)).toMatch(/canTakeFile\(archivo\)/)
    const own = dropArea(["- can take a file when:", "\tyes"], "a file is a thing\n")
    expect(own.code).toMatch(/canTake\(file\)/)
  })
})

describe("a project also compiled to Python is told its file lines do nothing there (epic `language` I166, B)", () => {
  /** The warnings on a drop area's `lines`, in a project compiling to `targets`. */
  function warningsIn(lines: string[], targets: string[], path = "/test.spell", head = "a drop area is a view where:") {
    const contents = `${head}\n${lines.map((line) => `\t${line}`).join("\n")}`
    const { files } = parseSpellProject([{ path, contents }], { targets })
    return describeWarnings(files[0]!.match)
  }
  const lines = [
    "when a file is dropped on it:",
    "\tprint the file",
    "can take a file when:",
    "\tyes",
    "when uploading:",
    "\tprint 1",
    "when a file is uploaded:",
    "\tprint the file"
  ]

  test("each file line warns, in the novice voice;  a project not compiled to Python hears nothing", () => {
    const warnings = warningsIn(lines, ["py"])
    expect(warnings).toHaveLength(4)
    for (const warning of warnings) expect(warning).toContain("turn into a Python program")
    expect(warningsIn(lines, [])).toEqual([])
    expect(warningsIn(lines, ["ts/solid"])).toEqual([])
  })

  test("in Spanish too", () => {
    const warnings = warningsIn(
      ["cuando un archivo se suelta sobre ella:", "\timprimir el archivo"],
      ["py"],
      "/zona.es.spell",
      "una zona es una vista:"
    )
    expect(warnings).toEqual([expect.stringContaining("programa de Python")])
  })
})

describe("the file uploader's words, English and Spanish (epic `language` P67, r32;  OK'd in from-console Q14)", () => {
  /** A view's outline of `lines`, in `language`:  its code, its parse errors left out of it. */
  function view(lines: string[], language: "en" | "es" = "en"): string {
    const head = language === "es" ? "una caja es una vista:" : "a box is a view where:"
    const contents = `${head}\n${lines.map((line) => `\t${line}`).join("\n")}`
    const { files } = parseSpellProject([{ path: language === "es" ? "/caja.es.spell" : "/box.spell", contents }])
    const file = files[0]!
    expect(file.errors.map((error) => JSON.stringify(error))).toEqual([])
    return normalized(file.compiled)
  }

  test("`when uploading:` with `cancel uploading`;  `while uploading:`;  after each file, `the file` in hand", () => {
    const code = view([
      "when uploading:",
      "\tcancel uploading",
      "while uploading:",
      "\tprint 1",
      "when a file is uploaded:",
      "\tprint the file",
      "when a file fails to upload:",
      "\tprint the file"
    ])
    expect(code).toMatch(/onUploading\(event\) \{\s+event\.cancel\(\)/)
    expect(code).toMatch(/whileUploading\(\) \{/)
    expect(code).toMatch(/whenFileUploaded\(file\) \{\s+core\.console\.log\(file\)/)
    expect(code).toMatch(/whenFileFailsToUpload\(file\) \{\s+core\.console\.log\(file\)/)
  })

  test("in Spanish:  the same methods, `el archivo` the same file", () => {
    const code = view(
      [
        "al subir:",
        "\tcancelar la subida",
        "mientras se sube:",
        "\timprimir 1",
        "cuando un archivo se sube:",
        "\timprimir el archivo",
        "cuando un archivo no se puede subir:",
        "\timprimir el archivo"
      ],
      "es"
    )
    expect(code).toMatch(/onUploading\(event\) \{\s+event\.cancel\(\)/)
    expect(code).toMatch(/whileUploading\(\) \{/)
    expect(code).toMatch(/whenFileUploaded\(archivo\) \{\s+core\.console\.log\(archivo\)/)
    expect(code).toMatch(/whenFileFailsToUpload\(archivo\) \{\s+core\.console\.log\(archivo\)/)
  })

  test("`the file as text`, `as json`, `as binary` READ the file, waiting for it:  never an `as` cast", () => {
    const code = view([
      "when a file is dropped on it:",
      "\tprint the file as text",
      "\tprint the file as json",
      "\tprint the file as binary",
      "\tprint 1 as text"
    ])
    expect(code).toContain('core.console.log(await core.readFile(file, "text"))')
    expect(code).toContain('core.console.log(await core.readFile(file, "json"))')
    expect(code).toContain('core.console.log(await core.readFile(file, "binary"))')
    // anything else `as text` is still the cast
    expect(code).toContain("core.console.log(`${1}`)")
    const es = view(
      [
        "cuando un archivo se suelta sobre ella:",
        "\timprimir el archivo como texto",
        "\timprimir el archivo como binario"
      ],
      "es"
    )
    expect(es).toContain('core.console.log(await core.readFile(archivo, "text"))')
    expect(es).toContain('core.console.log(await core.readFile(archivo, "binary"))')
  })

  test("`while uploading` asks for no subject:  it's this view's own uploader", () => {
    expect(view(["while uploading:", "\tprint 1"])).toMatch(/whileUploading\(\) \{\s+core\.console\.log\(1\)/)
  })
})
