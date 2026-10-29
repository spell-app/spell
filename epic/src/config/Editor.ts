import type { SpawnSyncOptions, SpawnSyncReturns } from "node:child_process"

import { Processes } from "spell/server/Processes"

/****************
 * ### `Editor`
 * Which editor the epic tools drive:  VS Code (`code`) or Cursor (`cursor`), the ONE reader of it (epic `epic-friend`
 * P16, Owen's comment C10:  "phase to get working in Cursor on other machines").
 *
 * ```ts
 * const editor = Editor.of({ setting: config.editor })
 * editor.run([file])                       // `code <file>` or `cursor <file>`
 * editor.url("anthropic.claude-code/open")  // vscode://... or cursor://...
 * ```
 *
 * - Which one, the first that says (`idOf()`):
 *   1. this machine's own:  `$SPELL_EPIC_EDITOR` (`code` or `cursor`)
 *   2. the window the command runs in:  Cursor marks what it starts (`CURSOR_TRACE_ID`, its macOS bundle id, its
 *      folders in VS Code's own `VSCODE_*` variables);  VS Code's marks say `code`
 *   3. the repo's settings:  `editor` in `.epic/config.json5` (`EpicConfig.editor`)
 *   4. else `code`
 * - Cursor is built on VS Code:  its command takes VS Code's flags (`--install-extension <file.vsix>`,
 *   `--list-extensions`, `--open-url`), and it opens `.code-workspace` files as they are;  only the command's name
 *   and the URL scheme differ
 * - Its position:  node's modules and `spell/server/Processes` only, so plain `node` loads it by its own name,
 *   `spell/epic/config/Editor.ts` (the window script)
 ****************/
export class Editor {
  /** `code` or `cursor` */
  readonly id: EditorId

  constructor(id: EditorId) {
    this.id = id
  }

  /** The editor to drive:  see the class docstring for the order;  `setting` is the repo's `editor`. */
  static of({ setting, env = process.env }: EditorOptions = {}): Editor {
    return new Editor(Editor.idOf({ setting, env }))
  }

  /** Which editor:  this machine's, else the window's, else the repo's `setting`, else `code`. */
  static idOf({ setting, env = process.env }: EditorOptions = {}): EditorId {
    return Editor.named(env[EDITOR_ENV]) ?? Editor.ofWindow(env) ?? Editor.named(setting) ?? "code"
  }

  /** The editor whose window started this process, from what it put in the environment;  `undefined` for none. */
  static ofWindow(env: NodeJS.ProcessEnv = process.env): EditorId | undefined {
    if (env.CURSOR_TRACE_ID || env.__CFBundleIdentifier === CURSOR_BUNDLE) return "cursor"
    const paths = VSCODE_PATHS.map((key) => env[key] ?? "").join("\n")
    if (CURSOR_PATH.test(paths)) return "cursor"
    if (env.__CFBundleIdentifier === VSCODE_BUNDLE || env.VSCODE_PID || env.TERM_PROGRAM === "vscode") return "code"
    return undefined
  }

  /** `value` as an editor's id, any case;  `undefined` when it names none. */
  static named(value: unknown): EditorId | undefined {
    const id = typeof value === "string" ? value.trim().toLowerCase() : ""
    return (EDITOR_IDS as readonly string[]).includes(id) ? (id as EditorId) : undefined
  }

  /** Its command:  `code`, `cursor` */
  get command(): string {
    return this.id
  }

  /** Its name, for what people read:  "VS Code", "Cursor" */
  get name(): string {
    return EDITOR_NAMES[this.id]
  }

  /** Its URL scheme:  `vscode`, `cursor` */
  get scheme(): string {
    return EDITOR_SCHEMES[this.id]
  }

  /** A link into it:  `vscode://<path>`, `cursor://<path>` */
  url(path: string): string {
    return `${this.scheme}://${path}`
  }

  /** Run its command with `args` (`Processes.run()`:  through the shell on Windows);  NEVER throws. */
  run(args: string[], options: SpawnSyncOptions = {}): SpawnSyncReturns<string> {
    return Processes.run(this.command, args, options)
  }
}

/** `Editor.of()`'s options. */
export type EditorOptions = {
  /** the repo's `editor` setting (`EpicConfig.editor`) */
  setting?: string
  /** the environment;  default `process.env` */
  env?: NodeJS.ProcessEnv
}

/** The editors it drives. */
export const EDITOR_IDS = ["code", "cursor"] as const

/** An editor's id:  its command. */
export type EditorId = (typeof EDITOR_IDS)[number]

/** This machine's own choice, over the window's and the repo's. */
export const EDITOR_ENV = "SPELL_EPIC_EDITOR"

const EDITOR_NAMES: Record<EditorId, string> = { code: "VS Code", cursor: "Cursor" }

const EDITOR_SCHEMES: Record<EditorId, string> = { code: "vscode", cursor: "cursor" }

/** Cursor's macOS bundle id (its `Info.plist`, Cursor 3.22), which macOS passes to what it starts. */
const CURSOR_BUNDLE = "com.todesktop.230313mzl4w4u92"

/** VS Code's macOS bundle id. */
const VSCODE_BUNDLE = "com.microsoft.VSCode"

/** VS Code's own variables holding the app's or its data's folder:  Cursor's name is in them, under Cursor. */
const VSCODE_PATHS = [
  "VSCODE_CODE_CACHE_PATH",
  "VSCODE_NODE_COMPILE_CACHE_ROOT",
  "VSCODE_GIT_ASKPASS_NODE",
  "VSCODE_NLS_CONFIG"
]

/** Cursor's app or data folder in a path:  `Cursor.app`, `Application Support/Cursor`, `.config/Cursor`, `\Cursor\`. */
const CURSOR_PATH = /[/\\]Cursor(?:\.app)?[/\\]/
