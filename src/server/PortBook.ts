import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { basename, dirname, join, resolve } from "node:path"

import { FileLock } from "./FileLock"
import { isFree } from "./ports"

/****************
 * ### `PortBook`
 * The port each worktree's servers keep, written down once, so a worktree's address stays the same from one start to
 * the next (epic `epic-engine` P82):  a link to its page server still works after a restart.
 * - One file per machine, `~/.spell/server-ports.json` (`SPELL_PORTS_FILE` names another:  the tests'),
 *   `{ "<checkout>#<server>": port }`
 * - `portFor()`:  the port written down, else the first free one from `FIRST_PORT` that no other entry holds,
 *   written down at once, under the file's `FileLock`
 * - A port written down that something ELSE holds now:  still that one;  the server's own start says it's taken.
 *   Only `forget()` frees it (a worktree removed).
 * - Why not any free port, as before:  a worktree's server took a new port at each restart, and every open link to it
 *   broke (T147)
 * - NOT the main checkout's:  its page server is 4747 only, its editor 3000
 ****************/
export class PortBook {
  /** the book's file */
  readonly file: string

  /** - `file`:  default `SPELL_PORTS_FILE`, else `~/.spell/server-ports.json` */
  constructor(file = process.env[PORTS_FILE_VARIABLE] ?? join(homedir(), ".spell", "server-ports.json")) {
    this.file = resolve(file)
  }

  /**
   * The port server `server` of checkout `checkout` keeps:  the one written down, else a new one, written down now.
   * - a new one:  the first from `FIRST_PORT` that no entry holds and nothing listens on
   * - SIDE EFFECT:  writes the book, under its lock
   */
  async portFor(checkout: string, server = "page server"): Promise<number> {
    const key = keyOf(checkout, server)
    const known = this.read()[key]
    if (known) return known
    // pick outside the lock (the free check is async), then write it down in it;  a race picks again
    for (let tries = 0; tries < PICK_TRIES; tries++) {
      const taken = new Set(Object.values(this.read()))
      let port = FIRST_PORT
      while (taken.has(port) || !(await isFree(port))) port++
      const kept = FileLock.run(`${this.file}.lock`, () => {
        const ports = this.read()
        if (ports[key]) return ports[key]
        if (Object.values(ports).includes(port)) return undefined
        this.write({ ...ports, [key]: port })
        return port
      })
      if (kept) return kept
    }
    throw new Error(`PortBook.portFor():  no free port from ${FIRST_PORT} for ${key};  see ${this.file}`)
  }

  /** The ports written down for `checkout`, by server name;  none:  `{}`. */
  portsOf(checkout: string): Record<string, number> {
    const prefix = `${resolve(checkout)}#`
    return Object.fromEntries(
      Object.entries(this.read())
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, port]) => [key.slice(prefix.length), port])
    )
  }

  /**
   * The HOST NAMES of every checkout in the book, two each:  `editor.localhost` (its page server) and
   * `editor--app.localhost` (its editor), as main's page server reaches a worktree by name (`HostRoutes`, epic
   * `editor` P49);  what the page server's certificate lists beside `localhost` (`LocalCertificate.forPageServer()`)
   */
  hostNames(): string[] {
    const checkouts = new Set(Object.keys(this.read()).map((key) => key.slice(0, key.lastIndexOf("#"))))
    return [...checkouts].flatMap((checkout) => {
      const name = hostNameOf(basename(checkout))
      return name ? [`${name}${LOCALHOST}`, `${name}${EDITOR_SUFFIX}${LOCALHOST}`] : []
    })
  }

  /** Forget every port of `checkout`:  a worktree removed.  SIDE EFFECT:  writes the book. */
  forget(checkout: string): void {
    if (!existsSync(this.file)) return
    const prefix = `${resolve(checkout)}#`
    FileLock.run(`${this.file}.lock`, () =>
      this.write(Object.fromEntries(Object.entries(this.read()).filter(([key]) => !key.startsWith(prefix))))
    )
  }

  /** the book;  missing or unreadable:  `{}` */
  read(): Record<string, number> {
    try {
      return JSON.parse(readFileSync(this.file, "utf8")) as Record<string, number>
    } catch {
      return {}
    }
  }

  /** SIDE EFFECT:  writes `ports` */
  private write(ports: Record<string, number>): void {
    mkdirSync(dirname(this.file), { recursive: true })
    writeFileSync(this.file, `${JSON.stringify(ports, null, 2)}\n`)
  }
}

/** A worktree's name as a host's first part:  lower case, letters, digits and dashes (`My_Work` => `my-work`). */
export function hostNameOf(worktree: string): string {
  return worktree
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** What follows a worktree's name for its editor's host:  `editor--app.localhost`. */
export const EDITOR_SUFFIX = "--app"

/** What every worktree's host name ends in. */
const LOCALHOST = ".localhost"

/** The variable naming another book (the tests'). */
export const PORTS_FILE_VARIABLE = "SPELL_PORTS_FILE"

/** The first port a worktree's server is given:  above the main checkout's (4747), the epic hub's (4848). */
const FIRST_PORT = 4900

/** How many times `portFor()` picks again when another process wrote the same port first. */
const PICK_TRIES = 5

/** A book key:  `<checkout>#<server>`. */
function keyOf(checkout: string, server: string): string {
  return `${resolve(checkout)}#${server}`
}
