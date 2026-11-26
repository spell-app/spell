import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, describe, expect, it, vi } from "vite-plus/test"

import { SRV } from "spell/server"

describe("LiveReload", () => {
  const temp = mkdtempSync(join(tmpdir(), "srv-live-"))
  afterAll(() => rmSync(temp, { recursive: true, force: true }))

  // the epic repo (epic `shared-content`):  a watched folder that is a link into a repo beside the checkout
  it("reports a change inside a watched LINKED folder, under the link's path", async () => {
    mkdirSync(join(temp, "peer/content"), { recursive: true })
    mkdirSync(join(temp, "root/packages/docs"), { recursive: true })
    symlinkSync("../../../peer/content", join(temp, "root/packages/docs/content"))
    const live = new SRV.LiveReload({ root: join(temp, "root"), debounce: 10, heartbeat: 0 })
    const send = vi.spyOn(live, "send")
    live.watch(join(temp, "root/packages/docs/content"))
    await new Promise((done) => setTimeout(done, 200))
    writeFileSync(join(temp, "peer/content/page.html"), "<p>changed</p>")
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith("change", { path: "/packages/docs/content/page.html" }), {
      timeout: 3000
    })
    live.close()
  })

  // a folder laid over another's address (Spell UI's built half, at `/ui/` before epic `people-and-orgs` P18)
  it("reports a folder served at another URL path under that path (`servedAt`)", async () => {
    mkdirSync(join(temp, "at/packages/ui/site/_assets"), { recursive: true })
    const live = new SRV.LiveReload({ root: join(temp, "at"), debounce: 10, heartbeat: 0 })
    const send = vi.spyOn(live, "send")
    live.watch(join(temp, "at/packages/ui/site"), { servedAt: "/ui" })
    await new Promise((done) => setTimeout(done, 200))
    writeFileSync(join(temp, "at/packages/ui/site/_assets/site.js"), "export {}")
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith("change", { path: "/ui/_assets/site.js" }), {
      timeout: 3000
    })
    live.close()
  })

  // epic `epic-engine` I116:  every report is a page's reason to reload
  it("doesn't report a file rewritten with the same contents;  a real change is reported again", async () => {
    mkdirSync(join(temp, "same"), { recursive: true })
    const file = join(temp, "same/bundle.js")
    writeFileSync(file, "one")
    const live = new SRV.LiveReload({ root: join(temp, "same"), debounce: 10, heartbeat: 0 })
    const send = vi.spyOn(live, "send")
    const settle = () => new Promise((done) => setTimeout(done, 60))
    live.changed(file)
    await settle()
    live.changed(file)
    await settle()
    expect(send).toHaveBeenCalledTimes(1)
    writeFileSync(file, "two")
    live.changed(file)
    await settle()
    expect(send).toHaveBeenCalledTimes(2)
    live.close()
  })

  // epic `editor` T178:  a page that connects while a rebuild holds what pages load hears it too
  it("keeps a state for pages that connect later, after `hello`, until it's dropped", async () => {
    mkdirSync(join(temp, "keep"), { recursive: true })
    const web = new SRV.WebServer({ root: join(temp, "keep"), mounts: [], live: true })
    const { port } = await web.listen({ port: 0 })
    /** the events a page connecting now hears in its first 200ms:  `hello`, then what stands */
    const heard = async (): Promise<string[]> => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}${SRV.LIVE_EVENTS}`)
      const events: string[] = []
      socket.addEventListener("message", ({ data }) => {
        const { event, data: detail } = JSON.parse(String(data)) as { event: string; data: { waiting?: boolean } }
        events.push(event === "hello" ? event : `${event} ${detail.waiting}`)
      })
      await new Promise((done) => socket.addEventListener("open", done))
      await new Promise((done) => setTimeout(done, 200))
      socket.close()
      return events
    }
    web.live!.keep("bundles-waiting", { waiting: true }, "a")
    expect(await heard()).toEqual(["hello", "bundles-waiting true"])
    web.live!.drop("bundles-waiting", { waiting: false }, "a")
    expect(await heard()).toEqual(["hello"])
    await web.close()
  })

  // epic `epic-engine` P40:  the page that shows it patches itself without fetching it
  it("sends a page's change WITH the page, as `pages` renders it;  anything else alone", async () => {
    mkdirSync(join(temp, "push"), { recursive: true })
    const page = join(temp, "push/page.html")
    const style = join(temp, "push/page.css")
    writeFileSync(page, "<p>new</p>")
    writeFileSync(style, "p {}")
    const live = new SRV.LiveReload({ root: join(temp, "push"), debounce: 10, heartbeat: 0 })
    live.pages = async (path) => ({ html: `rendered ${path}`, etag: '"e1"' })
    const send = vi.spyOn(live, "send")
    live.changed(page)
    live.changed(style)
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2), { timeout: 3000 })
    expect(send).toHaveBeenCalledWith("change", { path: "/page.html", html: "rendered /page.html", etag: '"e1"' })
    expect(send).toHaveBeenCalledWith("change", { path: "/page.css" })
    live.close()
  })
})
