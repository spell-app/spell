import { basename, dirname, join, resolve } from "node:path"

/****************
 * ### `EngineFiles`
 * Where the epic engine's own files are, in a checkout of the kit AND in an npm install of `spell`:
 * the ONE place that knows the two layouts differ (epic `epic-engine` I246).
 *
 * ```text
 *                 a checkout           an npm install of `spell`
 * its code        epic/src/            node_modules/spell/dist/epic/      (`code`)
 * its data        epic/                node_modules/spell/epic/           (`root`:  templates, voices, skills, hooks)
 * the command     epic/bin/epic        node_modules/spell/dist/epic/cli/epicMain.js      (`bin`)
 * ```
 *
 * - Name a file by its path in a checkout, and ask `path()`:  `EngineFiles.path("src/tools/_assets")`.
 * - The command is the built `epicMain.js`, the module the published `bin/epic` imports:
 *   so a background server or a hook never needs `spell-epic`'s own `bin/epic` to be beside `spell`.
 * - Its position:  node's own modules only, plain JavaScript, so the inbox poller may import it
 *   (`InboxPoller`:  no TypeScript there) and the hooks may too.
 * - Worked out when read:  a bundle (the VS Code extension's) has no `import.meta.dirname`.
 ****************/
export class EngineFiles {
  /** The folder of the engine's code:  `epic/src`, or `dist/epic` in an install.  This file is in its `config/`. */
  static get code() {
    return resolve(import.meta.dirname ?? ".", "..")
  }

  /** Is this code the built package's (`spell`'s `dist/epic/`), not a checkout's? */
  static get isBuilt() {
    return basename(dirname(EngineFiles.code)) === DIST
  }

  /**
   * The engine's folder:  `epic/` of the checkout, or `epic/` of the `spell` package, beside its `dist/`:
   * every `"spellPublish": { "files" }` of the engine, and its folder manifest.
   */
  static get root() {
    const { code } = EngineFiles
    return EngineFiles.isBuilt ? join(dirname(dirname(code)), ENGINE_FOLDER) : dirname(code)
  }

  /** The `epic` command, to run under `node`:  this copy's, in either layout. */
  static get bin() {
    return EngineFiles.isBuilt ? join(EngineFiles.code, "cli", "epicMain.js") : join(EngineFiles.root, "bin", "epic")
  }

  /**
   * Where `path` is in this layout, `path` as a checkout of the engine has it:
   * - `src/tools/_assets` => `dist/epic/tools/_assets`, `src/tools/x.ts` => its built `.js`, in an install
   * - anything else (`templates`, `skills/epic/guide.md`):  from the engine's folder
   * - `engine`:  an engine's folder other than this one (a test's fake checkout):  plainly from it
   */
  static path(path, engine = EngineFiles.root) {
    if (!EngineFiles.isBuilt || resolve(engine) !== EngineFiles.root || !path.startsWith(SOURCE))
      return join(engine, path)
    return join(EngineFiles.code, path.slice(SOURCE.length).replace(/\.tsx?$/, ".js"))
  }

  /**
   * How to run `script` (a file of the engine's code) as a child `node`, for `spawnSync(process.execPath, args, { env })`:
   * - a checkout:  under `tsx`, with the engine's `tsconfig.json`:  every repo's files by their package names
   * - an install:  plain `node`, the code being built (no `tsconfig.json` ships)
   * - `env`:  what to start from, default this process's
   */
  static nodeRun(script, args = [], env = process.env) {
    if (EngineFiles.isBuilt) return { args: [script, ...args], env }
    return {
      args: ["--import", "tsx", script, ...args],
      env: { ...env, TSX_TSCONFIG_PATH: join(EngineFiles.root, "tsconfig.json") }
    }
  }
}

/** The built package's folder of built code, `dist/`. */
const DIST = "dist"

/** The engine's folder, in the kit and in the `spell` package. */
const ENGINE_FOLDER = "epic"

/** What starts a path in a checkout's source folder. */
const SOURCE = "src/"
