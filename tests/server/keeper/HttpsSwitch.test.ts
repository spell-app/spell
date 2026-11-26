import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { SRV } from "spell/server"
import { fakeMainCheckout } from "spell/server/test/checkouts"
import { ask, serveHandler } from "spell/server/test/serve"

import {
  HttpsSwitch,
  RESTART_DELAY_MS,
  ServerKeeper,
  type HttpsStatus,
  type PageServerControl
} from "spell/server/keeper"

/**
 * A page server's certificate on stand-ins (`SRV.CertificateTools` is the real one's seam):  its state as the test
 * sets it, its two files in `folder`, and what each step did.  NEVER trusts anything on this machine.
 */
class FakeCertificate {
  state: SRV.CertificateState = "missing"
  isOnMac = true
  /** what `trustInWindow()` does:  approve, or the person cancels */
  approves = true
  steps: string[] = []
  readonly certificate: string
  readonly key: string

  constructor(folder: string) {
    this.certificate = join(folder, "localhost.pem")
    this.key = join(folder, "localhost-key.pem")
  }

  makeIfNeeded(): SRV.CertificateState {
    this.steps.push("make")
    if (this.state === "missing" || this.state === "expired" || this.state === "uncovered") {
      this.state = "untrusted"
      writeFileSync(this.certificate, "certificate")
      writeFileSync(this.key, "key")
    }
    return this.state
  }

  /** made again for the worktrees' names, when `missing` lists any (`LocalCertificate.addMoreNames()`) */
  missing: string[] = []
  addMoreNames(): boolean {
    if (!this.missing.length || this.state !== "ready") return false
    this.steps.push("more names")
    this.missing = []
    writeFileSync(this.certificate, `certificate ${Date.now()}`)
    return true
  }

  async trustInWindow(): Promise<void> {
    this.steps.push("trust")
    if (!this.approves) throw new SRV.CertificateError("security add-trusted-cert didn't work")
    this.state = "ready"
  }

  undo(): void {
    this.steps.push("undo")
    this.state = "missing"
    rmSync(this.certificate, { force: true })
    rmSync(this.key, { force: true })
  }
}

describe("HttpsSwitch:  the Servers tab turns HTTPS on and off (epic `epic-engine` T164)", () => {
  let folder: string
  let certificate: FakeCertificate
  let looks: number
  let now: number

  beforeEach(() => {
    vi.useFakeTimers()
    folder = mkdtempSync(join(tmpdir(), "https-switch-"))
    certificate = new FakeCertificate(folder)
    looks = 0
    now = 0
  })

  afterEach(() => {
    vi.useRealTimers()
    rmSync(folder, { recursive: true, force: true })
  })

  /** a switch over the fake certificate */
  const httpsSwitch = () =>
    new HttpsSwitch({
      certificate: certificate as unknown as SRV.LocalCertificate,
      changed: async () => void looks++,
      now: () => now
    })

  it("statusFor():  each certificate state as the card draws it, and which buttons apply", () => {
    const pick = ({ state, canTurnOn, canTurnOff, whyNot }: HttpsStatus) => ({
      state,
      canTurnOn,
      canTurnOff,
      hasWhyNot: Boolean(whyNot)
    })
    expect(pick(HttpsSwitch.statusFor("ready"))).toEqual({
      state: "on",
      canTurnOn: false,
      canTurnOff: true,
      hasWhyNot: false
    })
    expect(HttpsSwitch.statusFor("ready").address).toBe("https://localhost:4747/")
    expect(pick(HttpsSwitch.statusFor("missing"))).toEqual({
      state: "off",
      canTurnOn: true,
      canTurnOff: false,
      hasWhyNot: false
    })
    expect(pick(HttpsSwitch.statusFor("no-mkcert"))).toEqual({
      state: "off",
      canTurnOn: false,
      canTurnOff: false,
      hasWhyNot: true
    })
    expect(HttpsSwitch.statusFor("no-mkcert").whyNot).toContain("brew install mkcert")
    expect(pick(HttpsSwitch.statusFor("untrusted"))).toEqual({
      state: "needs-trust",
      canTurnOn: true,
      canTurnOff: true,
      hasWhyNot: false
    })
    for (const old of ["expired", "uncovered"] as const) expect(HttpsSwitch.statusFor(old).state).toBe("out-of-date")
    // off a Mac only a terminal can ask for the password:  Turn on says the command
    expect(HttpsSwitch.statusFor("missing", false)).toMatchObject({ canTurnOn: false })
    expect(HttpsSwitch.statusFor("missing", false).whyNot).toContain("spell server certificate")
    expect(HttpsSwitch.statusFor("ready", false).whyNot).toBeUndefined()
  })

  it("turn on:  made, trusted in the Mac's own window, then the keeper asks to look AFTER the answer", async () => {
    const turned = httpsSwitch()
    expect((await turned.turn("on")).state).toBe("on")
    expect(certificate.steps).toEqual(["make", "trust"])
    expect(looks).toBe(0)
    await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS)
    expect(looks).toBe(1)
  })

  it("turn on, already on:  nothing made, no look asked", async () => {
    certificate.state = "ready"
    await httpsSwitch().turn("on")
    await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS)
    expect(certificate.steps).toEqual([])
    expect(looks).toBe(0)
  })

  it("turn on, cancelled:  a 409 saying what to do, and no look asked", async () => {
    certificate.approves = false
    const failed = httpsSwitch()
      .turn("on")
      .catch((error: unknown) => error)
    const error = (await failed) as SRV.HttpError
    expect(error).toBeInstanceOf(SRV.HttpError)
    expect(error.status).toBe(409)
    expect(error.message).toContain("press Turn on")
    await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS)
    expect(looks).toBe(0)
  })

  it("turn on without mkcert:  a 409 naming how to install it, nothing made", async () => {
    certificate.state = "no-mkcert"
    await expect(httpsSwitch().turn("on")).rejects.toThrow("brew install mkcert")
    expect(certificate.steps).toEqual([])
  })

  it("turn off:  its files go and the keeper looks;  already off, nothing happens", async () => {
    certificate.state = "ready"
    const turned = httpsSwitch()
    expect((await turned.turn("off")).state).toBe("off")
    await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS)
    expect(certificate.steps).toEqual(["undo"])
    expect(looks).toBe(1)
    await turned.turn("off")
    await vi.advanceTimersByTimeAsync(RESTART_DELAY_MS)
    expect(certificate.steps).toEqual(["undo"])
    expect(looks).toBe(1)
  })

  it("filesStamp:  changes as the files are made, made again and deleted", () => {
    const turned = httpsSwitch()
    expect(turned.filesStamp).toBe("none none")
    certificate.makeIfNeeded()
    const made = turned.filesStamp
    expect(made).not.toBe("none none")
    certificate.undo()
    expect(turned.filesStamp).toBe("none none")
  })

  it("status is read at most every few seconds:  the Mac's trust check runs a program", () => {
    const turned = httpsSwitch()
    expect(turned.status.state).toBe("off")
    certificate.state = "ready"
    expect(turned.status.state).toBe("off")
    now += 10_000
    expect(turned.status.state).toBe("on")
  })
})

describe("ServerKeeper:  the certificate watched, HTTPS turned, Restart all (epic `epic-engine` T164)", () => {
  let folder: string
  let main: string
  let stops: { checkout: string; restart: boolean }[]
  let ensured: string[]
  let control: PageServerControl
  let certificate: FakeCertificate
  let keeper: ServerKeeper
  let served: Awaited<ReturnType<typeof serveHandler>>

  beforeEach(async () => {
    folder = realpathSync(mkdtempSync(join(tmpdir(), "https-keeper-")))
    main = fakeMainCheckout(join(folder, "kit"))
    mkdirSync(join(main, "src/server/page"), { recursive: true })
    writeFileSync(join(main, "repos.json5"), "{}\n")
    writeFileSync(join(main, "src/server/page/cli.ts"), "\n")
    stops = []
    ensured = []
    const running = new Set<string>()
    const info = (checkout: string) => ({
      pid: 1,
      port: 4747,
      root: checkout,
      started: "",
      base: "http://127.0.0.1:4747"
    })
    control = {
      status: async (checkout) => (running.has(checkout) ? info(checkout) : undefined),
      ensure: async (checkout) => {
        ensured.push(checkout)
        const launched = !running.has(checkout)
        running.add(checkout)
        return { ...info(checkout), launched }
      },
      stop: async (checkout, options) => {
        stops.push({ checkout, restart: Boolean(options?.restart) })
        return running.delete(checkout)
      }
    }
    certificate = new FakeCertificate(folder)
    const repo = { name: "kit", checkout: main }
    keeper = new ServerKeeper({
      home: join(folder, "home"),
      repos: [repo],
      control,
      https: new HttpsSwitch({
        certificate: certificate as unknown as SRV.LocalCertificate,
        changed: () => keeper.look()
      })
    })
    const router = new SRV.Router()
    keeper.route(router, new SRV.Guard({ token: "t" }))
    served = await serveHandler(router.handle)
  })

  afterEach(async () => {
    await served.close()
    rmSync(folder, { recursive: true, force: true })
  })

  /** POST `path` with `body` and the token */
  const post = (path: string, body = "{}", token = "t") =>
    ask(served.port, "POST", path, {
      body,
      headers: { "content-type": "application/json", "x-server-token": token }
    })

  /** the restarts of main's page server so far */
  const restarts = () => stops.filter((stop) => stop.checkout === main && stop.restart).length

  it("POST /api/servers/https:  turned on, then the keeper's look sees the new files and restarts main's page server", async () => {
    await keeper.look()
    expect(restarts()).toBe(0)
    expect((await post("/api/servers/https", `{"turn":"on"}`, "wrong")).status).toBe(403)
    expect((await post("/api/servers/https", `{"turn":"sideways"}`)).status).toBe(400)
    const answer = await post("/api/servers/https", `{"turn":"on"}`)
    expect(answer.status).toBe(200)
    expect(JSON.parse(answer.text)).toMatchObject({ state: "on", address: "https://localhost:4747/" })
    expect(certificate.steps).toEqual(["make", "trust"])
    await vi.waitFor(() => expect(restarts()).toBe(1))
  })

  it("a terminal's `spell server certificate --undo`:  the next look restarts main's page server;  no change, no restart", async () => {
    certificate.makeIfNeeded()
    await keeper.look()
    await keeper.look()
    expect(restarts()).toBe(0)
    certificate.undo()
    await keeper.look()
    expect(restarts()).toBe(1)
    await keeper.look()
    expect(restarts()).toBe(1)
  })

  it("made again for a new worktree's names while on:  no restart, the page servers take it in place (epic `editor` P49)", async () => {
    certificate.makeIfNeeded()
    await certificate.trustInWindow()
    await keeper.look()
    certificate.missing = ["seo.localhost", "seo--app.localhost"]
    await keeper.look()
    expect(certificate.steps).toContain("more names")
    await keeper.look()
    expect(restarts()).toBe(0)
  })

  it("a page server stopped by hand stays stopped when the certificate changes;  Restart all restarts it", async () => {
    await keeper.look()
    await keeper.act("stop", main)
    certificate.makeIfNeeded()
    await keeper.look()
    expect(restarts()).toBe(0)
    const answer = await post("/api/servers/restart-all")
    expect(JSON.parse(answer.text)).toEqual({ state: "restarting" })
    await vi.waitFor(() => expect(restarts()).toBe(1))
  })

  it("hands off:  nothing of main's started, a certificate change waits;  off, both taken up at once", async () => {
    await keeper.look()
    expect((await post("/api/servers/hands-off", `{"on":"yes"}`)).status).toBe(400)
    expect(JSON.parse((await post("/api/servers/hands-off", `{"on":true}`)).text)).toEqual({ handsOff: true })
    expect(keeper.dot()).toMatchObject({ dot: true })
    // the page server stopped by someone else, the certificate made in a terminal:  the keeper only reports
    await control.stop(main)
    stops.length = 0
    ensured.length = 0
    certificate.makeIfNeeded()
    await keeper.look()
    expect(keeper.servers().find((row) => row.id === "kit/page server")).toMatchObject({ state: "stopped" })
    expect(ensured).toEqual([])
    // the person's own Restart all still works
    await post("/api/servers/restart-all")
    await vi.waitFor(() => expect(restarts()).toBe(1))
    ensured.length = 0
    await control.stop(main)
    // turned off:  a look at once brings it back
    await post("/api/servers/hands-off", `{"on":false}`)
    expect(ensured).toContain(main)
    expect(keeper.isHandsOff).toBe(false)
    // and the certificate made meanwhile is taken up:  a restart of its own
    expect(restarts()).toBe(2)
  })
})
