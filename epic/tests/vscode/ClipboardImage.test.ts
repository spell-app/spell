/**
 * Tests of the epic extension's clipboard reader (`vscode/src/ClipboardImage.ts`):  each system's commands, and how
 * their output reads.  Plain `node --test` (types stripped):  it needs no `vscode`.
 */
import { deepEqual, equal } from "node:assert/strict"
import { test } from "node:test"

import { ClipboardImage } from "spell/epic/vscode/src/ClipboardImage.ts"

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])

test("readersFor():  AppleScript on macOS, wl-paste then xclip on Linux, PowerShell on Windows, none elsewhere", () => {
  deepEqual(
    ["darwin", "linux", "win32", "freebsd"].map((platform) =>
      ClipboardImage.readersFor(platform as NodeJS.Platform).map((it) => `${it.command}:${it.output}`)
    ),
    [["osascript:applescript"], ["wl-paste:bytes", "xclip:bytes"], ["powershell:base64"], []]
  )
})

test("decode():  each output's PNG;  anything that isn't one:  undefined", () => {
  const hex = Buffer.from(`«data PNGf${PNG.toString("hex").toUpperCase()}»\n`)
  deepEqual(ClipboardImage.decode(hex, "applescript"), PNG)
  deepEqual(ClipboardImage.decode(PNG, "bytes"), PNG)
  deepEqual(ClipboardImage.decode(Buffer.from(`${PNG.toString("base64")}\r\n`), "base64"), PNG)
  equal(ClipboardImage.decode(Buffer.from("hello"), "bytes"), undefined)
  equal(ClipboardImage.decode(Buffer.from(""), "base64"), undefined)
  equal(ClipboardImage.decode(undefined, "applescript"), undefined)
})
