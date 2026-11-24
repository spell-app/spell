import { spawnSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeEach, describe, expect, it } from "vite-plus/test"

import { SRV } from "spell/server"

/** A real certificate for `names`, by openssl, valid `days`:  `{ cert, key }` files in `folder`;  none without openssl. */
function opensslCertificate(folder: string, names: string, days: number): { cert: string; key: string } | undefined {
  const [cert, key] = [join(folder, `cert-${days}.pem`), join(folder, `key-${days}.pem`)]
  const made = spawnSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "ec",
      "-pkeyopt",
      "ec_paramgen_curve:prime256v1",
      "-nodes",
      "-days",
      String(days),
      "-subj",
      "/CN=localhost",
      "-addext",
      `subjectAltName=${names}`,
      "-keyout",
      key,
      "-out",
      cert
    ],
    { stdio: "ignore" }
  )
  return made.error || made.status !== 0 ? undefined : { cert, key }
}

describe("LocalCertificate:  mkcert's certificate, every program a stand-in", () => {
  const scratch = mkdtempSync(join(tmpdir(), "srv-certificate-"))
  const covering = opensslCertificate(scratch, "DNS:localhost,IP:127.0.0.1,IP:0:0:0:0:0:0:0:1", 90)
  const partial = opensslCertificate(scratch, "DNS:localhost", 91)
  const ending = opensslCertificate(scratch, "DNS:localhost,IP:127.0.0.1,IP:0:0:0:0:0:0:0:1", 2)
  let folder: string
  let ran: string[][]
  let installed: boolean
  let trusted: boolean
  let made: { cert: string; key: string } | undefined
  let cancels: boolean

  /** the stand-ins:  mkcert copies `made` into place;  `security verify-cert` says `trusted` */
  const tools: SRV.CertificateTools = {
    has: (command) => command !== "mkcert" || installed,
    output: (command, args) => (command === "mkcert" && args[0] === "-CAROOT" ? `${scratch}\n` : ""),
    succeeds: (command, args) => {
      ran.push([command, ...args])
      return command === "security" && trusted
    },
    run: (command, args) => {
      ran.push([command, ...args])
      if (command === "mkcert" && args[0] === "-cert-file" && made) {
        copyFileSync(made.cert, args[1]!)
        copyFileSync(made.key, args[3]!)
      }
    },
    ask: async (command, args) => {
      ran.push([command, ...args])
      if (cancels) throw new SRV.CertificateError("security add-trusted-cert didn't work")
    }
  }

  /** the page server's certificate, in a folder of its own, on `platform` */
  const certificate = (platform = "darwin") => SRV.LocalCertificate.forPageServer({ folder, tools, platform })

  beforeEach(() => {
    folder = mkdtempSync(join(scratch, "folder-"))
    ran = []
    installed = true
    trusted = false
    made = covering
    cancels = false
  })

  afterAll(() => rmSync(scratch, { recursive: true, force: true }))

  it("names how to install mkcert when it isn't, and makes nothing", () => {
    installed = false
    const page = certificate()
    expect(page.state).toBe("no-mkcert")
    expect(() => page.make()).toThrow(SRV.CertificateError)
    expect(() => page.make()).toThrow(/brew install mkcert/)
    expect(page.makeIfNeeded()).toBe("no-mkcert")
    expect(page.tls).toBeUndefined()
  })

  it.skipIf(!covering)(
    "makes it for localhost, 127.0.0.1 and ::1, asking for nothing;  untrusted, it gives no TLS",
    () => {
      const page = certificate()
      expect(page.state).toBe("missing")
      expect(page.makeIfNeeded()).toBe("untrusted")
      expect(ran[0]).toEqual([
        "mkcert",
        "-cert-file",
        join(folder, "localhost.pem"),
        "-key-file",
        join(folder, "localhost-key.pem"),
        "localhost",
        "127.0.0.1",
        "::1"
      ])
      // only reading the keychains:  nothing asked `sudo`
      expect(ran.some(([command]) => command === "sudo")).toBe(false)
      expect(page.tls).toBeUndefined()
    }
  )

  it.skipIf(!covering)("is ready once the Mac trusts it:  its key and certificate for the server", () => {
    trusted = true
    const page = certificate()
    expect(page.makeIfNeeded()).toBe("ready")
    expect(page.tls?.cert).toMatch(/BEGIN CERTIFICATE/)
    expect(page.tls?.key).toMatch(/PRIVATE KEY/)
    // made once:  a second look leaves it
    ran = []
    expect(page.makeIfNeeded()).toBe("ready")
    expect(ran.some(([command]) => command === "mkcert")).toBe(false)
  })

  it.skipIf(!partial || !covering)("makes it again when it doesn't cover every name", () => {
    trusted = true
    made = partial
    const page = certificate()
    page.make()
    expect(page.state).toBe("uncovered")
    made = covering
    expect(page.makeIfNeeded()).toBe("ready")
  })

  it.skipIf(!ending)("makes it again in its last week", () => {
    trusted = true
    made = ending
    const page = certificate()
    page.make()
    expect(page.state).toBe("expired")
  })

  it("trusts mkcert's authority on a Mac through sudo, and with mkcert -install elsewhere", () => {
    writeFileSync(join(scratch, "rootCA.pem"), "the authority's public file")
    certificate().trust()
    expect(ran).toEqual([["sudo", ...SRV.TRUST_COMMAND(join(scratch, "rootCA.pem"))]])
    ran = []
    certificate("linux").trust()
    expect(ran).toEqual([["mkcert", "-install"]])
  })

  it("trusts in the Mac's own password window with no terminal:  this person's keychain, no sudo", async () => {
    writeFileSync(join(scratch, "rootCA.pem"), "the authority's public file")
    await certificate().trustInWindow()
    expect(ran).toEqual([["security", ...SRV.TRUST_IN_WINDOW_COMMAND(join(scratch, "rootCA.pem"))]])
    expect(SRV.TRUST_IN_WINDOW_COMMAND("x")).not.toContain("-d")
    cancels = true
    await expect(certificate().trustInWindow()).rejects.toThrow(SRV.CertificateError)
    // off a Mac only a terminal can ask:  it says the command, and runs nothing
    ran = []
    await expect(certificate("linux").trustInWindow()).rejects.toThrow("spell server certificate")
    expect(ran).toEqual([])
    installed = false
    await expect(certificate().trustInWindow()).rejects.toThrow("mkcert")
  })

  describe("Firefox, which keeps its own list of trusted certificates", () => {
    let app: string
    let profiles: string
    let nss: boolean
    let listed: string

    /** the stand-ins again, with NSS's certutil (`nss`) listing `listed` for every profile */
    const withNss: SRV.CertificateTools = {
      ...tools,
      has: (command) => (command === "certutil" ? nss : tools.has(command)),
      output: (command, args) => (command === "certutil" ? listed : tools.output(command, args))
    }

    /** the page server's certificate, with Firefox at `app` and its profiles in `profiles` */
    const page = (platform = "darwin") =>
      SRV.LocalCertificate.forPageServer({
        folder,
        tools: withNss,
        platform,
        firefoxApps: [app],
        firefoxProfiles: profiles
      })

    beforeEach(() => {
      app = join(folder, "Firefox.app")
      profiles = join(folder, "Profiles")
      nss = true
      listed = ""
    })

    it("says none when Firefox isn't installed, or this isn't a Mac", () => {
      expect(page().firefox).toBe("none")
      mkdirSync(app)
      expect(page("linux").firefox).toBe("none")
    })

    it("needs NSS first, then an opened profile, then mkcert's authority in every profile", () => {
      mkdirSync(app)
      nss = false
      expect(page().firefox).toBe("no-nss")
      nss = true
      expect(page().firefox).toBe("no-profile")
      for (const name of ["one.default", "two.default-release"]) {
        mkdirSync(join(profiles, name), { recursive: true })
        writeFileSync(join(profiles, name, "cert9.db"), "")
      }
      expect(page().firefox).toBe("untrusted")
      listed = "mkcert development CA 1234   C,,\n"
      expect(page().firefox).toBe("trusted")
    })

    it("is trusted in Firefox through mkcert -install, which fills its profiles", () => {
      page().trustInFirefox()
      expect(ran).toEqual([["mkcert", "-install"]])
    })
  })

  it.skipIf(!covering)("undo takes its files away, and leaves mkcert's authority alone", () => {
    const page = certificate()
    page.make()
    page.undo()
    expect(existsSync(page.certificate)).toBe(false)
    expect(existsSync(page.key)).toBe(false)
    expect(page.state).toBe("missing")
    expect(ran.filter(([command]) => command !== "mkcert")).toEqual([])
  })
})
