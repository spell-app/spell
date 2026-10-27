/**
 * The extension's pure parts:
 * page URLs, the epic pages listed for "Open Epic...", where a served URL's file is, a Claude tab's label, a window's
 * folder.
 * - no `vscode` here, and node built-ins only (`RealPath` and spell-epic's server constants too, each by its file),
 *   so its tests run under plain `node` (`tests/vscode/docUrls.test.ts`)
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import type { SRV } from "spell/server"
// By its file, not the barrel:  plain `node` runs this file's tests
import { RealPath } from "spell/server/RealPath"

// With its `.ts`:  plain `node` adds no extension to a name
import { ENGINE_PREFIX, ENGINE_ROUTES, type EpicServerInfo } from "spell/epic/server/server.types.ts"

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
 * The file a page server serves at URL path `path` (decoded segments joined), for a link the page couldn't follow:
 * `undefined` when the server doesn't say.
 * - what the server says of itself at `/api/server`:  a checkout's page server, the kit's `ServerInfo` (`root`,
 *   `worktrees`);  or spell-epic's epic server, its `EpicServerInfo` (`epicServer`, `engine`, `repos`)
 * - the epic server, as it lays out what it serves (`EpicServer`):
 *   - the engine's routes (`ENGINE_ROUTES`:  `/_epic/assets/...`, `/_epic/pack/...`, `/templates/...`) in its engine;
 *     the templates under each repo's prefix too, `/r/<repo>/templates/...`
 *   - `/r/<repo>/...` in that repo's content
 *   - anything else in the default repo's content
 * - a checkout's page server:  under its root;  `/worktrees/<w>/...` in the first folder it serves worktrees from
 *   that holds `<w>`, else the first
 */
export function fileForPath(info: SRV.ServerInfo | EpicServerInfo, path: string): string | undefined {
  const parts = segmentsOf(path)
  if ("epicServer" in info) {
    const named = parts[0] === "r" ? info.repos.find((repo) => repo.name === parts[1]) : undefined
    const rest = named ? parts.slice(2) : parts
    // the engine's own files:  its routes, and under a repo's prefix its templates
    const route = Object.values(ENGINE_ROUTES).find(
      (each) => (!named || each === ENGINE_ROUTES.templates) && isUnder(rest, each.prefix)
    )
    if (route) return join(info.engine, route.dir, ...rest.slice(segmentsOf(route.prefix).length))
    // an `/_epic/` path no route serves
    if (!named && isUnder(rest, ENGINE_PREFIX)) return undefined
    const repo = named ?? info.repos.find((each) => each.isDefault)
    return repo && join(repo.content, ...rest)
  }
  if (!info.root) return undefined
  const folders = info.worktreesFolders ?? (info.worktrees ? [info.worktrees] : [])
  if (parts[0] === "worktrees" && parts[1] && folders.length) {
    const folder = folders.find((each) => existsSync(join(each, parts[1]!))) ?? folders[0]!
    return join(folder, ...parts.slice(1))
  }
  return join(info.root, ...parts)
}

/** URL path `path`'s segments, decoded:  `/epics/a%20b/x.html` => `["epics", "a b", "x.html"]`. */
function segmentsOf(path: string): string[] {
  return path.split("/").filter(Boolean).map(decodeURIComponent)
}

/** Whether URL path segments `parts` are under URL prefix `prefix`:  `["_epic", "assets", "x.js"]` under `/_epic/`. */
function isUnder(parts: string[], prefix: string): boolean {
  return segmentsOf(prefix).every((segment, at) => parts[at] === segment)
}

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
