import { homedir } from "os"
import { join } from "path"

import { CLI } from "spell/cli"
import { SRV } from "spell/server"
import { MailCatcher } from "spell/server/signIn"
import environment from "spell/app/spaces/server/node/environment"
import { CLOUD_PORT, SpellCloud } from "spell/app/spaces/server/node/routes/SpellCloud"

/** What `spell app cloud service` names the service it writes. */
const SERVICE_NAME = "spell.cloud"

/**
 * `spell app cloud serve | status | invite | mail | service` (epic `atmosphere` P8, Q8 B):  Spell's server for people
 * outside this machine, the cloud a program's `... is saved in the cloud` keeps its things in (`SpellCloud`).
 * - `serve [--address <url>] [--port <n>]`:  run it, on this machine alone, until `Ctrl-C`
 * - `status`:  is it running, where, and its backups;  exits 1 when it isn't, or a night was missed
 * - `invite <email>`:  an account for `email`, and its mail;  the running cloud's own invite, with its token
 * - `mail [<email>]`:  the newest mail the cloud caught, its link and code (until Q12 picks a mail service)
 * - `service --address <url>`:  the file that starts it with the machine and again if it stops:  launchd's on a Mac,
 *   systemd's on Linux;  printed, for this machine's person to put in place
 * - Node only;  loads spaces' node side alone (no `loadApp()`).
 */
export async function cloudCommand(verb: string, target: string | undefined, options: CloudOptions): Promise<number> {
  if (verb === "serve") return serve(options)
  if (verb === "status") return status()
  if (verb === "invite") return invite(target)
  if (verb === "mail") return mail(target)
  console.log(serviceFile(options))
  return 0
}

/** Options of `spell app cloud`. */
export type CloudOptions = {
  /** Where people reach it, `https://spell.example.org`. */
  address?: string
  /** Its port on this machine. */
  port?: number
}

/** `serve`:  until `Ctrl-C`. */
async function serve({ address, port = CLOUD_PORT }: CloudOptions): Promise<number> {
  const cloud = new SpellCloud({ ...(address && { address }) })
  const { url } = await cloud.listen({ port })
  console.log(
    `Spell's cloud is up on ${url}${address ? `, reached at ${address}` : " (this machine only:  no --address)"}.`
  )
  console.log(`Its programs:  ${address ?? url}/apps/@spell/examples/FamilyCookbook`)
  console.log(`Its mail, until a mail service is picked:  spell app cloud mail`)
  await SRV.untilInterrupted(cloud.server.server, () => cloud.close())
  return 0
}

/** `status`:  see `cloudCommand()`. */
async function status(): Promise<number> {
  const record = SpellCloud.record()
  if (!record) {
    console.log("Spell's cloud isn't running:  spell app cloud serve")
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
  if (!email) throw new CLI.CliError("say whose email to invite:  spell app cloud invite ana@example.com")
  const record = SpellCloud.record()
  if (!record) throw new CLI.CliError("Spell's cloud isn't running:  spell app cloud serve, then invite")
  const response = await fetch(`http://127.0.0.1:${record.port}/api/sign-in/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-server-token": record.token },
    body: JSON.stringify({ email })
  })
  const answer = (await response.json().catch(() => ({}))) as { person?: string; error?: string }
  if (!response.ok) throw new CLI.CliError(answer.error ?? `the cloud answered ${response.status}`)
  console.log(
    `Invited ${email}${answer.person ? `, as ${answer.person}` : ""}:  their mail is in spell app cloud mail.`
  )
  return 0
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

/** `service`:  launchd's file on a Mac, systemd's on Linux, running `spell app cloud serve` from this checkout. */
function serviceFile({ address, port = CLOUD_PORT }: CloudOptions): string {
  if (!address) throw new CLI.CliError("say where people reach it:  --address https://spell.example.org")
  const spell = join(environment.repoDir, "..", "bin", "spell.mjs")
  const args = [process.execPath, spell, "app", "cloud", "serve", "--address", address, "--port", `${port}`]
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
