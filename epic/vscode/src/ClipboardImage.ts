import { execFile } from "node:child_process"

/****************
 * ### `ClipboardImage`
 * The clipboard's picture, as a PNG `data:` URL, on macOS, Linux and Windows (epic `epic-friend` P15;  macOS only before).
 * - why:  VS Code's clipboard API is text only, and the page in the Review tab may not read the clipboard itself
 *   (`navigator.clipboard.read()` is refused there:  epic `epic-engine` I75)
 * - each system's own command hands it over (`readersFor()`), its output read its own way (`decode()`):
 *   - macOS:  AppleScript, `the clipboard as «class PNGf»`, printed as `«data PNGf<hex>»`
 *   - Linux:  `wl-paste` (Wayland), else `xclip` (X11), the PNG's bytes as they are
 *   - Windows:  PowerShell's `System.Windows.Forms.Clipboard`, the PNG in base64
 * - no `vscode` import:  the extension's tests run it with plain `node`
 ****************/
export class ClipboardImage {
  /**
   * The clipboard's picture, or `undefined`:  none, no command to read it, a failure, or one over `maxBytes`.
   * - tries each of the system's readers in turn;  the first with a picture wins
   * - NEVER throws
   */
  static async read(platform: NodeJS.Platform = process.platform, maxBytes = MAX_BYTES): Promise<string | undefined> {
    for (const reader of ClipboardImage.readersFor(platform)) {
      const bytes = ClipboardImage.decode(await output(reader, maxBytes), reader.output)
      if (bytes?.length && bytes.length <= maxBytes) return `data:image/png;base64,${bytes.toString("base64")}`
    }
    return undefined
  }

  /** How `platform` hands over the clipboard's picture:  each command to try, in order;  none on another system. */
  static readersFor(platform: NodeJS.Platform): ClipboardReader[] {
    if (platform === "darwin") {
      const script = ["try", "return the clipboard as «class PNGf»", "on error", 'return ""', "end try"]
      return [{ command: "osascript", args: script.flatMap((line) => ["-e", line]), output: "applescript" }]
    }
    if (platform === "linux")
      return [
        { command: "wl-paste", args: ["--no-newline", "--type", "image/png"], output: "bytes" },
        { command: "xclip", args: ["-selection", "clipboard", "-target", "image/png", "-out"], output: "bytes" }
      ]
    if (platform === "win32")
      return [{ command: "powershell", args: ["-NoProfile", "-STA", "-Command", WINDOWS_SCRIPT], output: "base64" }]
    return []
  }

  /** A reader's `text` as the PNG's bytes;  `undefined` when it holds none. */
  static decode(text: Buffer | undefined, kind: ClipboardReader["output"]): Buffer | undefined {
    if (!text?.length) return undefined
    if (kind === "bytes") return text.subarray(0, PNG.length).equals(PNG) ? text : undefined
    if (kind === "base64") {
      const bytes = Buffer.from(text.toString("utf8").trim(), "base64")
      return bytes.subarray(0, PNG.length).equals(PNG) ? bytes : undefined
    }
    const hex = /«data PNGf([0-9A-F]+)»/i.exec(text.toString("utf8"))?.[1]
    return hex ? Buffer.from(hex, "hex") : undefined
  }
}

/** One command that prints the clipboard's picture, and how its output reads. */
export type ClipboardReader = {
  command: string
  args: string[]
  /** `applescript`:  `«data PNGf<hex>»`;  `bytes`:  the PNG as it is;  `base64`:  the PNG in base64 */
  output: "applescript" | "bytes" | "base64"
}

/** The most a pasted picture may be, as the page's own limit for a screenshot:  8 MB. */
const MAX_BYTES = 8 * 1024 * 1024

/** A PNG's first eight bytes. */
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** Windows' clipboard picture as a PNG in base64;  nothing printed when it holds none. */
const WINDOWS_SCRIPT = [
  "Add-Type -AssemblyName System.Windows.Forms, System.Drawing",
  "$image = [System.Windows.Forms.Clipboard]::GetImage()",
  "if ($image) {",
  "  $stream = New-Object System.IO.MemoryStream",
  "  $image.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)",
  "  [Convert]::ToBase64String($stream.ToArray())",
  "}"
].join("; ")

/** `reader`'s output as bytes, or `undefined` when it can't run or fails. */
function output({ command, args, output: kind }: ClipboardReader, maxBytes: number): Promise<Buffer | undefined> {
  // hex and base64 are longer than the bytes they hold
  const maxBuffer = (kind === "bytes" ? maxBytes : maxBytes * 2) + 1024
  return new Promise((resolve) => {
    execFile(command, args, { maxBuffer, encoding: "buffer" }, (error, stdout) =>
      resolve(error ? undefined : stdout)
    )
  })
}
