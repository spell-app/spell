import { execFileSync, spawnSync, type SpawnSyncOptions, type SpawnSyncReturns } from "node:child_process"
import { readdirSync, readlinkSync } from "node:fs"
import { isAbsolute } from "node:path"

/****************
 * ### `Processes`
 * What's running on this machine, asked the same way on macOS, Linux and Windows (epic `epic-friend` P15):
 * every process and its parent, a process's working folder, the files it has open, and running a command.
 *
 * ```ts
 * Processes.table()                        // every process:  pid => { ppid, command }
 * Processes.table({ args: true })          // ... `command` its whole command line
 * Processes.folderOf([4120, 4133])         // each one's working folder, by pid
 * Processes.portsOf([4120])               // the TCP port each listens on
 * Processes.openFiles(4120)                // the files it has open
 * Processes.run("code", [file])            // `code.cmd` through a shell on Windows
 * ```
 *
 * - Why ONE place:  the callers (spell-epic's window script, `Sessions`, `ReviewStart`, the server finder `prune`)
 *   each ran `ps` and `lsof` by hand, which Windows doesn't have and Linux may not (`lsof`)
 *   - macOS:  `ps`, `lsof`
 *   - Linux:  `ps`, and `/proc/<pid>/cwd` and `/proc/<pid>/fd/` for folders and files;  `lsof` only when `/proc`
 *     can't say
 *   - Windows:  PowerShell's `Get-CimInstance Win32_Process` for the table;  no folder or open files (nothing
 *     there tells them without admin rights), so those answer "can't tell", which every caller already handles
 * - `platform` is handed in by the tests (`process.platform` otherwise);  the parsers are pure and exported
 * - NEVER throws:  a tool that's missing or fails gives what it could, else nothing
 * - Its position:  imports only node's own modules, so plain `node` loads it by its own name,
 *   `spell/server/Processes`, types stripped (an entry of its own in the kit's `exports`)
 ****************/
export class Processes {
  /**
   * Every process, by pid:  `{ ppid, command }`;  empty when it can't be listed.
   * - `command`:  the executable's path, spaces and all;  with `args`, the whole command line
   */
  static table({ args = false, platform = process.platform }: TableOptions = {}): Map<number, ProcessRow> {
    if (platform === "win32") {
      const field = args ? "CommandLine" : "ExecutablePath"
      const script =
        `Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,${field} | ` +
        "ConvertTo-Json -Compress"
      return Processes.parseWindows(output("powershell", ["-NoProfile", "-Command", script]), field)
    }
    return Processes.parsePs(output("ps", ["-axo", `pid=,ppid=,${args ? "command" : "comm"}=`]))
  }

  /** The parent of each process, by pid:  `table()`'s `ppid`s. */
  static parents(platform: NodeJS.Platform = process.platform): Map<number, number> {
    return new Map([...Processes.table({ platform })].map(([pid, { ppid }]) => [pid, ppid]))
  }

  /**
   * Each of `pids`' working folder, by pid;  a pid left out when it can't be told (always, on Windows).
   * - Linux:  `/proc/<pid>/cwd`, else `lsof`;  macOS:  `lsof`
   */
  static folderOf(pids: number[], platform: NodeJS.Platform = process.platform): Map<number, string> {
    const folders = new Map<number, string>()
    if (!pids.length || platform === "win32") return folders
    let rest = pids
    if (platform === "linux") {
      for (const pid of pids) {
        const folder = linkAt(`/proc/${pid}/cwd`)
        if (folder) folders.set(pid, folder.replace(DELETED, ""))
      }
      rest = pids.filter((pid) => !folders.has(pid))
    }
    if (rest.length) {
      const found = Processes.parseLsof(output("lsof", ["-a", "-d", "cwd", "-p", rest.join(","), "-Fpn"]))
      for (const [pid, [folder]] of found) if (folder) folders.set(pid, folder.replace(DELETED, ""))
    }
    return folders
  }

  /**
   * The TCP port each of `pids` listens on (its first), by pid;  a pid left out when it listens on none, or it can't
   * be told.
   * - macOS and Linux:  `lsof`;  Windows:  PowerShell's `Get-NetTCPConnection`
   */
  static portsOf(pids: number[], platform: NodeJS.Platform = process.platform): Map<number, number> {
    const ports = new Map<number, number>()
    if (!pids.length) return ports
    if (platform === "win32") {
      const script =
        "Get-NetTCPConnection -State Listen | Select-Object OwningProcess,LocalPort | ConvertTo-Json -Compress"
      const wanted = new Set(pids)
      for (const [pid, port] of Processes.parseWindowsPorts(output("powershell", ["-NoProfile", "-Command", script])))
        if (wanted.has(pid)) ports.set(pid, port)
      return ports
    }
    const listens = output("lsof", ["-a", "-p", pids.join(","), "-iTCP", "-sTCP:LISTEN", "-P", "-n", "-Fpn"])
    for (const [pid, [name]] of Processes.parseLsof(listens)) {
      const port = Number(name?.split(":").pop())
      if (port) ports.set(pid, port)
    }
    return ports
  }

  /**
   * The files process `pid` has open;  empty when it can't be told (always, on Windows).
   * - Linux:  `/proc/<pid>/fd/`'s links, else `lsof`;  macOS:  `lsof`
   */
  static openFiles(pid: number, platform: NodeJS.Platform = process.platform): string[] {
    if (platform === "win32") return []
    if (platform === "linux") {
      const files = list(`/proc/${pid}/fd`)
        .map((fd) => linkAt(`/proc/${pid}/fd/${fd}`))
        .filter((file): file is string => !!file)
      if (files.length) return files
    }
    return Processes.parseLsof(output("lsof", ["-p", String(pid), "-Fpn"])).get(pid) ?? []
  }

  /**
   * Run `command` as `spawnSync()` does, through a shell on Windows:  `code`, `npx` and `yarn` are `.cmd` files there,
   * which only a shell runs (node refuses them without one since 2024's fix for CVE-2024-27980).
   * - the arguments are quoted for that shell, so a path with spaces stays one argument
   */
  static run(
    command: string,
    args: string[],
    options: SpawnSyncOptions = {},
    platform: NodeJS.Platform = process.platform
  ): SpawnSyncReturns<string> {
    const call = Processes.call(command, args, platform)
    return spawnSync(call.command, call.args, {
      encoding: "utf8",
      ...options,
      shell: call.shell
    }) as SpawnSyncReturns<string>
  }

  /**
   * How to start `command` with `args` on `platform`, for `spawn()` or `spawnSync()`:  as it is, except on
   * Windows, where a bare command name (`code`, `npx`) goes through the shell as one quoted command line.
   * - an absolute path (`process.execPath`) is started as it is everywhere
   */
  static call(command: string, args: string[], platform: NodeJS.Platform = process.platform): ShellCall {
    if (platform !== "win32" || isAbsolute(command)) return { command, args, shell: false }
    return { command: [command, ...args.map(quoteForCmd)].join(" "), args: [], shell: true }
  }

  ////////////////
  // ## Parsers:  pure, for the tests
  ////////////////

  /** `ps -o pid=,ppid=,<comm or command>=` output, as `table()` gives it. */
  static parsePs(text: string): Map<number, ProcessRow> {
    const processes = new Map<number, ProcessRow>()
    for (const line of text.split("\n")) {
      const match = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line)
      if (match) processes.set(Number(match[1]), { ppid: Number(match[2]), command: match[3]!.trim() })
    }
    return processes
  }

  /** PowerShell's `Win32_Process` rows as JSON (one object, or a list), its `field` the command. */
  static parseWindows(text: string, field = "ExecutablePath"): Map<number, ProcessRow> {
    const processes = new Map<number, ProcessRow>()
    let rows: unknown
    try {
      rows = JSON.parse(text)
    } catch {
      return processes
    }
    for (const row of (Array.isArray(rows) ? rows : [rows]) as Array<Record<string, unknown>>) {
      const pid = Number(row?.ProcessId)
      if (!pid) continue
      const command = row[field]
      processes.set(pid, {
        ppid: Number(row.ParentProcessId) || 0,
        command: typeof command === "string" ? command.trim() : ""
      })
    }
    return processes
  }

  /** PowerShell's `Get-NetTCPConnection` rows as JSON:  each process's first listening port. */
  static parseWindowsPorts(text: string): Map<number, number> {
    const ports = new Map<number, number>()
    let rows: unknown
    try {
      rows = JSON.parse(text)
    } catch {
      return ports
    }
    for (const row of (Array.isArray(rows) ? rows : [rows]) as Array<Record<string, unknown>>) {
      const pid = Number(row?.OwningProcess)
      const port = Number(row?.LocalPort)
      if (pid && port && !ports.has(pid)) ports.set(pid, port)
    }
    return ports
  }

  /** `lsof -F pn` output (`p<pid>`, then `n<name>` lines):  each pid's names, in order. */
  static parseLsof(text: string): Map<number, string[]> {
    const names = new Map<number, string[]>()
    let pid = 0
    for (const line of text.split("\n")) {
      if (line.startsWith("p")) pid = Number(line.slice(1))
      else if (line.startsWith("n") && pid) names.set(pid, [...(names.get(pid) ?? []), line.slice(1)])
    }
    return names
  }
}

/** `table()`'s options. */
export type TableOptions = {
  /** each `command` the whole command line, not only the executable */
  args?: boolean
  /** the system to ask as;  the tests hand one in */
  platform?: NodeJS.Platform
}

/** How to start a command (`Processes.call()`):  its command, its arguments, and whether through the shell. */
export type ShellCall = { command: string; args: string[]; shell: boolean }

/** One process, in `Processes.table()`. */
export type ProcessRow = {
  /** its parent's pid;  `0` when it has none */
  ppid: number
  /** its executable's path, or its whole command line (`args`) */
  command: string
}

/** What Linux and `lsof` add to a folder that's been deleted. */
const DELETED = / \(deleted\)$/

/** `command args`' stdout, or "" when it can't run;  what it printed before failing is kept (`lsof` exits 1 often). */
function output(command: string, args: string[]): string {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: MAX_OUTPUT })
  } catch (error) {
    return String((error as { stdout?: string }).stdout ?? "")
  }
}

/** The most a tool's output may be:  a busy machine's process list with whole command lines runs past node's 1MB. */
const MAX_OUTPUT = 64 * 1024 * 1024

/** Where the link at `path` points, or `undefined`. */
function linkAt(path: string): string | undefined {
  try {
    return readlinkSync(path)
  } catch {
    return undefined
  }
}

/** The names in folder `path`, or none. */
function list(path: string): string[] {
  try {
    return readdirSync(path)
  } catch {
    return []
  }
}

/** `arg` quoted for `cmd.exe`:  in double quotes when it has a space or a special character. */
function quoteForCmd(arg: string): string {
  return /^[\w./:=@\\-]+$/.test(arg) ? arg : `"${arg.replace(/"/g, '""')}"`
}
