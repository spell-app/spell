import { existsSync } from "node:fs"
import { join } from "node:path"

import { settingsParts } from "spell/server/page/settings"
import { CLI } from "spell/cli"
import { firstPackageDir, KIT_PACKAGES } from "spell-epic/tools/packageDir"

import { EpicCheckout } from "./EpicCheckout"
import { EXIT, type ToolSpec } from "./command.types"
import { planDocArgs } from "./epicArgs"
import { Sessions } from "./Sessions"

/****************
 * ### `EpicTools`
 * The tools the `epic` command runs:
 * - scripts in a child `node`, terminal attached (`run()`)
 * - the `epic` tool, in this process (`planDoc()`)
 *
 * - ONE copy of the code:  every tool is the copy beside THIS code (`EpicCheckout.CODE_ROOT`), whichever checkout calls it.
 *   - So a worktree 50 commits behind main runs main's tools, through main's `epic` on the `PATH`.
 *   - Its DATA stays the caller's:  the nearest checkout from the current folder (`EpicCheckout.nearest()`),
 *     handed to the tool as `EPIC_CHECKOUT` (the docs tools' `pages.js` and the window script read it as their root).
 *   - The exceptions:  the tools that SERVE their checkout, whose code is that checkout's:
 *     - the page server, the `spell/server` its install resolves (`package`)
 *     - `serve`, every web server:  the kit's `spell` its install resolves (`spell/cli`)
 * - All `static`:  no state;  `codeRoot` is the one seam, a test's fake checkout of tools.
 * - A child runs as the kit's `spell` runs its tools:  `CLI.runChild()`, its arguments `CLI.toolArgs()`'s
 *   (`spell/cli`, the base `epic` is built on).
 ****************/
export class EpicTools {
  /**
   * Run tool `name` with `args` verbatim and this terminal attached;  resolves to its exit code.
   * - the script:  `codeRoot`'s copy (default this code's checkout), unless the tool's `code` is `caller` or it's in a
   *   `package` (`codeOf()`)
   * - the data:  the caller's checkout (`EPIC_CHECKOUT`)
   *   - a tool with a `cwd` runs in that folder of it
   *   - else (a repo without the epic tools, one `epic init` set up) in that folder of the code's checkout
   * - a child `node` (`CLI.runChild()`), under the kit's `tsx` when the tool has a `tsx` config (`CLI.toolArgs()`):
   *   its `TSX_TSCONFIG_PATH` is the CODE's checkout's config
   * - `env`:  added to this process's
   * - `cwd`:  the caller's folder, default the current one
   * - `codeRoot`:  where the code is, default this checkout (tests give a fake checkout of tools)
   */
  static run(name: EpicToolName, args: string[], options: EpicToolOptions = {}): Promise<number> {
    const { env = {}, codeRoot = EpicCheckout.CODE_ROOT, cwd = process.cwd() } = options
    const spec: ToolSpec = EpicTools.TOOLS[name]
    const data = EpicCheckout.nearest({ marker: spec.package ? CHECKOUT_MARKER : spec.tool, from: cwd })
    const code = EpicTools.codeOf(spec, data, codeRoot)
    if (!code) {
      process.stderr.write(`epic:  ${data} doesn't install ${spec.package?.join(" or ")}, so has no ${name} to run\n`)
      return Promise.resolve(EXIT.ERRORS)
    }
    const toolCwd = spec.cwd && (existsSync(join(data, spec.cwd)) ? join(data, spec.cwd) : join(code, spec.cwd))
    return CLI.runChild(process.execPath, [...CLI.toolArgs(spec, code), ...args], {
      cwd: toolCwd || cwd,
      env: {
        ...process.env,
        EPIC_CHECKOUT: data,
        ...(spec.tsx ? { TSX_TSCONFIG_PATH: join(code, spec.tsx) } : {}),
        ...env
      }
    })
  }

  /**
   * The folder `spec`'s `tool` and `tsx` are relative to, for a call from checkout `data`:
   * - a tool in a `package`:  that package's folder, as `data`'s install resolves it;  `undefined`:  not installed
   * - `code: "caller"`:  `data`
   * - else `codeRoot`, the running `epic`'s checkout
   */
  static codeOf(spec: ToolSpec, data: string, codeRoot = EpicCheckout.CODE_ROOT): string | undefined {
    if (spec.package) return firstPackageDir(spec.package, data)
    return spec.code === "caller" ? data : codeRoot
  }

  ////////////////
  // ## The `epic` tool, in this process
  ////////////////

  /**
   * Run the `epic` tool's command line `argv` (`add seo judgement "Title"`, the tool's own order) IN this process:
   * `PlanDocCommands`, on the caller's checkout's epic pages (`PlanDocFiles`).
   * - resolves to its exit code;  its output is out before the process exits (`CLI.runCommand()` waits for it:  a
   *   pipe on macOS takes writes asynchronously)
   * - loaded on first use (a dynamic `import()`):  the other verbs don't pay for linkedom and oxfmt
   * - gives the tool an epic's RUNNING sessions (`Sessions.ofEpic()`), for `migrate --notify`
   * - `root`:  the checkout whose pages and repos it works on, default the nearest (`EpicCheckout.nearest()`)
   */
  static async planDoc(argv: string[], root = EpicCheckout.nearest()): Promise<number> {
    const [{ PlanDocCommands }, { PlanDocFiles }] = (await Promise.all([import(COMMANDS), import(FILES)])) as [
      {
        PlanDocCommands: new (props: { files: unknown; sessionsOf: typeof sessionsOf }) => {
          run(argv: string[]): Promise<number>
        }
      },
      { PlanDocFiles: new (props: { root: string }) => unknown }
    ]
    const files = new PlanDocFiles({ root })
    return new PlanDocCommands({ files, sessionsOf }).run(argv)
  }

  /**
   * Run `epic <verb> <args...>` through the `epic` tool:  each command `planDocArgs()` makes, stopping at a failure.
   * - throws `EpicCommandError` for a target the verb can't take (`planDocArgs()`)
   * - `root`:  `planDoc()`'s
   */
  static async runPlanDoc([verb, ...args]: string[], root?: string): Promise<number> {
    for (const argv of planDocArgs(verb!, args)) {
      const exitCode = await EpicTools.planDoc(argv, root)
      if (exitCode !== EXIT.OK) return exitCode
    }
    return EXIT.OK
  }

  ////////////////
  // ## The tools
  ////////////////

  /**
   * The tools, by command:  each as its yarn script ran it.
   * - `agents`:  the running-agents list (`src/tools/agents.ts`), in the caller's folder
   * - `airplane`:  airplane mode and its pre-flight check (`src/tools/airplane.ts`), in the caller's folder
   * - `details`, `choices`:  details and choice pages, at the caller's checkout's root
   * - `notes`, `comments`:  page notes and comments on docs pages, in the caller's folder (`--file` is from there)
   * - `window`:  the VS Code windows (`src/window.mjs`);
   *   plain `node`, so it runs in a worktree before its `yarn install`
   * - `server`:  the caller's checkout's page server (`spell/server`'s command line, the kit's
   *   `src/server/page/cli.ts`, under the kit's node settings)
   * - `serve`:  every web server, `epic server start --all`:  the kit's `spell` its install resolves, which
   *   `EpicProgram` runs as `spell server start all` (spell-app's own `scripts/serve.mjs` until epic `repo-split` P13)
   * - `pages <verb>`:  the docs pages' tools, `epic pages index` ...
   *   (`runPages()`;  spell-app's `spell dev docs <verb>` until epic `repo-split` P13)
   *   - at the caller's checkout's root (spell-app's `yarn workspace` ran them in `packages/epics` before epic
   *     `epic-eject`'s switch-over), or the caller's folder for those that take paths from there
   * - static:  the one table
   */
  static readonly TOOLS = {
    agents: { tool: "src/tools/agents.ts", tsx: "tsconfig.json" },
    airplane: { tool: "src/tools/airplane.ts", tsx: "tsconfig.json" },
    details: { tool: "src/tools/details.js", cwd: "." },
    choices: { tool: "src/tools/choices.js", cwd: "." },
    notes: { tool: "src/tools/notes.ts", tsx: "tsconfig.json" },
    comments: { tool: "src/tools/comments.ts", tsx: "tsconfig.json" },
    window: { tool: "src/window.mjs" },
    server: { package: KIT_PACKAGES, tool: "src/server/page/cli.ts", tsx: "tsconfig.node.json" },
    serve: { package: KIT_PACKAGES, tool: "bin/spell.mjs" },
    "pages update": { tool: "src/tools/update.js", cwd: "." },
    "pages index": { tool: "src/tools/index.js", cwd: "." },
    "pages create": { tool: "src/tools/new-page.js", cwd: "." },
    "pages template": { tool: "src/tools/template-path.js", cwd: "." },
    "pages open": { tool: "src/tools/open.js", tsx: "tsconfig.json", cwd: "." },
    "pages link": { tool: "src/tools/link.ts", tsx: "tsconfig.json", cwd: "." },
    "pages fuss": { tool: "src/tools/fuss.ts", tsx: "tsconfig.json" },
    "pages voice": { tool: "src/tools/voice.ts", tsx: "tsconfig.json", cwd: "." },
    "pages offline": { tool: "src/tools/offline.ts", tsx: "tsconfig.json" }
  } satisfies Record<string, ToolSpec>

  /**
   * Whether the caller's checkout has a page server of its own (`TOOLS.server`), as `pages.js`' `ensurePageServer()`
   * finds one:  its install resolves `spell/server`, and the page server's settings have a part
   * (`settingsParts()`:  in a kit, the kit's and every installed repo's `"pageServer"`;  else the checkout's own).
   * - in a kit:  from any folder of it, the kit's page server (epic `repo-split` P16)
   * - a repo `epic init` set up has none:  `epic server` is the machine's epic server there (`epic hub`)
   */
  static hasPageServer(cwd = process.cwd()): boolean {
    const spec: ToolSpec = EpicTools.TOOLS.server
    const data = EpicCheckout.nearest({ marker: CHECKOUT_MARKER, from: cwd })
    const code = EpicTools.codeOf(spec, data)
    return settingsParts(data).length > 0 && !!code && existsSync(join(code, spec.tool))
  }

  /**
   * `epic pages <verb> <args>`:  the docs pages' tool for `<verb>` (`TOOLS`' `pages <verb>`).
   * - resolves to its exit code
   * - the group refuses an unknown verb before this runs (`EpicProgram`)
   */
  static runPages([verb, ...args]: string[]): Promise<number> {
    const name = `pages ${verb}` as EpicToolName
    if (!(name in EpicTools.TOOLS)) {
      process.stderr.write(
        "epic pages:  which verb?  index, update, create, template, open, link, fuss, voice or offline\n"
      )
      return Promise.resolve(EXIT.USAGE)
    }
    return EpicTools.run(name, args)
  }
}

/** A tool `EpicTools.run()` runs, e.g. `details`. */
export type EpicToolName = keyof typeof EpicTools.TOOLS

/** `EpicTools.run()`'s options:  see there. */
export type EpicToolOptions = { env?: NodeJS.ProcessEnv; codeRoot?: string; cwd?: string }

/**
 * The `epic` tool's modules, by package name (`tsx` resolves them at run time).
 * - HACK: specifiers in constants, so the CLI package's `tsc` doesn't follow them:
 *   it follows this file from `epicMain.ts`.
 *   - the tool is type-checked here, in spell-epic
 *   - literal specifiers fail the CLI's `tsc` (spell's settings) in two ways (epic `epic-components` I5, 2026-10-07):
 *     - ES2023 (`toSorted()`, `findLast()`) in `Markup`:  the CLI's `lib` is ES2022
 *     - Solid's JSX:  the definitions import the vocabularies, which reach `spell-ui/core` -> `ui`'s `.tsx`
 *   - REFACTOR: once the vocabularies' data lives clear of `spell-ui/core` (and the CLI's `lib` is ES2023),
 *     import them plainly
 */
const COMMANDS = "spell-epic/tool/PlanDocCommands"
/** `COMMANDS`' twin:  the docs on disk. */
const FILES = "spell-epic/tool/PlanDocFiles"

/** What marks the caller's checkout for a tool in a package:  the nearest repo's root (a worktree's `.git` is a file). */
const CHECKOUT_MARKER = ".git"

/**
 * The running Claude sessions working on epic `epic`, as `epic send` finds its receivers (`Sessions.ofEpic()`):
 * each one's `name`, the address `SendMessage` takes, and its id.
 */
async function sessionsOf(epic: string): Promise<{ name: string; sessionId: string }[]> {
  return new Sessions().ofEpic(epic).map((session) => ({
    name: session.name ?? session.sessionId,
    sessionId: session.sessionId
  }))
}
