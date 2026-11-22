/**
 * Tests of the private names check (`spell names check`;  epic `epic-engine` T153):  a made-up list, a made-up repo
 * with a made-up name in a file, a commit message, a branch name and a picture, all in a temp folder.
 * - never the machine's own list (`~/.spell/private-names`), never a real push or publish
 * - the picture is read by macOS's own text recognition on a Mac, else by a stand-in
 */
import { execFileSync, spawnSync } from "node:child_process"
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, describe, expect, test } from "vite-plus/test"

import {
  NameCheck,
  nameReportLines,
  PICTURE_TEXT_SETTING,
  PictureText,
  PRIVATE_NAMES_SETTING,
  PrivateNames
} from "spell/cli/commands/names"
import { privateNamesCheck } from "spell/cli/commands/publishCommand"

const KIT = realpathSync(join(import.meta.dirname, "..", "..", ".."))
const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "names-check-")))
afterAll(() => rmSync(TEMP, { recursive: true, force: true }))
for (const [key, value] of Object.entries({ NAME: "Test", EMAIL: "test@example.com" })) {
  process.env[`GIT_AUTHOR_${key}`] = value
  process.env[`GIT_COMMITTER_${key}`] = value
}

/** A committed picture whose words include "left out on Mondays". */
const PICTURE = join(KIT, "epic", "docs", "images", "demo", "items.png")

/** The made-up list:  a name, a pattern, and the picture's words. */
const LIST = `# made up
zorblax
quim+ble
left out on Mondays
`

/** Run `git <args>` in `cwd`;  its output, trimmed. */
function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", ["-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" }).trim()
}

/** A list file in the temp folder. */
function listFile(text = LIST, name = "names"): string {
  const file = join(TEMP, name)
  writeFileSync(file, text)
  return file
}

/** Reads a picture as macOS would:  the real thing on a Mac, else words made up from the file's name. */
function pictureText(name: string): PictureText {
  const folder = join(TEMP, `pictures-${name}`)
  if (process.platform === "darwin") return new PictureText({ folder })
  return new PictureText({
    folder,
    recognise: (files) => new Map(files.map((file) => [file, "Jokes about work are left out on Mondays"]))
  })
}

/**
 * A repo with a remote:  one commit pushed (clean), then on branch `zorblax-ideas` a file naming it, a commit whose
 * message names the pattern, and a picture.
 */
function madeUpRepo(name: string) {
  const remote = join(TEMP, `${name}.git`)
  const repo = join(TEMP, name)
  git(TEMP, "init", "-q", "--bare", "-b", "main", remote)
  git(TEMP, "init", "-q", "-b", "main", repo)
  git(repo, "remote", "add", "origin", remote)
  writeFileSync(join(repo, "README.md"), "nothing here\n")
  git(repo, "add", ".")
  git(repo, "commit", "-q", "-m", "first")
  git(repo, "push", "-q", "--no-verify", "origin", "main")
  git(repo, "checkout", "-q", "-b", "zorblax-ideas")
  writeFileSync(join(repo, "notes.md"), "one\ntwo with Zorblax in it\n")
  git(repo, "add", ".")
  git(repo, "commit", "-q", "-m", "notes for the quimmmble team")
  mkdirSync(join(repo, "images"))
  copyFileSync(PICTURE, join(repo, "images", "shot.png"))
  git(repo, "add", ".")
  git(repo, "commit", "-q", "-m", "a picture")
  return { repo, remote, tip: git(repo, "rev-parse", "HEAD") }
}

describe("PrivateNames", () => {
  test("names, patterns, comments and allow lines;  each with its line", () => {
    const names = new PrivateNames({ file: "x", text: `${LIST}allow abc1234\n` })
    expect(names.patterns.map((pattern) => pattern.line)).toEqual([2, 3, 4])
    expect(names.lineFor("A ZORBLAX here")).toBe(2)
    expect(names.lineFor("quimmmble")).toBe(3)
    expect(names.lineFor("nothing")).toBeUndefined()
    expect(names.allows("abc1234def")).toBe(true)
    expect(names.allows("abd1234def")).toBe(false)
  })

  test("a line it can't read fails, loudly, without naming it", () => {
    expect(() => new PrivateNames({ file: "x", text: "fine\nback\\slash\n" })).toThrow(/line 2 of x can't be read/)
    expect(() => new PrivateNames({ file: "x", text: "(open\n" })).toThrow(/line 1 of x isn't a pattern/)
  })

  test("no file:  an empty one written, private, saying how to add a name", () => {
    const file = join(TEMP, "home", ".spell", "private-names")
    const names = PrivateNames.load(file)
    expect(names).toMatchObject({ wasMissing: true, isEmpty: true })
    expect(statSync(file).mode & 0o777).toBe(0o600)
    expect(readFileSync(file, "utf8")).toMatch(/One name a line/)
    expect(PrivateNames.load(file).wasMissing).toBe(false)
  })
})

describe("NameCheck.revisions()", () => {
  const { repo, tip } = madeUpRepo("revisions")
  const check = new NameCheck({ names: PrivateNames.load(listFile()), pictures: pictureText("revisions") })

  test("the file, the message, the branch name and the picture;  never the pushed commit", () => {
    const report = check.revisions(repo, {
      tips: [tip],
      exclude: ["--remotes=origin"],
      refs: ["refs/heads/zorblax-ideas"]
    })
    expect(report.commits).toBe(2)
    expect(report.hits).toEqual(
      expect.arrayContaining([
        { kind: "branch", where: "refs/heads/zorblax-ideas", listLine: 2 },
        { kind: "file", where: "notes.md:2", listLine: 2 },
        { kind: "commit", where: expect.stringMatching(/^[0-9a-f]{9}'s message$/), listLine: 3 },
        { kind: "commit", where: expect.stringMatching(/^[0-9a-f]{9} adds it to notes\.md:2$/), listLine: 2 },
        { kind: "picture", where: expect.stringMatching(/^images\/shot\.png \(in [0-9a-f]{9}\)$/), listLine: 4 }
      ])
    )
    expect(report.hits).toHaveLength(5)
    expect(report.pictures).toMatchObject({ read: 1, unread: 0 })
  })

  test("a picture is read once:  its words kept by its blob id", () => {
    const folder = join(TEMP, "pictures-revisions")
    const blob = git(repo, "rev-parse", `${tip}:images/shot.png`)
    expect(existsSync(join(folder, `${blob}.txt`))).toBe(true)
    const never = new PictureText({ folder, recognise: () => expect.unreachable() as never })
    const again = new NameCheck({ names: check.names, pictures: never })
    expect(again.revisions(repo, { tips: [tip], exclude: ["--remotes=origin"] }).hits).toHaveLength(4)
  })

  test("allowed commits are let through;  the files at the tip are still checked", () => {
    const allowed = git(repo, "rev-list", tip, "--not", "--remotes=origin").split("\n")
    const names = PrivateNames.load(
      listFile(`${LIST}${allowed.map((id) => `allow ${id.slice(0, 9)}`).join("\n")}\n`, "allowing")
    )
    const report = new NameCheck({ names, pictures: pictureText("revisions") }).revisions(repo, {
      tips: [tip],
      exclude: ["--remotes=origin"]
    })
    expect(report.hits).toEqual([{ kind: "file", where: "notes.md:2", listLine: 2 }])
  })

  test("off a Mac:  pictures not read, and said so", () => {
    const blind = new NameCheck({
      names: check.names,
      pictures: new PictureText({ folder: join(TEMP, "pictures-blind"), canRead: false })
    })
    const report = blind.revisions(repo, { tips: [tip], exclude: ["--remotes=origin"] })
    expect(report.pictures).toEqual({ read: 0, unread: 1, cantRead: true })
    expect(nameReportLines(report, "this push").at(-1)).toBe(
      "1 picture not checked:  only a Mac can read the words in pictures."
    )
  })

  test("what it prints says where, and which list line, never the name", () => {
    const lines = nameReportLines(check.revisions(repo, { tips: [tip], exclude: ["--remotes=origin"] }), "this push")
    expect(lines[0]).toBe(`Private names:  this push holds 4 names from your private list, ${check.names.file}.`)
    expect(lines).toContain("  file     notes.md:2  (line 2 of your list)")
    expect(lines.at(-1)).toMatch(
      /^A commit that's already public can be let through:  add the line `allow [0-9a-f]{9}` to your list\.$/
    )
    expect(lines.join("\n")).not.toMatch(/zorblax|quim|mondays/i)
  })

  test("an empty list:  nothing checked, and said so", () => {
    const empty = new NameCheck({ names: new PrivateNames({ file: join(TEMP, "none"), text: "# nothing\n" }) })
    const report = empty.revisions(repo, { tips: [tip] })
    expect(report).toMatchObject({ names: 0, hits: [] })
    expect(nameReportLines(report, "this push")[0]).toMatch(
      /nothing was checked, because your list of private names is empty/
    )
  })
})

describe("NameCheck.push()", () => {
  const { repo, tip } = madeUpRepo("push")
  const check = new NameCheck({ names: PrivateNames.load(listFile()), pictures: pictureText("push") })
  const ZERO = "0".repeat(40)

  test("git's pre-push lines:  a new branch's commits and both ref names", () => {
    const report = check.push(repo, `refs/heads/zorblax-ideas ${tip} refs/heads/zorblax-ideas ${ZERO}\n`, "origin")
    expect(report.commits).toBe(2)
    expect(report.hits.filter((hit) => hit.kind === "branch")).toHaveLength(1)
  })

  test("a deletion sends nothing", () => {
    expect(check.push(repo, `(delete) ${ZERO} refs/heads/old ${tip}\n`, "origin")).toMatchObject({
      commits: 0,
      hits: []
    })
  })
})

describe("NameCheck.folder()", () => {
  test("every file, text by line and pictures by their words;  binary skipped", () => {
    const dir = join(TEMP, "folder")
    mkdirSync(join(dir, "dist"), { recursive: true })
    writeFileSync(join(dir, "dist", "a.d.ts"), "export {}\n// zorblax\n")
    writeFileSync(join(dir, "blob.bin"), Buffer.from([0, 1, 2, 0x7a, 0x6f, 0x72, 0x62, 0x6c, 0x61, 0x78]))
    copyFileSync(PICTURE, join(dir, "shot.png"))
    const check = new NameCheck({ names: PrivateNames.load(listFile()), pictures: pictureText("folder") })
    expect(check.folder(dir, "spell@1.0.0").hits).toEqual([
      { kind: "file", where: "spell@1.0.0:  dist/a.d.ts:2", listLine: 2 },
      { kind: "picture", where: "spell@1.0.0:  shot.png", listLine: 4 }
    ])
  })
})

describe("spell publish's check", () => {
  /** A packed file of `files`, as `npm pack` lays one out. */
  function packed(name: string, files: Record<string, string>) {
    const dir = join(TEMP, `pack-${name}`)
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(join(dir, path, ".."), { recursive: true })
      writeFileSync(join(dir, path), text)
    }
    const tgz = join(TEMP, `${name}.tgz`)
    execFileSync("tar", ["-czf", tgz, "-C", dir, "package"])
    return { name, version: "1.0.0", tgz }
  }

  test("a packed file naming one fails the publish's checks", () => {
    const check = new NameCheck({ names: PrivateNames.load(listFile()), pictures: pictureText("publish") })
    const result = privateNamesCheck(check, packed("bad", { "package/dist/x.js": "const team = 'Zorblax'\n" }))
    expect(result).toMatchObject({ pkg: "bad", ok: false })
    expect(result.detail).toContain("bad@1.0.0:  package/dist/x.js:1  (line 2 of your list)")
    expect(privateNamesCheck(check, packed("good", { "package/x.js": "fine\n" }))).toMatchObject({ ok: true })
  })

  test("no list on this machine:  passes, saying so", () => {
    const check = new NameCheck({ names: new PrivateNames({ file: "none", text: "" }) })
    expect(privateNamesCheck(check, packed("any", { "package/x.js": "zorblax\n" }))).toMatchObject({
      ok: true,
      detail: "not checked:  this machine has no list of private names"
    })
  })
})

describe("the pre-push hook", () => {
  const { repo, tip } = madeUpRepo("hook")
  const ZERO = "0".repeat(40)
  const env = {
    ...process.env,
    [PRIVATE_NAMES_SETTING]: listFile(),
    [PICTURE_TEXT_SETTING]: join(TEMP, "pictures-hook")
  }

  /** The hook run as git runs it, in `repo`, for a push of `line`. */
  function hook(line: string) {
    return spawnSync(process.execPath, [join(KIT, "tools", "pre-push.ts"), "origin", "unused"], {
      cwd: repo,
      env,
      input: `${line}\n`,
      encoding: "utf8"
    })
  }

  test("a branch naming one:  the push fails, saying where", () => {
    const run = hook(`refs/heads/zorblax-ideas ${tip} refs/heads/zorblax-ideas ${ZERO}`)
    expect(run.status).toBe(1)
    expect(run.stdout).toMatch(/this push holds 5 names/)
    expect(run.stdout).toMatch(/branch   refs\/heads\/zorblax-ideas/)
  })

  test("a clean branch:  the push goes ahead", () => {
    const clean = git(repo, "rev-parse", "main")
    const run = hook(`refs/heads/tidy ${clean} refs/heads/tidy ${ZERO}`)
    expect(run.stdout).toMatch(/none found in this push/)
    expect(run.status).toBe(0)
  })
})
