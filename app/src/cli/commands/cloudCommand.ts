import { homedir } from "os"
import { join } from "path"

import { CLI } from "spell/cli"
import { SRV } from "spell/server"
import { MailCatcher } from "spell/server/signIn"
import environment from "spell/app/spaces/server/node/environment"
import { CLOUD_BROWSER_BUNDLE, CLOUD_PORT, SpellCloud } from "spell/app/spaces/server/node/routes/SpellCloud"

/** What `spell space cloud service` names the service it writes. */
const SERVICE_NAME = "spell.cloud"

/**
 * `spell space cloud serve | build | status | invite | mail | service` (epic `atmosphere` P8, Q8 B):
 * Spell's server for people outside this machine (`SpellCloud`),
 * the cloud a program's `... is saved in the cloud` keeps its things in.
 * - `serve [--address <url>]... [--port <n>]`:  run it, on this machine alone, until `Ctrl-C`
 * - `build`:  the browser bundle it runs on, if that's stale, with nothing started;
 *   exits 1 when the build fails (`LocalSiteServer` runs it while the old cloud keeps serving, T63)
 * - `status`:  is it running, where, and its backups;  exits 1 when it isn't, or a night was missed
 * - `invite <email>`:  an account for `email`, and its mail;  the running cloud's own invite, with its token
 * - `password <email>`:  sets someone's password on the running cloud, with its token (epic `atmosphere` T64)
 *   - asked for twice, hidden, at a terminal;  else read from standard input
 *   - NEVER an argument:  a command's arguments show in the process list and the shell's history
 * - `mail [<email>]`:  the newest mail the cloud caught, its link and code (until Q12 picks a mail service)
 * - `service --address <url>`:  the file that starts it with the machine, and again if it stops
 *   - launchd's on a Mac, systemd's on Linux
 *   - printed, for this machine's person to put in place
 * - Node only;  loads spaces' node side alone (no `loadApp()`).
 */
export async function cloudCommand(verb: string, target: string | undefined, options: CloudOptions): Promise<number> {
  if (verb === "serve") return serve(options)
  if (verb === "build") return build()
  if (verb === "status") return status()
  if (verb === "invite") return invite(target)
  if (verb === "password") return password(target)
  if (verb === "mail") return mail(target)
  console.log(serviceFile(options))
  return 0
}

/** Options of `spell space cloud`. */
export type CloudOptions = {
  /** Where people reach it, `https://spell.example.org`:  the first is its main address. */
  address?: string[]
  /** Its port on this machine. */
  port?: number
}

/** `serve`:  until `Ctrl-C`. */
async function serve({ address: addresses = [], port = CLOUD_PORT }: CloudOptions): Promise<number> {
  browserBundleCurrentOrDie()
  const [address, ...alsoAt] = addresses
  const cloud = new SpellCloud({ ...(address && { address, alsoAt }) })
  const { url } = await cloud.listen({ port })
  console.log(
    `Spell's cloud is up on ${url}${address ? `, reached at ${addresses.join(" and ")}` : " (this machine only:  no --address)"}.`
  )
  console.log(`Its programs:  ${address ?? url}/apps/@spell/examples/FamilyCookbook`)
  console.log(`Its mail, until a mail service is picked:  spell space cloud mail`)
  await SRV.untilInterrupted(cloud.server.server, () => cloud.close())
  return 0
}

/** `build`:  the browser bundle current, and nothing started.  - throws `CliError` when it doesn't build */
function build(): number {
  browserBundleCurrentOrDie()
  console.log("Spell's browser bundle is current.")
  return 0
}

/**
 * SIDE EFFECT:  build the browser bundle if it's stale, so the cloud never serves pages an old one can't run.
 * - Built when a server starts, and not after:  a merge while it runs needs a restart.
 * - throws `CliError` when the build fails, naming how to see why:  it starts on no stale bundle.
 */
export function browserBundleCurrentOrDie(bundle = new SRV.Bundle(environment.repoDir, CLOUD_BROWSER_BUNDLE)): void {
  const { stale } = bundle.check()
  if (!stale) return
  console.log(`Spell's browser bundle is out of date (${stale}):  building it first, which takes a minute or two.`)
  try {
    bundle.build()
  } catch (error) {
    throw new CLI.CliError(
      `Spell's browser bundle didn't build, so the cloud won't start on a stale one:  ${(error as Error).message}\n` +
        `To see why:  cd ${bundle.packageDir} && ${CLOUD_BROWSER_BUNDLE.run.join(" ")}`
    )
  }
}

/** `status`:  see `cloudCommand()`. */
async function status(): Promise<number> {
  const record = SpellCloud.record()
  if (!record) {
    console.log("Spell's cloud isn't running:  spell space cloud serve")
    return 1
  }
  const isUp = await fetch(`http://127.0.0.1:${record.port}/hello`, { signal: AbortSignal.timeout(2000) })
    .then((response) => response.ok)
    .catch(() => false)
  console.log(
    isUp
      ? `Spell's cloud is up on port ${record.port}${record.address ? `, reached at ${record.address}` : ""}, since ${record.started}.`
      : `Spell's cloud isn't answering on port ${record.port}:  its record is from ${record.started} (pid ${record.pid}).`
  )
  const { backupCommand } = await import("./spaceCommand")
  const backups = await backupCommand("status", undefined, {})
  return isUp ? backups : 1
}

/** `invite <email>`:  the running cloud makes the account, and sends its mail. */
async function invite(email: string | undefined): Promise<number> {
  if (!email) throw new CLI.CliError("say whose email to invite:  spell space cloud invite ana@example.com")
  const record = SpellCloud.record()
  if (!record) throw new CLI.CliError("Spell's cloud isn't running:  spell space cloud serve, then invite")
  const response = await fetch(`http://127.0.0.1:${record.port}/api/sign-in/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-server-token": record.token },
    body: JSON.stringify({ email })
  })
  const answer = (await response.json().catch(() => ({}))) as { person?: string; error?: string }
  if (!response.ok) throw new CLI.CliError(answer.error ?? `the cloud answered ${response.status}`)
  console.log(
    `Invited ${email}${answer.person ? `, as ${answer.person}` : ""}:  their mail is in spell space cloud mail.`
  )
  return 0
}

/** `password <email>`:  the running cloud sets their password:  see `cloudCommand()`. */
async function password(email: string | undefined): Promise<number> {
  if (!email) throw new CLI.CliError("say whose:  spell space cloud password ana@example.com")
  const record = SpellCloud.record()
  if (!record) throw new CLI.CliError("Spell's cloud isn't running:  spell space cloud serve, then set the password")
  const typed = process.stdin.isTTY ? await passwordTypedTwice(email) : await passwordPiped()
  const response = await fetch(`http://127.0.0.1:${record.port}/api/sign-in/password/for`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-server-token": record.token },
    body: JSON.stringify({ email, password: typed })
  })
  const answer = (await response.json().catch(() => ({}))) as { person?: string; error?: string }
  if (!response.ok) throw new CLI.CliError(answer.error ?? `the cloud answered ${response.status}`)
  console.log(`Password set for ${answer.person ?? email}.`)
  return 0
}

/** Standard input's first line:  the password, as it was piped in.  - throws `CliError` for none */
async function passwordPiped(): Promise<string> {
  let text = ""
  for await (const chunk of process.stdin) text += chunk
  const [line = ""] = text.split(/\r?\n/)
  if (!line) throw new CLI.CliError("no password on standard input")
  return line
}

/** A password typed twice at the terminal, hidden.  - throws `CliError` when the two differ */
async function passwordTypedTwice(email: string): Promise<string> {
  const first = await hiddenLine(`New password for ${email}:  `)
  const second = await hiddenLine("Again:  ")
  if (first !== second) throw new CLI.CliError("those two weren't the same:  nothing changed")
  return first
}

/** One line typed at the terminal with nothing shown.  - throws `CliError` on Ctrl-C */
function hiddenLine(prompt: string): Promise<string> {
  const { stdin, stdout } = process
  stdout.write(prompt)
  return new Promise((resolve, reject) => {
    let line = ""
    const finish = (end: () => void) => {
      stdin.removeListener("data", onData)
      stdin.setRawMode(false)
      stdin.pause()
      stdout.write("\n")
      end()
    }
    const onData = (chunk: Buffer) => {
      for (const char of chunk.toString("utf8")) {
        if (char === "\r" || char === "\n") return finish(() => resolve(line))
        if (char === "\u0003") return finish(() => reject(new CLI.CliError("canceled:  nothing changed")))
        if (char === "\u007f" || char === "\b") line = line.slice(0, -1)
        else line += char
      }
    }
    stdin.setRawMode(true)
    stdin.resume()
    stdin.on("data", onData)
  })
}

/** `mail [<email>]`:  the newest mail the cloud caught, for `email` or anyone. */
async function mail(email: string | undefined): Promise<number> {
  const catcher = new MailCatcher({ folder: join(environment.cloudDir, "mail") })
  const newest = email ? await catcher.newestTo(email) : (await catcher.caught())[0]
  if (!newest) {
    console.log(`No mail caught yet${email ? ` for ${email}` : ""}.`)
    return 1
  }
  console.log(`To:  ${newest.to}\nSubject:  ${newest.subject}\n\n${newest.text}`)
  return 0
}

/** `service`:  launchd's file on a Mac, systemd's on Linux, running `spell space cloud serve` from this checkout. */
function serviceFile({ address: addresses = [], port = CLOUD_PORT }: CloudOptions): string {
  if (!addresses.length) throw new CLI.CliError("say where people reach it:  --address https://spell.example.org")
  const spell = join(environment.repoDir, "..", "bin", "spell.mjs")
  const addressArgs = addresses.flatMap((address) => ["--address", address])
  const args = [process.execPath, spell, "space", "cloud", "serve", ...addressArgs, "--port", `${port}`]
  const logs = join(environment.cloudDir, "cloud.log")
  if (process.platform === "darwin") {
    return [
      `<!-- ${join(homedir(), "Library", "LaunchAgents", `${SERVICE_NAME}.plist`)}, then:  launchctl load -w <that file> -->`,
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">`,
      `<plist version="1.0"><dict>`,
      `  <key>Label</key><string>${SERVICE_NAME}</string>`,
      `  <key>ProgramArguments</key><array>${args.map((arg) => `<string>${arg}</string>`).join("")}</array>`,
      `  <key>RunAtLoad</key><true/>`,
      `  <key>KeepAlive</key><true/>`,
      `  <key>StandardOutPath</key><string>${logs}</string>`,
      `  <key>StandardErrorPath</key><string>${logs}</string>`,
      `</dict></plist>`
    ].join("\n")
  }
  return [
    `# ~/.config/systemd/user/${SERVICE_NAME}.service, then:  systemctl --user enable --now ${SERVICE_NAME}`,
    `[Unit]`,
    `Description=Spell's cloud`,
    `After=network-online.target`,
    ``,
    `[Service]`,
    `ExecStart=${args.join(" ")}`,
    `Restart=always`,
    ``,
    `[Install]`,
    `WantedBy=default.target`
  ].join("\n")
}
