import { execFileSync } from "child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join, resolve } from "path"
import { describe, expect, test } from "vite-plus/test"

import { core } from "spell/parser/core"
import { P } from "spell/parser/parser"
import { PY } from "spell/parser/py"
import { SP } from "spell/parser/spell"
import {
  compiledSpellProject,
  incrementalSpellProject,
  parseSpellProject,
  type SpellSourceFile
} from "spell/parser/spell/test"
import { copied, copyText, shout } from "./clipboard/clipboard"

/**
 * Calling a project's own code from Spell, `call native copyText with text`:
 * the Clipboard test project beside this file, its `clipboard.ts` and `clipboard.py`, compiled to javascript and to
 * Python, and both RUN.
 */

/** A file of the Clipboard project, beside this test. */
function clipboardFile(name: string): string {
  return readFileSync(resolve(import.meta.dirname, "clipboard", name), "utf8")
}

/** Its code files, as its project file lists them. */
const NATIVES: SP.NativeSource[] = [
  { path: "/clipboard.ts", contents: clipboardFile("clipboard.ts") },
  { path: "/clipboard.py", contents: clipboardFile("clipboard.py") }
]

/** Its Spell files, English and Spanish, and a program's steps calling them. */
const FILES: SpellSourceFile[] = [
  { path: "/Clipboard.spell", contents: clipboardFile("Clipboard.spell") },
  { path: "/Portapapeles.es.spell", contents: clipboardFile("Clipboard.es.spell") },
  { path: "/Program.spell", contents: 'copy "hello" to the clipboard\nprint shout "hi"\n' }
]

/** spell_core's uv project. */
const SPELL_CORE = resolve(import.meta.dirname, "../../../src/py/core")

/** `files` compiled by `writer`, with its import lines, as a project's compile writes them. */
function compiled(files: SpellSourceFile[], writer: P.ProgramWriter, natives = NATIVES): string {
  const { scope, files: parsed } = parseSpellProject(files, { natives })
  const errors = parsed.flatMap((file) => file.errors)
  if (errors.length) throw new Error(`parse errors:\n${errors.join("\n")}`)
  const parts = parsed.map(({ match, compiled }) => (match?.AST instanceof P.ASTStatementGroup ? match.AST : compiled))
  const refusal = SP.NativeCode.refusalFor(writer.nativeLanguage, parts)
  if (refusal) throw new Error(refusal)
  const written = SP.SpellProject.combineCompiled(parts, writer, SP.SpellProject.importHeaderFor(scope, writer), scope)
  return SP.SpellDeclarations.stripComments(written)
}

/** Each file's parse errors, for `lines` as a project's one file with `natives`. */
function errorsOf(lines: string[], natives: SP.NativeSource[] = NATIVES): string[] {
  return parseSpellProject([{ path: "/Test.spell", contents: lines.join("\n") }], { natives }).files[0]!.errors
}

describe("call native", () => {
  test("javascript imports the function from its code file, and awaits it when it gives back a promise", () => {
    const code = compiled(FILES.slice(0, 2), P.JSWriter.instance)
    expect(code).toContain('import { copyText, shout } from "@spell/native/test-project/clipboard.ts"')
    expect(code).toContain("// use copyText, shout from clipboard.ts")
    expect(code).toContain("export async function copyTextToTheClipboard(text) {")
    expect(code).toContain("async () => await copyText(text)")
    expect(code).toContain("() => shout(text)")
    // Spanish:  `llamar al código nativo copyText con texto`
    expect(code).toContain("// usar todo de clipboard.ts")
    expect(code).toContain("async () => await copyText(texto)")
  })

  test("the javascript runs, calling the code file's own functions", async () => {
    const code = compiled(FILES.slice(0, 1), P.JSWriter.instance)
      .split("\n")
      .filter((line) => !line.startsWith("import "))
      .join("\n")
      .replace(/^export /gm, "")
    const body = `${code}\nreturn { copyTextToTheClipboard, shoutText }`
    // oxlint-disable-next-line no-implied-eval -- running compiled spell, as a runner does, is the test
    const program = new Function("core", "copyText", "shout", body)(core, copyText, shout) as {
      copyTextToTheClipboard: (text: string) => Promise<unknown>
      shoutText: (text: string) => unknown
    }
    await program.copyTextToTheClipboard("hello")
    expect(copied).toContain("hello")
    expect(program.shoutText("hi")).toBe("HI")
  })

  test("Python imports the function from the .py file beside it, in Python's case, and awaits an async def", () => {
    const code = compiled(FILES.slice(0, 2), PY.PyWriter.instance)
    expect(code).toContain("from clipboard import copy_text, shout")
    expect(code).toContain("async def copy_text_to_the_clipboard(text: str)")
    expect(code).toContain("return await copy_text(text)")
    expect(code).toContain("return shout(text)")
  })

  test("the Python runs, calling clipboard.py", () => {
    const code = compiled(FILES, PY.PyWriter.instance)
    const folder = mkdtempSync(join(tmpdir(), "spell-native-"))
    try {
      writeFileSync(join(folder, "program.py"), code)
      writeFileSync(join(folder, "clipboard.py"), clipboardFile("clipboard.py"))
      const printed = execFileSync("uv", ["run", "--quiet", "--project", SPELL_CORE, "python", "program.py"], {
        cwd: folder,
        encoding: "utf8"
      })
      expect(printed.trim().split("\n")).toEqual(["copied hello", "HI"])
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })

  test("several inputs, with commas", () => {
    const code = compiledSpellProject(
      [{ path: "/Test.spell", contents: "to shout twice (a as text)\n\tcall native shout with a, a" }],
      { natives: NATIVES }
    ).code
    expect(code).toContain("() => shout(a, a)")
  })

  test("no inputs", () => {
    const natives = [{ path: "/beep.ts", contents: "export function beep(): void {}\n" }]
    const code = compiledSpellProject([{ path: "/Test.spell", contents: "to beep\n\tcall native beep" }], {
      natives
    }).code
    expect(code).toContain("() => beep()")
  })

  test("refused outside an action's steps", () => {
    expect(errorsOf(["call native shout with 1"])).toEqual([
      '1:0 "call native shout with 1" calls a function from the project\'s code:  it goes in an action\'s steps, under "to ..."'
    ])
  })

  test("a name no code file exports:  the error names the files it looked in", () => {
    expect(errorsOf(["to whisper (text as text)", "\tcall native whisper with text"])).toEqual([
      "2:1 \"whisper\" isn't a function in the project's code files (clipboard.ts, clipboard.py):  check its name, or export it there"
    ])
  })

  test("no code files at all:  it says to list one", () => {
    expect(errorsOf(["to whisper (text as text)", "\tcall native whisper with text"], [])).toEqual([
      '2:1 "whisper" isn\'t in any code file:  list one in the project file first, e.g. "/clipboard.ts"'
    ])
  })

  test("in Spanish", () => {
    const errors = parseSpellProject(
      [{ path: "/Prueba.es.spell", contents: "llamar al código nativo copyText con 1" }],
      { natives: NATIVES }
    ).files[0]!.errors
    expect(errors[0]).toContain("va en los pasos de una acción")
  })

  test("a target with no file for it is a compile error naming the file to add", () => {
    const natives = NATIVES.slice(0, 1)
    expect(() => compiled(FILES.slice(0, 1), PY.PyWriter.instance, natives)).toThrow(
      "copyText has no Python version:  add clipboard.py, beside clipboard's other code."
    )
    // and a .py file without it
    const without = [
      natives[0]!,
      { path: "/clipboard.py", contents: "def shout(text: str) -> str:\n    return text\n" }
    ]
    expect(() => compiled(FILES.slice(0, 1), PY.PyWriter.instance, without)).toThrow(
      "clipboard's Python version has no copy_text:  add it there."
    )
  })

  test("Python refuses a code file only a browser can run, by the words that can't run there", () => {
    const natives = NATIVES.map((source) => ({ ...source, only: "browser" as const }))
    expect(() => compiled(FILES.slice(0, 1), PY.PyWriter.instance, natives)).toThrow(
      '"to copy (text as text) to the clipboard" needs a browser:  clipboard is marked as code only a browser can run, so Python can\'t call copyText.'
    )
    // javascript still calls it
    expect(compiled(FILES.slice(0, 1), P.JSWriter.instance, natives)).toContain("await copyText(text)")
  })
})

describe("use", () => {
  test("a use line's file wins for a name another code file exports too", () => {
    const natives = [
      ...NATIVES,
      { path: "/loud.ts", contents: "export function shout(text: string): string { return text }\n" }
    ]
    const plain = compiledSpellProject(
      [{ path: "/Test.spell", contents: "to yell (a as text)\n\tcall native shout with a" }],
      {
        natives
      }
    ).code
    expect(plain).toContain('import { shout } from "@spell/native/test-project/clipboard.ts"')
    const used = compiledSpellProject(
      [{ path: "/Test.spell", contents: "use shout from loud.ts\n\nto yell (a as text)\n\tcall native shout with a" }],
      { natives }
    ).code
    expect(used).toContain('import { shout } from "@spell/native/test-project/loud.ts"')
  })

  test("deleting a use line takes it away at once:  the call reads every code file again (from-console I23)", () => {
    const natives = [
      ...NATIVES,
      { path: "/loud.ts", contents: "export function shout(text: string): string { return text }\n" }
    ]
    const steps = "to yell (a as text)\n\tcall native shout with a\n"
    // listed before the file parses:  it starts empty
    const project = incrementalSpellProject([{ path: "/Test.spell", contents: "" }])
    SP.NativeCode.listIn(project.scope, SP.NativeCode.of(natives, "test-project"))
    project.update("/Test.spell", `use shout from loud.ts\n\n${steps}`)
    /** The code file the file's `call native shout` calls, as it's parsed now. */
    const calledFile = () => SP.NativeCode.importsIn(project.files[0]!.parse!.match.AST, "js")[0]?.module
    expect(calledFile()).toBe("@spell/native/test-project/loud.ts")
    project.update("/Test.spell", steps)
    expect(calledFile()).toBe("@spell/native/test-project/clipboard.ts")
    project.update("/Test.spell", `use shout from loud.ts\n\n${steps}`)
    expect(calledFile()).toBe("@spell/native/test-project/loud.ts")
  })

  test("a file the project file doesn't list is refused", () => {
    expect(errorsOf(["use copyText from paste.ts"])).toEqual([
      "1:0 \"paste.ts\" isn't one of the project's code files:  list it in the project file first"
    ])
  })

  test("a name the file doesn't export is refused", () => {
    expect(errorsOf(["use copyText, whisper from clipboard.ts"])).toEqual([
      '1:0 "clipboard.ts" has no function "whisper":  check its name, or export it there'
    ])
  })

  test("in Spanish, a list of names", () => {
    const errors = parseSpellProject([{ path: "/Prueba.es.spell", contents: "usar copyText, shout de clipboard.ts" }], {
      natives: NATIVES
    }).files[0]!.errors
    expect(errors).toEqual([])
  })
})

describe("a place named native", () => {
  test("is refused:  `call native` calls the project's code", () => {
    const errors = errorsOf(['native is a web server at "https://example.com"'])
    expect(errors[0]).toContain('"native" can\'t name a place')
  })
})

describe("reading code files", () => {
  test("javascript:  its exported functions, and which give back a promise", () => {
    const [code] = SP.NativeCode.of(NATIVES.slice(0, 1), "x")
    expect(code!.versions.js!.functions).toEqual([
      { name: "copyText", waits: true },
      { name: "shout", waits: false }
    ])
  })

  test("Python:  its top-level def and async def, not a method or a private one", () => {
    const text =
      "async def copy_text(text):\n    pass\n\ndef _hidden():\n    pass\n\nclass A:\n    def method(self):\n        pass\n"
    expect(PY.pyFunctionsOf(text)).toEqual([{ name: "copy_text", waits: true }])
  })
})

describe("node's reader", () => {
  test("reads the syntax tree:  functions and arrow functions, not a value, and not one in a comment", async () => {
    const { exportedFunctionsIn } = await import("spell/parser/spell/node/nativeExports")
    const text = [
      "// export function inAComment() {}",
      "export const copied: string[] = []",
      "export async function copyText(text: string): Promise<void> {}",
      "export function later(): Promise<number> { return Promise.resolve(1) }",
      "export const shout = (text: string): string => text.toUpperCase()",
      "export const paste = async () => ''",
      "function hidden() {}"
    ].join("\n")
    expect(exportedFunctionsIn("/clipboard.ts", text)).toEqual([
      { name: "copyText", waits: true },
      { name: "later", waits: true },
      { name: "shout", waits: false },
      { name: "paste", waits: true }
    ])
  })
})
