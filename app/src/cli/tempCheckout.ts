import { spawnSync } from "child_process"
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync
} from "fs"
import { tmpdir } from "os"
import { join, resolve } from "path"

import { CLI } from "spell/cli"

/*
 * A temp git worktree of the kit at some commit, for a command comparing this checkout with it:
 * `spell speedtest --against`, `spell content compare`.
 * - Loads no spell:  `spell content compare` stays quick to start.
 */

/**
 * Check `ref` of git repo `repo` out into a new temp folder, named from `prefix`, and return the folder.
 * - `prepare`:  ready it (its `node_modules`, a check of what it holds);  if that throws, the folder is removed.
 * - `removeCheckout()` when done.
 */
export function addCheckout(repo: string, ref: string, prefix: string, prepare: (folder: string) => void): string {
  const folder = realpathSync(mkdtempSync(resolve(tmpdir(), prefix)))
  try {
    git(["worktree", "add", "--detach", folder, ref], repo)
    prepare(folder)
  } catch (error) {
    removeCheckout(repo, folder)
    throw error
  }
  return folder
}

/**
 * Give temp checkout `folder` a `node_modules` of its own, so it runs as itself:
 * - each package linked to the kit's
 * - EXCEPT the kit's own links (`spell`, `spell-parser` ...), relative ones, kept relative:
 *   so its imports find ITS source, never this checkout's
 */
export function linkInstall(kit: string, folder: string): void {
  const modules = join(kit, "node_modules")
  const own = join(folder, "node_modules")
  mkdirSync(own)
  for (const name of readdirSync(modules)) {
    const entry = join(modules, name)
    const isLocalLink = lstatSync(entry).isSymbolicLink() && readlinkSync(entry).startsWith("..")
    symlinkSync(isLocalLink ? readlinkSync(entry) : entry, join(own, name))
  }
}

/**
 * Remove the worktree `addCheckout()` made.
 * - Unlinks a linked `node_modules` FIRST, so nothing deleting the folder can reach through it.
 */
export function removeCheckout(repo: string, folder: string): void {
  const modules = resolve(folder, "node_modules")
  if (lstatSync(modules, { throwIfNoEntry: false })?.isSymbolicLink()) unlinkSync(modules)
  spawnSync("git", ["worktree", "remove", "--force", folder], { cwd: repo })
  rmSync(folder, { recursive: true, force: true })
  spawnSync("git", ["worktree", "prune"], { cwd: repo })
}

/** Run `git ...args` in `cwd`, returning its output -- or throwing `CLI.CliError` with what it said. */
export function git(args: string[], cwd: string): string {
  const { status, stdout, stderr } = spawnSync("git", args, { cwd, encoding: "utf8" })
  if (status !== 0) throw new CLI.CliError(`git ${args[0]} failed:  ${stderr.trim()}`)
  return stdout.trim()
}
