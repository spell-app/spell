import { lstatSync, mkdirSync, mkdtempSync, readlinkSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"

const { Processes, Links, LinkError } = SRV

const TOP = realpathSync(mkdtempSync(join(tmpdir(), "processes-")))
afterAll(() => rmSync(TOP, { recursive: true, force: true }))

describe("Processes", () => {
  test("parsePs():  macOS and Linux `ps`, executables with spaces kept whole", () => {
    const text = [
      "    1     0 /sbin/launchd",
      "  412     1 /Applications/Visual Studio Code.app/Contents/MacOS/Electron",
      "  990   412 claude",
      "garbage"
    ].join("\n")
    expect([...Processes.parsePs(text)]).toEqual([
      [1, { ppid: 0, command: "/sbin/launchd" }],
      [412, { ppid: 1, command: "/Applications/Visual Studio Code.app/Contents/MacOS/Electron" }],
      [990, { ppid: 412, command: "claude" }]
    ])
  })

  test("parseWindows():  PowerShell's Win32_Process as JSON, a list or one row;  not JSON:  nothing", () => {
    const rows = JSON.stringify([
      { ProcessId: 4, ParentProcessId: 0, ExecutablePath: null },
      { ProcessId: 5120, ParentProcessId: 4, ExecutablePath: "C:\\Program Files\\Microsoft VS Code\\Code.exe" },
      { ProcessId: 6000, ParentProcessId: 5120, CommandLine: '"node.exe" claude' }
    ])
    expect([...Processes.parseWindows(rows)]).toEqual([
      [4, { ppid: 0, command: "" }],
      [5120, { ppid: 4, command: "C:\\Program Files\\Microsoft VS Code\\Code.exe" }],
      [6000, { ppid: 5120, command: "" }]
    ])
    expect(Processes.parseWindows(rows, "CommandLine").get(6000)).toEqual({ ppid: 5120, command: '"node.exe" claude' })
    expect([...Processes.parseWindows(JSON.stringify({ ProcessId: 7, ParentProcessId: 1 }))]).toEqual([
      [7, { ppid: 1, command: "" }]
    ])
    expect(Processes.parseWindows("not json").size).toBe(0)
  })

  test("parseLsof():  each pid's names, in order", () => {
    const text = ["p41", "fcwd", "n/Users/ana/www/app", "p42", "n/tmp", "n/tmp/b"].join("\n")
    expect([...Processes.parseLsof(text)]).toEqual([
      [41, ["/Users/ana/www/app"]],
      [42, ["/tmp", "/tmp/b"]]
    ])
  })

  test("parseWindowsPorts():  each process's first listening port", () => {
    const rows = JSON.stringify([
      { OwningProcess: 900, LocalPort: 4747 },
      { OwningProcess: 900, LocalPort: 4748 },
      { OwningProcess: 901, LocalPort: 5173 }
    ])
    expect([...Processes.parseWindowsPorts(rows)]).toEqual([
      [900, 4747],
      [901, 5173]
    ])
    expect(Processes.parseWindowsPorts("").size).toBe(0)
  })

  test("Windows:  no folder and no open files can be told", () => {
    expect(Processes.folderOf([process.pid], "win32").size).toBe(0)
    expect(Processes.openFiles(process.pid, "win32")).toEqual([])
  })

  test("this machine:  the table has this process, under its parent;  its folder is the cwd (none on Windows)", () => {
    const table = Processes.table()
    expect(table.get(process.pid)?.ppid).toBe(process.ppid)
    expect(Processes.parents().get(process.pid)).toBe(process.ppid)
    const folder = Processes.folderOf([process.pid]).get(process.pid)
    expect(folder && realpathSync(folder)).toBe(process.platform === "win32" ? undefined : realpathSync(process.cwd()))
  })

  test("run():  a command as spawnSync() runs it", () => {
    expect(Processes.run("node", ["-e", "process.stdout.write('hi')"]).stdout).toBe("hi")
  })

  test("call():  as it is;  on Windows a bare name through the shell, an argument with a space quoted", () => {
    expect(Processes.call("code", ["a b"], "darwin")).toEqual({ command: "code", args: ["a b"], shell: false })
    expect(Processes.call("code", ["--open-url", "C:\\My Work\\x.code-workspace", 'say "hi"'], "win32")).toEqual({
      command: 'code --open-url "C:\\My Work\\x.code-workspace" "say ""hi"""',
      args: [],
      shell: true
    })
    expect(Processes.call(process.execPath, ["x"], "win32").shell).toBe(false)
  })
})

describe("Links", () => {
  test("folder():  a directory link elsewhere;  a junction, its target made absolute, on Windows", () => {
    const target = join(TOP, "target")
    mkdirSync(target)
    const at = join(TOP, "linked")
    Links.folder(at, "target")
    expect(lstatSync(at).isSymbolicLink()).toBe(true)
    expect(realpathSync(at)).toBe(target)
  })

  test("file():  a file link;  refused on Windows as a LinkError naming Developer Mode", () => {
    writeFileSync(join(TOP, "bin.txt"), "x")
    const at = join(TOP, "bin-link")
    Links.file(at, join(TOP, "bin.txt"))
    expect(readlinkSync(at)).toBe(join(TOP, "bin.txt"))
    // already there:  the system's own error, not a LinkError
    expect(() => Links.file(at, join(TOP, "bin.txt"), "win32")).toThrow(/EEXIST/)
    const error = new LinkError("x")
    expect(error.name).toBe("LinkError")
    expect(SRV.DEVELOPER_MODE).toMatch(/Developer Mode/)
  })
})
