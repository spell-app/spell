/**
 * `spell space local` (epic `atmosphere` T57):  its steps, through a stand-in for every outside program.
 * - NEVER runs a real sudo, postfix, sendmail, mkcert or caddy, and never touches the real hosts file.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { CLI } from "spell/cli"
import {
  LocalSite,
  caddyFileFor,
  hostsWith,
  lanAddressOf,
  partnerScript,
  type LocalChild,
  type LocalTools
} from "spell/app/cli/commands/localCommand"

const NAMES = ["test.spell.app", "test.spell.space"]
const PASSWORD = "abcd efgh ijkl mnop"
const SQUEEZED_PASSWORD = "abcdefghijklmnop"

/** A program a test started:  `end()` makes it stop by itself. */
function childProgram() {
  let end = (_code: number) => {}
  const exited = new Promise<number>((resolve) => (end = resolve))
  const child: LocalChild & { end: (code: number) => void } = {
    exited,
    end: (code) => end(code),
    stop: vi.fn(() => end(0))
  }
  return child
}

/** What each test runs in:  its own folders, and tools that only write down what they're asked. */
function setUp({ installed = ["mkcert", "caddy"], trusted = false, relay = "", passwordKept = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "spell-local-"))
  const caRoot = join(root, "ca")
  mkdirSync(caRoot)
  writeFileSync(join(caRoot, "rootCA.pem"), "public root")
  writeFileSync(join(caRoot, "rootCA-key.pem"), "SECRET KEY")
  const hostsFile = join(root, "hosts")
  writeFileSync(hostsFile, "127.0.0.1 localhost\n")
  const spacesDir = join(root, "spaces")
  mkdirSync(join(spacesDir, "@spell", "OrgAdmin"), { recursive: true })
  writeFileSync(join(spacesDir, "@spell", "OrgAdmin", "__project.json5"), "{}")

  const runs: { command: string; args: string[]; input?: string }[] = []
  const opened: string[] = []
  const stopped: number[] = []
  const posts: { url: string; headers: Record<string, string>; body: string }[] = []
  const children: {
    command: string
    args: string[]
    env?: Record<string, string>
    child: ReturnType<typeof childProgram>
  }[] = []
  const listeners: Record<string, string[]> = {}
  const mails: (string | undefined)[] = []

  const tools: LocalTools = {
    has: (command) => installed.includes(command),
    output: (command, args) => {
      if (command === "mkcert") return `${caRoot}\n`
      if (command === "postconf") return `${relay}\n`
      if (command === "lsof") return (listeners[args[0]!] ?? []).join("\n")
      if (command === "ps") return args.at(-1) === "443" ? "/opt/homebrew/bin/caddy\n" : "other\n"
      return ""
    },
    succeeds: (command, args) => {
      if (command === "security") return trusted
      if (args[0] === "test") return passwordKept
      return false
    },
    run: (command, args, { input } = {}) => {
      runs.push({ command, args, ...(input !== undefined && { input }) })
      if (command === "mkcert") {
        writeFileSync(args[1]!, "certificate")
        writeFileSync(args[3]!, "key")
      }
      if (command === "sudo" && args[0] === "tee" && args[1] === hostsFile) writeFileSync(hostsFile, input!)
    },
    start: (command, args, options) => {
      const child = childProgram()
      children.push({ command, args, ...(options.env && { env: options.env }), child })
      return child
    },
    stop: (pid) => void stopped.push(pid),
    sleep: () => Promise.resolve(),
    open: (url) => void opened.push(url),
    lanAddress: () => "192.168.4.30",
    askSecret: () => Promise.resolve(PASSWORD),
    askLine: () => Promise.resolve(""),
    cloud: () => ({ port: 4949, address: "https://test.spell.app" }),
    newestMailTo: () => Promise.resolve(mails.shift()),
    post: (url, { headers, body }) => {
      posts.push({ url, headers, body })
      return Promise.resolve({ status: 200, text: "{}" })
    }
  }
  const site = new LocalSite({
    tools,
    folder: join(root, "local-site"),
    oldFolder: join(root, "house-site"),
    hostsFile,
    spacesDir,
    machineEmail: () => Promise.resolve("owen@example.com"),
    platform: "darwin"
  })
  const sudoRuns = () => runs.filter((each) => each.command === "sudo")
  return {
    root,
    caRoot,
    hostsFile,
    spacesDir,
    site,
    tools,
    runs,
    sudoRuns,
    opened,
    stopped,
    posts,
    children,
    listeners,
    mails
  }
}

/** Stops the site `start` started, as a `Ctrl-C` does, once it has started both programs. */
async function startAndStop(world: ReturnType<typeof setUp>, options = {}) {
  const started = world.site.start(options)
  await vi.waitFor(() => expect(world.children).toHaveLength(2))
  process.emit("SIGINT")
  return started
}

describe("spell space local", () => {
  let world: ReturnType<typeof setUp>

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    rmSync(world.root, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  describe("setup", () => {
    test("makes the certificate for its names, trusts the root, and adds the names", async () => {
      world = setUp()
      expect(await world.site.setup({})).toBe(0)
      const folder = join(world.root, "local-site")
      expect(world.runs[0]).toEqual({
        command: "mkcert",
        args: ["-cert-file", join(folder, "site.pem"), "-key-file", join(folder, "site-key.pem"), ...NAMES]
      })
      expect(world.sudoRuns()[0]!.args).toEqual([
        "security",
        "add-trusted-cert",
        "-d",
        "-r",
        "trustRoot",
        "-k",
        "/Library/Keychains/System.keychain",
        join(world.caRoot, "rootCA.pem")
      ])
      expect(readFileSync(world.hostsFile, "utf8")).toBe(
        "127.0.0.1 localhost\n127.0.0.1 test.spell.app test.spell.space # spell space local\n"
      )
      expect(world.sudoRuns().at(-2)!.args).toEqual(["dscacheutil", "-flushcache"])
      expect(world.sudoRuns().at(-1)!.args).toEqual(["killall", "-HUP", "mDNSResponder"])
    })

    test("a second run asks for nothing", async () => {
      world = setUp({ trusted: true })
      await world.site.setup({})
      const before = world.runs.length
      await world.site.setup({})
      expect(world.runs).toHaveLength(before)
    })

    test("the folder for another Mac has the root certificate and its script, NEVER the key", async () => {
      world = setUp()
      await world.site.setup({})
      const partner = join(world.root, "local-site", "for-partner")
      expect(readdirSync(partner).sort()).toEqual(["rootCA.pem", "trust-this-mac.sh"])
      expect(readFileSync(join(partner, "rootCA.pem"), "utf8")).toBe("public root")
      expect(readFileSync(join(partner, "trust-this-mac.sh"), "utf8")).toContain(
        'echo "192.168.4.30 test.spell.app test.spell.space"'
      )
    })

    test("--undo takes the names away, and only them", async () => {
      world = setUp({ trusted: true })
      await world.site.setup({})
      expect(await world.site.setup({ undo: true })).toBe(0)
      expect(readFileSync(world.hostsFile, "utf8")).toBe("127.0.0.1 localhost\n")
    })

    test("takes over the old scripts' certificate, leaving their folder as it was", async () => {
      world = setUp({ trusted: true })
      const old = join(world.root, "house-site")
      mkdirSync(old)
      writeFileSync(join(old, "test.spell.app+1.pem"), "old certificate")
      writeFileSync(join(old, "test.spell.app+1-key.pem"), "old key")
      await world.site.setup({})
      expect(world.runs.some((each) => each.command === "mkcert")).toBe(false)
      expect(readFileSync(join(world.root, "local-site", "site.pem"), "utf8")).toBe("old certificate")
      expect(existsSync(join(old, "test.spell.app+1.pem"))).toBe(true)
    })

    test("says exactly what to install", async () => {
      world = setUp({ installed: ["caddy"] })
      await expect(world.site.setup({})).rejects.toThrow("brew install mkcert")
      expect(world.runs).toEqual([])
    })

    test("is for a Mac", async () => {
      world = setUp()
      const elsewhere = new LocalSite({ tools: world.tools, folder: join(world.root, "x"), platform: "linux" })
      await expect(elsewhere.setup({})).rejects.toThrow(CLI.CliError)
    })
  })

  describe("start", () => {
    test("before setup:  says to run it", async () => {
      world = setUp()
      await expect(world.site.start({})).rejects.toThrow("spell space local setup")
    })

    test("runs the cloud at both addresses, and Caddy with the file it wrote", async () => {
      world = setUp({ trusted: true })
      await world.site.setup({})
      expect(await startAndStop(world)).toBe(0)
      expect(world.children[0]!.args.slice(1)).toEqual([
        "space",
        "cloud",
        "serve",
        "--address",
        "https://test.spell.app",
        "--address",
        "https://test.spell.space"
      ])
      expect(world.children[1]!.command).toBe("caddy")
      expect(world.children[1]!.args).toEqual(["run", "--config", join(world.root, "local-site", "Caddyfile")])
    })

    test("stops a cloud already running, and only a Caddy on the HTTPS port", async () => {
      world = setUp({ trusted: true })
      await world.site.setup({})
      world.listeners["-tiTCP:4949"] = ["111"]
      world.listeners["-tiTCP:443"] = ["443"]
      await startAndStop(world)
      expect(world.stopped).toEqual([111, 443])
    })

    test("leaves something else on the HTTPS port alone", async () => {
      world = setUp({ trusted: true })
      await world.site.setup({})
      world.listeners["-tiTCP:443"] = ["999"]
      await startAndStop(world)
      expect(world.stopped).toEqual([])
    })

    test("mail stays caught until postfix relays", async () => {
      world = setUp({ trusted: true })
      await world.site.setup({})
      await startAndStop(world)
      expect(world.children[0]!.env).toEqual({})
    })

    test("uses real mail by itself once postfix relays", async () => {
      world = setUp({ trusted: true, relay: "[smtp.gmail.com]:587" })
      await world.site.setup({})
      await startAndStop(world)
      expect(world.children[0]!.env).toEqual({ SPELL_MAIL: "sendmail", SPELL_MAIL_FROM: "owen@example.com" })
    })

    test("one program stopping by itself stops the other, and says so", async () => {
      world = setUp({ trusted: true })
      await world.site.setup({})
      const started = world.site.start({})
      await vi.waitFor(() => expect(world.children).toHaveLength(2))
      world.children[1]!.child.end(1)
      expect(await started).toBe(1)
      expect(world.children[0]!.child.stop).toHaveBeenCalled()
    })

    test("refuses an address setup didn't make", async () => {
      world = setUp({ trusted: true })
      await world.site.setup({})
      await expect(world.site.start({ address: ["https://other.example"] })).rejects.toThrow(
        "spell space local setup --address https://other.example"
      )
    })

    describe("the bare address", () => {
      const caddyFile = () => readFileSync(join(world.root, "local-site", "Caddyfile"), "utf8")

      test("--home sets it, and it's remembered", async () => {
        world = setUp({ trusted: true })
        await world.site.setup({})
        await startAndStop(world, { home: "/apps/@rs/Home" })
        expect(caddyFile()).toContain("redir / /apps/@rs/Home\n")
        world.children.length = 0
        await startAndStop(world)
        expect(caddyFile()).toContain("redir / /apps/@rs/Home\n")
      })

      test("none set:  the Admin page of the first org here but Spell's", async () => {
        world = setUp({ trusted: true })
        for (const org of ["@zed", "@willzalone"]) {
          mkdirSync(join(world.spacesDir, org, "OrgAdmin"), { recursive: true })
          writeFileSync(join(world.spacesDir, org, "OrgAdmin", "__project.json5"), "{}")
        }
        await world.site.setup({})
        await startAndStop(world)
        expect(caddyFile()).toContain("redir / /apps/@willzalone/OrgAdmin\n")
      })

      test("none set, no org:  no redirect", async () => {
        world = setUp({ trusted: true })
        await world.site.setup({})
        await startAndStop(world)
        expect(caddyFile()).not.toContain("redir")
      })

      test("a home that isn't a path is refused", async () => {
        world = setUp({ trusted: true })
        await world.site.setup({})
        await expect(world.site.start({ home: 'x" { evil' })).rejects.toThrow("--home takes a page's path")
      })
    })
  })

  describe("mail", () => {
    test("the password goes to standard input, NEVER into arguments", async () => {
      world = setUp()
      expect(await world.site.mail({ gmail: "me@gmail.com" })).toBe(0)
      const tee = world.runs.find((each) => each.args[0] === "tee")!
      expect(tee.input).toBe(`[smtp.gmail.com]:587 me@gmail.com:${SQUEEZED_PASSWORD}\n`)
      for (const { args } of world.runs) {
        expect(args.join(" ")).not.toContain(SQUEEZED_PASSWORD)
        expect(args.join(" ")).not.toContain(PASSWORD)
      }
    })

    test("makes the password's file root-only before anything goes in it", async () => {
      world = setUp()
      await world.site.mail({})
      const steps = world.sudoRuns().map((each) => each.args[0])
      expect(steps.indexOf("chmod")).toBeLessThan(steps.indexOf("tee"))
      expect(world.sudoRuns().find((each) => each.args[0] === "chmod")!.args).toEqual([
        "chmod",
        "600",
        "/etc/postfix/sasl_passwd"
      ])
    })

    test("with a password kept:  doesn't ask, and starts postfix and sends the test mail", async () => {
      world = setUp({ passwordKept: true })
      const askSecret = vi.spyOn(world.tools, "askSecret")
      await world.site.mail({ gmail: "me@gmail.com" })
      expect(askSecret).not.toHaveBeenCalled()
      expect(world.sudoRuns().some((each) => each.args.join(" ") === "postfix start")).toBe(true)
      const sendmail = world.runs.find((each) => each.command === "/usr/sbin/sendmail")!
      expect(sendmail.args).toEqual(["-t", "-i"])
      expect(sendmail.input).toContain("To: me@gmail.com")
    })

    test("--new-password asks again", async () => {
      world = setUp({ passwordKept: true })
      await world.site.mail({ newPassword: true })
      expect(world.runs.some((each) => each.args[0] === "tee")).toBe(true)
    })

    test("start then sends as the address it was set up with", async () => {
      world = setUp({ trusted: true, relay: "[smtp.gmail.com]:587" })
      await world.site.setup({})
      await world.site.mail({ gmail: "me@gmail.com" })
      await startAndStop(world)
      expect(world.children[0]!.env?.SPELL_MAIL_FROM).toBe("me@gmail.com")
    })
  })

  describe("sign-in", () => {
    const LINK = "https://test.spell.app/sign-in/confirm?key=abc"

    test("asks the cloud as its address, opens the new link, then the page", async () => {
      world = setUp()
      world.mails.push("an old mail", `Open this:\n${LINK}\n`)
      expect(await world.site.signIn("ana@example.com", "@rs/OrgAdmin")).toBe(0)
      expect(world.posts[0]).toEqual({
        url: "http://127.0.0.1:4949/api/sign-in/ask",
        headers: { host: "test.spell.app", origin: "https://test.spell.app", "content-type": "application/json" },
        body: '{"email":"ana@example.com"}'
      })
      expect(world.opened).toEqual([LINK, "https://test.spell.app/apps/@rs/OrgAdmin"])
    })

    test("with nothing named:  this machine's person, and the last page", async () => {
      world = setUp()
      world.mails.push(undefined, LINK)
      await world.site.signIn(undefined, "/apps/@rs/Inbox")
      world.opened.length = 0
      world.mails.push(undefined, LINK)
      await world.site.signIn(undefined, undefined)
      expect(world.posts[1]!.body).toBe('{"email":"owen@example.com"}')
      expect(world.opened.at(-1)).toBe("https://test.spell.app/apps/@rs/Inbox")
    })

    test("with no cloud running:  says how to start it", async () => {
      world = setUp()
      world.tools.cloud = () => undefined
      await expect(world.site.signIn(undefined, undefined)).rejects.toThrow("spell space local start")
    })

    test("a mail that never comes is said, not waited for forever", async () => {
      world = setUp()
      await expect(world.site.signIn("ana@example.com", undefined)).rejects.toThrow("No sign-in mail came")
    })
  })

  describe("hostsWith()", () => {
    test("replaces the old scripts' line", () => {
      world = setUp()
      expect(hostsWith("127.0.0.1 localhost\n192.168.4.30 test.spell.app test.spell.space\n", NAMES, "127.0.0.1")).toBe(
        "127.0.0.1 localhost\n127.0.0.1 test.spell.app test.spell.space # spell space local\n"
      )
    })

    test("gives back the same text when there's nothing to change", () => {
      world = setUp()
      const hosts = "127.0.0.1 localhost\n127.0.0.1 test.spell.app test.spell.space # spell space local\n"
      expect(hostsWith(hosts, NAMES, "127.0.0.1")).toBe(hosts)
      expect(hostsWith("127.0.0.1 localhost\n", NAMES, undefined)).toBe("127.0.0.1 localhost\n")
    })

    test("leaves comments, and lines naming anything else, alone", () => {
      world = setUp()
      const hosts = "# test.spell.app test.spell.space\n1.2.3.4 test.spell.app other.example\n"
      expect(hostsWith(hosts, NAMES, undefined)).toBe(hosts)
    })
  })

  test("caddyFileFor():  no redirect without a home page", () => {
    world = setUp()
    const file = caddyFileFor({ names: NAMES, certificate: "/c.pem", key: "/k.pem", homePage: undefined })
    expect(file).toContain(
      `test.spell.app, test.spell.space {\n\ttls "/c.pem" "/k.pem"\n\treverse_proxy 127.0.0.1:4949\n}`
    )
  })

  test("lanAddressOf():  Wi-Fi or wired before a VPN, and never loopback", () => {
    world = setUp()
    const v4 = (address: string, internal = false) =>
      ({ address, internal, family: "IPv4", netmask: "", mac: "", cidr: null }) as const
    expect(lanAddressOf({ lo0: [v4("127.0.0.1", true)], utun3: [v4("10.0.0.2")], en0: [v4("192.168.4.30")] })).toBe(
      "192.168.4.30"
    )
    expect(lanAddressOf({ lo0: [v4("127.0.0.1", true)] })).toBeUndefined()
  })

  test("partnerScript():  matches only its own names when it takes them away", () => {
    world = setUp()
    expect(partnerScript("10.0.0.9", NAMES)).toContain(
      "sudo sed -i '' '/ test\\.spell\\.app test\\.spell\\.space$/d' /etc/hosts"
    )
  })
})
