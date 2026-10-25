/**
 * The extension's pure parts:
 * page URLs, the epic pages listed for "Open Epic...", where a served URL's file is, a Claude tab's label, a window's
 * folder.
 * - no `vscode` here, and node built-ins only (`RealPath` too, by its file), so its tests run under plain `node`
 *   (`tests/vscode/docUrls.test.ts`)
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

// By its file, not `spell-epic/...`:  plain `node` runs this file's tests, with no alias table
import { RealPath } from "spell/server/RealPath"

/** The extension's id, `<publisher>.<name>`:  its `vscode://` URIs start with it. */
export const EXTENSION_ID = "spell-app.spell-epic"

/** The URI handler's path:  `vscode://spell-app.spell-epic/doc-preview?file=...`. */
export const PREVIEW_PATH = "/doc-preview"

/**
 * The window bridge's registry folder:  `$SPELL_EPIC_WINDOWS_DIR`, else `~/.spell-epic/windows`.
 * - NOT the spell language extension's `~/.spell/windows`:  while both are installed, each window runs both bridges,
 *   and each writes `<pid>.json`;  spell-epic's `src/window.mjs` reads this folder first
 */
export function windowsFolder(env: NodeJS.ProcessEnv = process.env, home = homedir()): string {
  return env.SPELL_EPIC_WINDOWS_DIR || join(home, ".spell-epic", "windows")
}

/**
 * Index of `folder` among a window's `folders`, or -1:  `WindowBridge.indexOf()`.
 * - by real paths (`RealPath.same()`):  a window reopened from VS Code's recent list after a move behind a compat link
 *   holds the OLD spelling of its folders (epic `epic-engine` I59)
 */
export function folderIndex(folders: string[], folder: string): number {
  return folders.findIndex((each) => RealPath.same(each, folder))
}

/** `url` with a fresh `?t=` stamp:  a URL no frame or browser has cached, so loading it is a reload. */
export function stamped(url: string, now = Date.now()): string {
  const fresh = new URL(url)
  fresh.searchParams.set("t", String(now))
  return fresh.href
}

/**
 * Whether URLs `a` and `b` are the same page:  same origin, path and query, ignoring the `?t=` stamp and the hash.
 * - the same page shown again isn't reloaded:  see `DocView.show()`
 */
export function samePage(a: string, b: string): boolean {
  const [first, second] = [new URL(a), new URL(b)]
  for (const url of [first, second]) {
    url.searchParams.delete("t")
    url.hash = ""
  }
  return first.href === second.href
}

/** Whether `url` is plain http on this machine (`127.0.0.1` / `localhost`):  never open anything else. */
export function isLoopback(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" && ["127.0.0.1", "localhost"].includes(parsed.hostname)
  } catch {
    return false
  }
}

/** `text` safe inside a double-quoted html attribute. */
export function escapeAttribute(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
}

////////////////
// ## Epic pages
////////////////

/** An epic page, as `planDocsIn()` lists it:  its epic, file, title (no `Epic: `), last change, and repo. */
export type PlanDocEntry = { name: string; file: string; title: string; changed: Date; repo?: string }

/**
 * Every epic page under `content`'s `epics/`, most recently changed first;  each one's `repo` is `repo`.
 * - `epics/<name>/<name>.plan.html`
 */
export function planDocsIn(content: string, repo?: string): PlanDocEntry[] {
  const epics = join(content, "epics")
  if (!existsSync(epics)) return []
  return readdirSync(epics, { withFileTypes: true })
    .flatMap((entry) => {
      const file = join(epics, entry.name, `${entry.name}.plan.html`)
      if (!existsSync(file)) return []
      const title = /<title>(?:Epic:\s*)?([^<]*)<\/title>/.exec(readFileSync(file, "utf8"))?.[1]?.trim()
      return [
        { name: entry.name, file, title: title || entry.name, changed: statSync(file).mtime, ...(repo && { repo }) }
      ]
    })
    .sort((a, b) => b.changed.getTime() - a.changed.getTime())
}

/**
 * Every epic page of every repo in `repos` (`{ name, content }`), most recently changed first.
 * - a content folder listed twice counts once
 */
export function planDocsOf(repos: { name: string; content: string }[]): PlanDocEntry[] {
  const seen = new Set<string>()
  return repos
    .filter((repo) => !seen.has(repo.content) && seen.add(repo.content))
    .flatMap((repo) => planDocsIn(repo.content, repo.name))
    .sort((a, b) => b.changed.getTime() - a.changed.getTime())
}

////////////////
// ## Served files
////////////////

/**
 * What a page server says of itself at `/api/server`:  a checkout's page server (`root`, `worktrees`), or spell-epic's
 * epic server (`epicServer`, `engine`, `repos`).
 */
export type ServerInfo = {
  root?: string
  worktrees?: string
  /** every folder its `/worktrees/<w>/` serves, `worktrees` first (epic `epic-eject` J28) */
  worktreesFolders?: string[]
  epicServer?: boolean
  engine?: string
  repos?: { name: string; content: string; prefix: string; isDefault: boolean }[]
}

/**
 * The file a page server serves at URL path `path` (decoded segments joined), for a link the page couldn't follow:
 * `undefined` when the server doesn't say.
 * - the epic server:
 *   - `/_epic/assets/...` and `/_epic/pack/...` in its engine
 *   - `/r/<repo>/...` in that repo's content
 *   - anything else in the default repo's content
 * - a checkout's page server:  under its root;  `/worktrees/<w>/...` in the first folder it serves worktrees from
 *   that holds `<w>`, else the first
 */
export function fileForPath(info: ServerInfo, path: string): string | undefined {
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent)
  if (info.epicServer) {
    if (parts[0] === "_epic" && info.engine) {
      const folder = ENGINE_FOLDERS[parts[1] as keyof typeof ENGINE_FOLDERS]
      return folder && join(info.engine, folder, ...parts.slice(2))
    }
    const named = parts[0] === "r" ? info.repos?.find((repo) => repo.name === parts[1]) : undefined
    if (named) return join(named.content, ...parts.slice(2))
    const home = info.repos?.find((repo) => repo.isDefault)
    return home && join(home.content, ...parts)
  }
  if (!info.root) return undefined
  const folders = info.worktreesFolders ?? (info.worktrees ? [info.worktrees] : [])
  if (parts[0] === "worktrees" && parts[1] && folders.length) {
    const folder = folders.find((each) => existsSync(join(each, parts[1]!))) ?? folders[0]!
    return join(folder, ...parts.slice(1))
  }
  return join(info.root, ...parts)
}

/** The engine's routes, `/_epic/<route>/...`, by route:  their folders in spell-epic's checkout. */
const ENGINE_FOLDERS = { assets: "src/tools/_assets", pack: "src/components/__pack" } as const

////////////////
// ## Claude tabs
////////////////

/** Longest Claude tab label before it's cut, `…` included (extension 2.1.287). */
export const TAB_TITLE_LENGTH = 25

/**
 * Whether a Claude tab labelled `label` shows session title `title`.
 * - the label is the title, or its first `TAB_TITLE_LENGTH - 1` characters plus `…`
 */
export function tabShows(label: string, title: string): boolean {
  const full = title.trim()
  if (label === full) return true
  return full.length > TAB_TITLE_LENGTH && label === `${full.substring(0, TAB_TITLE_LENGTH - 1)}…`
}
