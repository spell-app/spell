/**
 * `spell server <command>` (the kit's `spell`, which runs this) and `yarn server <command>`:  the kit's page server.
 * - `local [--port N]` -- run it in the foreground, until `Ctrl-C`
 *   - `serve`:  the same, hidden:  what a background server runs (`PageServer.ensure()`), which `prune` finds by it
 * - `start` -- start it in the background if it isn't running;
 *   prints JSON `{ base, port, pid, root, launched }`
 *   - `start all`:  every web server of the checkout, the kit's `spell server start all` (not this file's)
 *   - `ensure`:  the same, hidden:  the old name, which spell-epic's `epic server ensure` still hands on
 * - `stop` -- stop it
 * - `status` -- JSON, or exit 1 when not running
 * - `url <file>` -- `start`, then print the URL that serves `file`
 *   - a worktree's file:  on the MAIN checkout's server (`/worktrees/<w>/...`),
 *     when that one runs and serves worktrees (`SRV.mainServerUrl()`)
 *   - a file of the epic folder:  its path there (`/epics/...`), on the main checkout's server if it runs,
 *     else this checkout's (`SRV.contentPathOf()`)
 * - `certificate [--check] [--undo]` -- the certificate that gives the page server HTTPS and HTTP/2 (epic `solid-2-final`
 *   P14):  made by mkcert, and trusted by this computer, asking for the password once in the terminal
 *   (`SRV.LocalCertificate`);  a running server takes it at its next start, which the server keeper makes at once for
 *   main's (it watches the certificate's files);  the Servers tab turns it on and off too (epic `epic-engine` T164)
 *   - `--check`:  only says what's missing;  exit 1 until it's ready
 *   - `--undo`:  its files go;  the next start is plain HTTP only
 *   - without it, every server speaks plain HTTP, as before;  with it, plain HTTP stays on the same port, for the tools
 * - `prune [--dry-run]` -- stop the page and vite servers whose checkout is gone (`pruneServers()`), on any checkout;
 *   `--dry-run` only says which
 * - What can't be done (`SRV.HttpError`:  a start that failed, a port held) is one line and exit 1:
 *   callers show the last line, which was node's version under a stack (epic `epic-engine` I362)
 * - `--root <dir>`:  the kit (default:  the kit holding the folder `yarn` ran in, `INIT_CWD`, from any folder of it,
 *   `pageServerRoot()`);  the page server starts from the kit's root ONLY:  any other folder is an error, naming the
 *   kit (`kitRootOf()`, epic `repo-split` P16)
 * - `--spaces <dir>`:  where people's and orgs' spaces are kept (default:  spell.spaces, in the kit):
 *   it sets `SPELL_SPACES_DIR`, which spaces' route modules read, and a background server inherits
 *   (epic `people-and-orgs` P8)
 * - Its log (`SRV.ServerLog`):  where it listens, builds and failures;  `SPELL_DEBUG=server` shows the rest
 * - Runs under `tsx` with the kit's node settings (`tsconfig.node.json`).
 *   A background server is started the same way (`TSX_TSCONFIG_PATH`), whatever folder it's started from.
 */
import { relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

import { SRV } from "spell/server"
import {
  DEFAULT_PORT,
  PageServer,
  componentSetAddressOf,
  kitRootOf,
  pageServerRoot,
  pruneReport,
  pruneServers
} from "spell/server/page"

/** What `spell server certificate` says, for each state and step. */
const CERTIFICATE_WORDS = {
  ready:
    "Ready.  Your computer trusts the certificate, so browsers open your pages over a secure (HTTPS) link.\n" +
    "Each server that shows your pages uses it from its next start:  https://localhost:4747",
  "no-mkcert": SRV.INSTALL_MKCERT,
  missing:
    "There's no certificate yet.  A certificate lets your browser open your pages over a secure (HTTPS) link.\n" +
    "To make one, type this in a terminal:  spell server certificate",
  uncovered: "The certificate is out of date.  To make a new one, type this in a terminal:  spell server certificate",
  expired: "The certificate is out of date.  To make a new one, type this in a terminal:  spell server certificate",
  untrusted:
    "The certificate is made, but your computer doesn't trust it yet, so browsers would warn you.\n" +
    "To fix that, type this in a terminal:  spell server certificate",
  needsTerminal:
    "The certificate is made.  To trust it, your computer asks for your password.\n" +
    "To finish, type this in a terminal:  spell server certificate",
  asking:
    "Your computer will now ask for the password you use to log in to it.\n" +
    "Type it in to continue.  It asks only once.",
  done:
    "Done.  Your computer now trusts the certificate for the server that shows your pages.\n" +
    "Your pages reload by themselves in a few seconds, over the secure link.\n" +
    "If they haven't after a minute, type  spell server stop  in this terminal, then  spell server start.\n" +
    "Then open your pages at https://localhost:4747.\n" +
    "Other spell commands still use http://127.0.0.1:4747.  You don't need to change anything.\n" +
    "If you use Firefox, it needs one more step.  Run  brew install nss,  then run  spell server certificate  again.",
  undone:
    "Done.  The secure link is turned off.\n" +
    "Your pages will open with a plain link (HTTP) again, not a secure one (HTTPS).\n" +
    "They reload by themselves in a few seconds.\n" +
    "If they haven't after a minute, type  spell server stop  in this terminal, then  spell server start."
} as const

try {
  await main(process.argv.slice(2))
} catch (error) {
  if (!(error instanceof SRV.HttpError)) throw error
  console.error(error.message)
  process.exitCode = 1
}

/** Run `args`. */
async function main(args: string[]): Promise<void> {
  const [command = "help", ...rest] = args
  const given = resolve(flag(rest, "--root") ?? pageServerRoot(process.env.INIT_CWD ?? process.cwd()))
  // the kit's root ONLY (epic `repo-split` P16):  `prune` works on any checkout's servers
  let root = given
  try {
    if (command !== "prune") root = kitRootOf(given)
  } catch (error) {
    console.error((error as Error).message)
    process.exitCode = 2
    return
  }
  const port = Number(flag(rest, "--port") ?? DEFAULT_PORT)
  const spaces = flag(rest, "--spaces")
  if (spaces) process.env.SPELL_SPACES_DIR = resolve(spaces)
  // the record of the spaces it serves (`--spaces`, above):  a project's is its own
  const pidFile = SRV.PidFile.forPageServer(root)

  switch (command) {
    case "local":
    case "serve": {
      // a kit's server runs ITS code (epic `epic-engine` I287):  another kit's Router over its route modules answered
      // every `/api` with a 500
      const foreign = PageServer.foreignCodeFor(root)
      if (foreign) {
        console.error(
          `page server:  ${root} has its own page server code, ${foreign};  this is ${fileURLToPath(import.meta.url)}.\n` +
            `Start it from that kit:  node ${root}/bin/spell.mjs server start`
        )
        process.exitCode = 2
        return
      }
      const https = PageServer.certificateFor()
      const server = await new PageServer({ root, certificate: https.tls }).start({ port })
      // a group of its own, so each start stands out in the log
      server.log.gap()
      server.log.info(`${server.web.url}/  (root ${root})`)
      if (server.web.secureUrl) server.log.info(`${server.web.secureUrl}/  (HTTPS and HTTP/2, for browsers)`)
      else if (https.why) server.log.info(https.why)
      server.log.gap()
      await SRV.untilInterrupted(server.web.server, () => server.stop())
      return
    }
    case "start":
    // hidden:  the old name, which spell-epic's `epic server ensure` still hands on (its verbs' renames wait)
    case "ensure":
      return print(await PageServer.ensure(root, port))
    case "stop":
      return console.log((await PageServer.stop(root, { port })) ? "stopped" : "not running")
    case "status": {
      const running = await pidFile.status()
      if (!running) {
        console.log("not running")
        process.exitCode = 1
        return
      }
      return print(running)
    }
    case "url": {
      const file = rest.find((arg) => !arg.startsWith("--") && arg !== flag(rest, "--root"))
      if (!file) throw new Error("usage:  spell server url <file>")
      const absolute = resolve(process.env.INIT_CWD ?? process.cwd(), file)
      // a worktree's file:  the MAIN checkout's server, when it serves worktrees, so every link is on one port
      // for people:  the server's HTTPS address once it has one;  the tools fetch the plain one
      const main = await SRV.mainServerUrl(absolute, root)
      if (main) return console.log(forPeople(main, await SRV.serverAt(new URL(main).origin)))
      const running = await PageServer.ensure(root, port)
      const path = relative(root, absolute)
      const served =
        SRV.contentPathOf(absolute, running) ??
        componentSetAddressOf(root, absolute) ??
        `/${path.split(sep).map(encodeURIComponent).join("/")}`
      return console.log(forPeople(`${running.base}${served}`, running))
    }
    case "certificate":
      process.exitCode = certificate(rest)
      return
    case "prune": {
      const dryRun = rest.includes("--dry-run")
      return console.log(pruneReport(pruneServers({ dryRun }), { dryRun }))
    }
    default:
      console.log(
        `usage:  spell server local|start|stop|status|url <file>|certificate [--check] [--undo]|prune [--dry-run]  [--root <dir>] [--port <n>] [--spaces <dir>]`
      )
  }
}

/**
 * `spell server certificate [--check] [--undo]`:  make and trust the page server's certificate;  its exit code.
 * - trusting it asks for this computer's password, so only in a terminal:  elsewhere it says to run it in one
 */
function certificate(args: string[]): number {
  const local = SRV.LocalCertificate.forPageServer()
  try {
    if (args.includes("--undo")) {
      local.undo()
      console.log(CERTIFICATE_WORDS.undone)
      return 0
    }
    if (args.includes("--check")) {
      console.log(CERTIFICATE_WORDS[local.state])
      return local.state === "ready" ? 0 : 1
    }
    if (local.state === "no-mkcert") {
      console.log(SRV.INSTALL_MKCERT)
      return 1
    }
    if (local.makeIfNeeded() === "untrusted") {
      if (!process.stdin.isTTY) {
        console.log(CERTIFICATE_WORDS.needsTerminal)
        return 1
      }
      console.log(CERTIFICATE_WORDS.asking)
      local.trust()
    }
    const ready = local.state === "ready"
    console.log(ready ? CERTIFICATE_WORDS.done : CERTIFICATE_WORDS[local.state])
    return ready ? 0 : 1
  } catch (error) {
    if (!(error instanceof SRV.CertificateError)) throw error
    console.error(error.message)
    return 1
  }
}

/** `url`, at `server`'s HTTPS address when it has one:  the address people open. */
function forPeople(url: string, server: { https?: string } | undefined): string {
  if (!server?.https) return url
  const plain = new URL(url)
  const secure = new URL(server.https)
  plain.protocol = secure.protocol
  plain.host = secure.host
  return plain.href
}

/** Value after `name` in `args`. */
function flag(args: string[], name: string): string | undefined {
  const at = args.indexOf(name)
  return at < 0 ? undefined : args[at + 1]
}

/** Print `value` as indented JSON. */
function print(value: unknown): void {
  console.log(JSON.stringify(value, null, 2))
}
