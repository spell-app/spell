import { spawnSync } from "node:child_process"
import { homedir } from "node:os"
import { basename, isAbsolute, join, resolve } from "node:path"

import { checkoutOf } from "spell/server/checkout"
import { DataFile } from "spell/server/DataFile"
import { Processes } from "spell/server/Processes"
import { RealPath } from "spell/server/RealPath"
import { kindOf, serverCheckoutOf, serverProcesses, type ServerProcess } from "spell/server/page/prune"
import { EpicHome } from "spell/epic/config/EpicHome.ts"

import { REPOS_FILE } from "./server.types.ts"

/****************
 * ### `ServerGuard`
 * The COMMAND GUARD (epic `epic-engine` P84, narrowed in P85):  says whether a shell command an agent is about to run
 * would kill one of a MAIN checkout's servers, or start main's editor by hand, which only Spell's server keeper may
 * do (`spell/server/keeper`).
 *
 * ```ts
 * const guard = ServerGuard.forMachine()
 * guard.check("cd ~/www/spell/app && vp dev", "/Users/owen/www/spell.worktrees/seo")
 * // => { command: "vp dev", why: "...", instead: "spell server start editor ..." }
 * guard.check("cd ~/www/spell && spell server restart", "/Users/owen/www/spell.worktrees/seo")   // => undefined
 * ```
 *
 * - Its caller:  the plugin's `PreToolUse` hook on Bash, [server-guard.mjs](../../hooks/server-guard.mjs), which
 *   answers "deny" with `message()`;  Claude Code's and Codex's
 * - The main checkouts:  every one Spell's keeper keeps (`~/.spell/keeper.json5` `checkouts`), and every repo the epic
 *   hub serves (`~/.spell-epic/repos.json5`), never a guess from folder names;  a worktree of one (its `.git` a file)
 *   is never main
 * - Each piece of the command is looked at:  split on `&&`, `||`, `;`, `|`, `&` and new lines, with each `cd` before it
 *   followed, and each `$(...)` inside it looked at too
 * - Refused, in a main checkout:
 *   - the editor started there by hand:  `vp dev`, `vite`, `yarn start:dev`, `yarn start`, `spell app serve`
 *   - a kill (`kill`, `pkill`, `killall`, `lsof ... | xargs kill`, `kill $(lsof ...)`) that would reach a page server,
 *     editor or hub of a main checkout:  each process looked up by its command line and working folder
 *     (`serverProcesses()`), only when a kill is there to judge
 * - Left alone:  `spell server ...` and `epic server ...` (in a main checkout they ask the keeper themselves),
 *   `spell keeper ...`, `epic servers ...`, `epic hub stop` (the hub keeps no servers since P85, and the keeper brings
 *   it back), reading (`ps`, `lsof`, `curl`), and every command about a worktree's own servers
 * - Lets everything through while the keeper's HANDS-OFF switch is on (`isHandsOff`):  the person is working on the
 *   servers themselves
 * - What it can't see (a script, a command built in pieces):  main's servers refuse those themselves
 *   (`SRV.KeeperLink.refusedStart()`)
 * - Plain `node` loads it, types stripped:  no parameter properties, its imports by their own names
 * - NEVER throws from `check()`:  a guard that fails lets the command through
 ****************/
export class ServerGuard {
  /** the main checkouts, absolute */
  readonly mains: string[]

  /** whether the keeper's hands-off switch is on */
  readonly isHandsOff: boolean

  /** the machine's web servers, asked only when a kill is there to judge;  a test hands its own */
  private readonly listServers: () => ServerProcess[]

  /** the processes listening on a TCP port;  a test hands its own */
  private readonly listeners: (port: number) => number[]

  /** each process's parent, by pid;  a test hands its own */
  private readonly listParents: () => Map<number, number>

  /** the servers, once asked */
  private servers?: ServerProcess[]

  /** the parents, once asked */
  private parents?: Map<number, number>

  constructor({
    mains,
    isHandsOff = false,
    servers = serverProcesses,
    listeners = listenersOn,
    parents = () => Processes.parents()
  }: {
    mains: string[]
    isHandsOff?: boolean
    servers?: () => ServerProcess[]
    listeners?: (port: number) => number[]
    parents?: () => Map<number, number>
  }) {
    this.mains = mains.map((main) => resolve(main))
    this.isHandsOff = isHandsOff
    this.listServers = servers
    this.listeners = listeners
    this.listParents = parents
  }

  /**
   * The guard for this machine:  the main checkouts Spell's keeper keeps and the hub serves, and the keeper's hands-off
   * switch as it is now, read from their files by hand (plain `node`, no import of the keeper).
   * - `home`:  default the epic home (`EpicHome.folder()`);  `keeperHome`:  default the keeper's, `SPELL_KEEPER_HOME`
   *   else `~/.spell`
   * - NEVER throws:  files it can't read give no mains, and the switch off
   */
  static forMachine(
    home = EpicHome.folder(),
    keeperHome = process.env.SPELL_KEEPER_HOME || join(homedir(), ".spell")
  ): ServerGuard {
    const read = <T>(file: string): T | undefined => {
      try {
        return DataFile.read<T>(file)
      } catch {
        return undefined
      }
    }
    const kept = read<{ checkouts?: { checkout?: string }[] }>(join(keeperHome, KEEPER_LIST_FILE))?.checkouts ?? []
    const repos = read<{ repos?: { checkout?: string }[] }>(join(home, REPOS_FILE))?.repos ?? []
    const mains = [...kept, ...repos]
      .map((each) => each.checkout)
      .filter((checkout): checkout is string => Boolean(checkout))
    return new ServerGuard({
      mains: [...new Set(mains)],
      isHandsOff: read<{ handsOff?: boolean }>(join(keeperHome, KEEPER_HOLDS_FILE))?.handsOff === true
    })
  }

  /**
   * Whether shell `command`, run in folder `cwd`, reaches a main checkout's server:  the first piece that does, why,
   * and what to run instead;  `undefined` when it may run.
   * - hands off:  `undefined` (the hook says so itself)
   * - NEVER throws:  a command it can't make out is let through
   */
  check(command: string, cwd: string): GuardRefusal | undefined {
    if (this.isHandsOff || !this.mains.length) return undefined
    try {
      return this.checkPieces(ServerGuard.pieces(command), cwd)
    } catch {
      return undefined
    }
  }

  /**
   * What the hook tells the agent:  what was refused, why, and the one command to run instead.
   */
  static message({ command, why, instead }: GuardRefusal): string {
    return (
      `Refused:  ${command}\n` +
      `Why:  ${why}  Only Spell's server keeper starts, stops or restarts a main checkout's servers.\n` +
      `Run instead:  ${instead}\n` +
      `(Or leave main's servers to the Servers tab;  a worktree's own servers are yours.)`
    )
  }

  ////////////////
  // ## Reading a command
  ////////////////

  /**
   * `command` cut into its PIECES, each a simple command and the operator before it, in order;  each `$(...)` and
   * backtick's inside follows the piece holding it, as a piece of its own (`substituted`).
   * - quotes and backslashes respected:  `echo "a && b"` is one piece
   */
  static pieces(command: string): Piece[] {
    const pieces: Piece[] = []
    let text = ""
    let before: Operator = "start"
    let quote: string | undefined
    const inner: string[] = []
    const push = (next: Operator) => {
      if (text.trim()) pieces.push({ text: text.trim(), before })
      for (const sub of inner.splice(0))
        pieces.push(...ServerGuard.pieces(sub).map((piece) => ({ ...piece, substituted: true })))
      text = ""
      before = next
    }
    for (let at = 0; at < command.length; at++) {
      const char = command[at]
      const next = command[at + 1]
      if (char === "\\" && quote !== "'") {
        text += char + (next ?? "")
        at++
        continue
      }
      if (quote) {
        if (char === quote) quote = undefined
        else if (char === "$" && next === "(" && quote === '"') {
          const end = closingParen(command, at + 1)
          inner.push(command.slice(at + 2, end))
          text += command.slice(at, end + 1)
          at = end
          continue
        }
        text += char
        continue
      }
      if (char === "'" || char === '"') {
        quote = char
        text += char
        continue
      }
      if (char === "$" && next === "(") {
        const end = closingParen(command, at + 1)
        inner.push(command.slice(at + 2, end))
        text += command.slice(at, end + 1)
        at = end
        continue
      }
      if (char === "`") {
        const end = command.indexOf("`", at + 1)
        const close = end < 0 ? command.length : end
        inner.push(command.slice(at + 1, close))
        text += command.slice(at, close + 1)
        at = close
        continue
      }
      if ((char === "&" && next === "&") || (char === "|" && next === "|")) {
        push(char === "&" ? "&&" : "||")
        at++
      } else if (char === ";" || char === "\n") push(";")
      else if (char === "|") push("|")
      else if (char === "&" && next !== ">" && command[at - 1] !== ">") push("&")
      else text += char
    }
    push(";")
    return pieces
  }

  /**
   * A piece's WORDS, its quotes taken off;  the wrappers and settings before the command dropped
   * (`FOO=1`, `sudo`, `env`, `nohup`, `exec`, `time`, `command`, `(`, `{`).
   */
  static words(text: string): string[] {
    const words: string[] = []
    let word = ""
    let quote: string | undefined
    let has = false
    for (let at = 0; at < text.length; at++) {
      const char = text[at]
      if (char === "\\" && quote !== "'") {
        word += text[++at] ?? ""
        has = true
      } else if (char === "$" && text[at + 1] === "(" && quote !== "'") {
        // a substitution stays one word, as written:  `kill $(lsof -ti:3000)`
        const end = closingParen(text, at + 1)
        word += text.slice(at, end + 1)
        at = end
      } else if (char === "`" && !quote) {
        const end = text.indexOf("`", at + 1)
        const close = end < 0 ? text.length - 1 : end
        word += text.slice(at, close + 1)
        at = close
      } else if (quote) {
        if (char === quote) quote = undefined
        else word += char
      } else if (char === "'" || char === '"') {
        quote = char
        has = true
      } else if (/\s/.test(char)) {
        if (word || has) words.push(word)
        word = ""
        has = false
      } else word += char
    }
    if (word || has) words.push(word)
    let start = 0
    while (start < words.length) {
      const first = words[start]
      if (/^[({]+$/.test(first) || WRAPPERS.has(first) || /^[A-Za-z_][A-Za-z0-9_]*=/.test(first)) start++
      else if (first.startsWith("(")) {
        words[start] = first.replace(/^\(+/, "")
      } else break
    }
    return words
      .slice(start)
      .map(withoutClosers)
      .filter((each, at) => at > 0 || each)
  }

  ////////////////
  // ## Judging
  ////////////////

  /** the pieces in order, each `cd` followed;  the first refused */
  private checkPieces(pieces: Piece[], start: string): GuardRefusal | undefined {
    let cwd = start
    let piped: string[] | undefined
    for (const piece of pieces) {
      const words = ServerGuard.words(piece.text)
      const from = piece.before === "|" ? piped : undefined
      if (!piece.substituted) piped = words
      if (!words.length) continue
      if ((words[0] === "cd" || words[0] === "pushd") && !piece.substituted) {
        cwd = folderFrom(cwd, words[1])
        continue
      }
      const refused = this.checkWords(words, cwd, from)
      if (refused) return { command: piece.text, ...refused }
    }
    return undefined
  }

  /** one simple command, in folder `cwd`;  `piped`:  the command whose output it reads (`lsof ... | xargs kill`) */
  private checkWords(words: string[], cwd: string, piped?: string[]): Verdict | undefined {
    const [program, ...rest] = programOf(words)
    switch (program) {
      case "spell":
        return this.checkSpell(rest, cwd)
      case "vp":
      case "vite":
        return this.checkVite(program, rest, cwd)
      case "yarn":
      case "npm":
      case "pnpm":
        return this.checkScript(program, rest, cwd)
      case "kill":
      case "pkill":
      case "killall":
        return this.checkKill(program, rest)
      case "xargs":
        return this.checkXargs(rest, piped)
      default:
        return undefined
    }
  }

  /** `spell app serve`;  `spell server ...` asks the keeper itself, in a main checkout */
  private checkSpell(args: string[], cwd: string): Verdict | undefined {
    const [noun, verb] = positional(args)
    if (noun === "app" && verb === "serve" && this.mainAt(cwd))
      return { why: "this would start main's editor (and its page server) by hand.", instead: EDITOR_INSTEAD }
    return undefined
  }

  /** `vp dev`, `vite [dev | serve]` in a main checkout */
  private checkVite(program: string, args: string[], cwd: string): Verdict | undefined {
    const [verb] = positional(args)
    const starts = program === "vp" ? verb === "dev" : verb === undefined || verb === "dev" || verb === "serve"
    if (!starts || !this.mainAt(cwd)) return undefined
    return { why: "this would start main's editor by hand, beside the one the keeper runs.", instead: EDITOR_INSTEAD }
  }

  /** `yarn [--cwd <dir>] <script>`, `npm run <script>`:  the scripts that start main's servers */
  private checkScript(program: string, args: string[], cwd: string): Verdict | undefined {
    const at = flagValue(args, "--cwd") ?? flagValue(args, "--prefix")
    let folder = at ? folderFrom(cwd, at) : cwd
    let words = positional(args, ["--cwd", "--prefix"])
    if (words[0] === "run") words = words.slice(1)
    if (words[0] === "workspace" && words[1]) {
      const kit = checkoutOf(folder)?.root
      if (kit && words[1] === APP_WORKSPACE) folder = join(kit, "app")
      words = words.slice(2)
    }
    const [script, ...rest] = words
    if (script === "server" || script === "spell" || script === "epic" || script === "vp" || script === "vite")
      return this.checkWords(
        [script === "server" ? "spell" : script, ...(script === "server" ? ["server"] : []), ...rest],
        folder
      )
    if ((script === "start:dev" || script === "start") && this.isAppFolder(folder) && this.mainAt(folder))
      return { why: "this would start main's editor by hand, beside the one the keeper runs.", instead: EDITOR_INSTEAD }
    return undefined
  }

  /** whether `folder` is a kit's app folder (where `yarn start:dev` starts the editor) */
  private isAppFolder(folder: string): boolean {
    const root = checkoutOf(folder)?.root
    return Boolean(root) && RealPath.isIn(folder, join(root!, "app"))
  }

  /** `kill <pids | $(...)>`, `pkill [-f] <pattern>`, `killall <name>` */
  private checkKill(program: string, args: string[]): Verdict | undefined {
    if (program === "kill") {
      const targets = args.filter((arg) => !arg.startsWith("-"))
      const pids = targets.filter((arg) => /^\d+$/.test(arg)).map(Number)
      const substituted = targets
        .map((arg) => /^\$\((.*)\)$/s.exec(arg)?.[1] ?? /^`(.*)`$/s.exec(arg)?.[1])
        .filter((inner): inner is string => inner !== undefined)
      const servers = [
        ...this.serversWith({ pids }),
        ...substituted.flatMap((inner) => this.serversPicked(programOf(ServerGuard.words(inner))))
      ]
      return this.killVerdict(servers)
    }
    if (program === "pkill") return this.killVerdict(this.serversMatching(args, { full: args.includes("-f") }))
    return this.killVerdict(this.serversMatching(args, { full: false, exact: true }))
  }

  /** `<lsof | pgrep ...> | xargs [flags] kill` */
  private checkXargs(args: string[], piped?: string[]): Verdict | undefined {
    const at = args.findIndex((arg) => arg === "kill" || arg === "pkill" || arg === "killall")
    if (at < 0 || !piped) return undefined
    return this.killVerdict(this.serversPicked(programOf(piped)))
  }

  /** what `lsof -ti:<port>`, `pgrep [-f] <pattern>` or `pidof <name>` would hand a kill */
  private serversPicked([program, ...args]: string[]): ServerProcess[] {
    if (program === "lsof") {
      const ports = [...args.join(" ").matchAll(/:(\d{2,5})\b/g)].map((match) => Number(match[1]))
      return this.serversWith({ ports })
    }
    if (program === "pgrep") return this.serversMatching(args, { full: args.includes("-f") })
    if (program === "pidof") return this.serversMatching(args, { full: false, exact: true })
    if (program === "cat") return args.some((arg) => /\.spell-server/.test(arg)) ? this.mainServers() : []
    return []
  }

  /** a kill reaching any of `servers` that is main's:  refused, naming it */
  private killVerdict(servers: ServerProcess[]): Verdict | undefined {
    const main = servers.find((server) => this.isMainServer(server))
    if (!main) return undefined
    const kind = kindOf(main.command)
    const server = kind === "epic" ? "hub" : kind === "vite" ? "editor" : "page-server"
    const name = kind === "epic" ? "the epic hub" : kind === "vite" ? "main's editor" : "main's page server"
    return {
      why: `this would kill ${name} (process ${main.pid}).`,
      instead:
        server === "hub"
          ? "epic hub stop  (Spell's server keeper starts it again;  epic hub kick makes the keeper look now)"
          : `spell server restart ${server}  (or spell server stop ${server})`
    }
  }

  ////////////////
  // ## The servers
  ////////////////

  /** the main checkout `folder` is in, or `undefined`:  a worktree's folder, or no main's */
  private mainAt(folder: string): string | undefined {
    const checkout = checkoutOf(folder)
    if (!checkout || checkout.worktree !== undefined) return undefined
    return this.mains.find((main) => RealPath.same(main, checkout.root))
  }

  /** whether `server` is a main checkout's:  the hub always (the machine's one), else by the checkout it serves */
  private isMainServer(server: ServerProcess): boolean {
    const kind = kindOf(server.command)
    if (!kind) return false
    if (kind === "epic") return true
    const checkout = serverCheckoutOf(server)
    return Boolean(checkout && this.mainAt(checkout))
  }

  /** every server, asked once */
  private allServers(): ServerProcess[] {
    this.servers ??= this.listServers()
    return this.servers
  }

  /** main's servers */
  private mainServers(): ServerProcess[] {
    return this.allServers().filter((server) => this.isMainServer(server))
  }

  /**
   * the servers among `pids`, or listening on `ports`, a server's child counted as it:  `vp dev` runs Vite as its child,
   * which is what holds the port (`lsof -ti:3000` names the child)
   */
  private serversWith({ pids = [], ports = [] }: { pids?: number[]; ports?: number[] }): ServerProcess[] {
    if (!pids.length && !ports.length) return []
    const servers = this.allServers()
    const byPid = new Map(servers.map((server) => [server.pid, server]))
    const found = new Set<ServerProcess>()
    for (const server of servers) if (server.port !== undefined && ports.includes(server.port)) found.add(server)
    const asked = [...pids, ...ports.flatMap((port) => this.listeners(port))]
    for (const pid of asked) {
      let at: number | undefined = pid
      for (let up = 0; at && up < ANCESTORS; up++) {
        const server = byPid.get(at)
        if (server) found.add(server)
        this.parents ??= this.listParents()
        at = this.parents.get(at)
      }
    }
    return [...found]
  }

  /**
   * the servers a `pkill` / `killall` / `pgrep` pattern would match:  its whole command line (`full`, `-f`), else its
   * program's name;  `exact`:  the name whole (`killall`)
   */
  private serversMatching(
    args: string[],
    { full, exact = false }: { full: boolean; exact?: boolean }
  ): ServerProcess[] {
    const pattern = positional(args, ["-s", "-signal", "-u", "-U", "-g", "-G", "-P", "-t"])[0]
    if (!pattern) return []
    const matches = (text: string) => {
      if (exact) return text === pattern
      try {
        return new RegExp(pattern).test(text)
      } catch {
        return text.includes(pattern)
      }
    }
    return this.allServers().filter((server) =>
      matches(full ? server.command : basename(server.command.split(/\s+/)[0] ?? ""))
    )
  }
}

/** A refused command:  the piece refused, why, and what to run instead (`ServerGuard.check()`). */
export type GuardRefusal = {
  /** the piece of the command that reaches main's server */
  command: string
  /** why, in one line */
  why: string
  /** the command to run instead */
  instead: string
}

/** A refusal before it knows its piece. */
type Verdict = Omit<GuardRefusal, "command">

/** One simple command of a shell line (`ServerGuard.pieces()`). */
export type Piece = {
  /** its text, trimmed */
  text: string
  /** the operator before it:  `start` for the first */
  before: Operator
  /** taken from inside a `$(...)` or backticks */
  substituted?: boolean
}

/** What joins two pieces. */
type Operator = "start" | "&&" | "||" | ";" | "|" | "&"

/** How far up a process's parents a kill is followed to the server it belongs to. */
const ANCESTORS = 6

/** The processes listening on TCP `port` (`lsof`);  none when it can't tell.  NEVER throws. */
function listenersOn(port: number): number[] {
  const ran = spawnSync("lsof", ["-nP", "-t", `-iTCP:${port}`, "-sTCP:LISTEN"], { encoding: "utf8", timeout: 3000 })
  return (ran.stdout ?? "")
    .split(/\s+/)
    .filter((pid) => /^\d+$/.test(pid))
    .map(Number)
}

/** What runs another command:  skipped, so the command after it is judged. */
const WRAPPERS = new Set(["sudo", "env", "nohup", "exec", "time", "command", "builtin", "nice", "caffeinate"])

/** Spell's keeper's list of main checkouts, in its home (`spell/server/keeper`'s `KEEPER_LIST_FILE`). */
const KEEPER_LIST_FILE = "keeper.json5"

/** Spell's keeper's holds, in its home:  `{ held, handsOff }` (`spell/server/keeper`'s `KEEPER_HOLDS_FILE`). */
const KEEPER_HOLDS_FILE = "server-keeper-holds.json"

/** The app folder's workspace name, `yarn workspace spell-app ...`. */
const APP_WORKSPACE = "spell-app"

/** The way to ask for main's editor. */
const EDITOR_INSTEAD = "spell server start editor  (or spell server restart editor)"

/**
 * `words` as the program it runs and its arguments:  `node <kit>/bin/spell.mjs` is `spell`, `npx vite` is `vite`,
 * a path its name (`./node_modules/.bin/vp` is `vp`, `~/.local/bin/epic` is `epic`).
 */
function programOf(words: string[]): string[] {
  let [first, ...rest] = words
  if (first === undefined) return []
  if (first === "npx" || first === "bunx") [first, ...rest] = rest.filter((arg) => !arg.startsWith("-"))
  if (first === undefined) return []
  if (first === "node" || first === "tsx" || basename(first) === "node") {
    const script = rest.find((arg) => !arg.startsWith("-"))
    if (!script) return [first, ...rest]
    const after = rest.slice(rest.indexOf(script) + 1)
    if (/bin\/spell(\.mjs)?$/.test(script)) return ["spell", ...after]
    if (/bin\/epic$/.test(script) || /epicMain\.[jt]s$/.test(script)) return ["epic", ...after]
    if (/vite-plus\/bin\/vp$|\.bin\/vp$/.test(script)) return ["vp", ...after]
    if (/vite\/bin\/vite\.js$|\.bin\/vite$/.test(script)) return ["vite", ...after]
    return [first, ...rest]
  }
  const name = basename(first).replace(/\.(mjs|cmd)$/, "")
  return [name, ...rest]
}

/** `args` without flags (and the values of `valued` flags) */
function positional(args: string[], valued: string[] = ["--root", "--port", "--spaces", "--repo"]): string[] {
  const words: string[] = []
  for (let at = 0; at < args.length; at++) {
    const arg = args[at]
    if (valued.includes(arg)) at++
    else if (!arg.startsWith("-")) words.push(arg)
  }
  return words
}

/** the value after flag `flag` (`--root x`, `--root=x`) */
function flagValue(args: string[], flag: string): string | undefined {
  for (let at = 0; at < args.length; at++) {
    if (args[at] === flag) return args[at + 1]
    if (args[at].startsWith(`${flag}=`)) return args[at].slice(flag.length + 1)
  }
  return undefined
}

/** where `cd <to>` from `cwd` lands:  `~` and `-` read;  none, home */
function folderFrom(cwd: string, to: string | undefined): string {
  if (!to || to === "~") return homedir()
  if (to === "-") return cwd
  const path = to.startsWith("~/") ? join(homedir(), to.slice(2)) : to
  return isAbsolute(path) ? resolve(path) : resolve(cwd, path)
}

/** `word` without the `)` and `}` that close a group around its command (`(cd x && kill 1)`), its own kept */
function withoutClosers(word: string): string {
  let end = word.length
  const opens = (word.match(/\(/g) ?? []).length
  let closes = (word.match(/\)/g) ?? []).length
  while (end > 0 && (word[end - 1] === "}" || (word[end - 1] === ")" && closes > opens))) {
    if (word[end - 1] === ")") closes--
    end--
  }
  return word.slice(0, end)
}

/** the index of the `)` closing the `(` at `open`, quotes respected;  none, the end */
function closingParen(text: string, open: number): number {
  let depth = 0
  let quote: string | undefined
  for (let at = open; at < text.length; at++) {
    const char = text[at]
    if (quote) {
      if (char === quote) quote = undefined
    } else if (char === "'" || char === '"') quote = char
    else if (char === "(") depth++
    else if (char === ")" && --depth === 0) return at
  }
  return text.length
}
