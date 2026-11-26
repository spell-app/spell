import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { flush } from "solid-js"
import { render } from "@solidjs/web"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { SPACES } from "spell/app/spaces"
import { editor, type EditorStore } from "spell/app/app/editor"
import { AppBarMenus, uiReady } from "spell/app/app/solid"
import { ServersGlance } from "spell/app/app/solid/ServersGlance"

/**
 * Help › Servers (epic `editor` T185), in the browser:  a dot saying whether this machine's servers are all up,
 * from the page server's glance at the keeper (`SPACES.KEEPER_GLANCE_API`, stubbed here), and the Servers dialog on
 * a click.
 */

/** Undo for each test:  unmount, restore `editor` fields and `fetch`. */
const cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
})

describe("Help › Servers", () => {
  test("only where a keeper runs;  its dot green while all run, red while one is down, grey while the keeper doesn't say;  a click opens its page", async () => {
    const answer: { glance: SPACES.KeeperGlance } = { glance: {} }
    stubGlance(answer)
    const showServers = spyOnEditor("showServers")
    const host = await mount(() => <AppBarMenus mode="edit" />)
    // the bar's menus wait for the editor's Spell to load
    const help = () => host.querySelector<HTMLElement & { visible: boolean }>("ui-popup[for=HelpBarMenu]")
    await waitForCondition(() => !!help())
    const popup = help()!
    popup.visible = true
    flush()
    const menu = () => popup.querySelector("ui-menu.BarMenuItems")
    const servers = () => menu()?.querySelector<HTMLElement>(":scope > ui-action[icon=server]")
    await waitForCondition(() => !!menu()?.children.length)

    // no keeper on this machine:  no row
    await ServersGlance.refresh()
    flush()
    await ElementFixture.settle(host)
    expect(servers()).toBeFalsy()

    // all running:  a green dot after its title, its words the row's tooltip and the dot's label
    answer.glance = { page: "http://127.0.0.1:4949/servers/", servers: 4, down: 0 }
    await ServersGlance.refresh()
    await waitForCondition(() => !!servers())
    await ElementFixture.settle(host)
    const dot = () => servers()!.querySelector("ui-label[slot=badge]")!
    expect(servers()!.textContent?.trim()).toBe("Servers…")
    expect(dot().getAttribute("color")).toBe("green")
    expect(servers()!.getAttribute("data-tooltip")).toBe("All of Spell's background servers are running.")
    expect(dot().getAttribute("aria-label")).toBe("All of Spell's background servers are running.")
    // it sits after All Icons, before the tours
    const rows = [...menu()!.children].map((row) => row.textContent?.trim())
    expect(rows.slice(0, 4)).toEqual(["Keyboard Shortcuts", "All Icons…", "Servers…", ""])

    // two down:  red, and the words say how many
    answer.glance = { page: "http://127.0.0.1:4949/servers/", servers: 4, down: 2 }
    await ServersGlance.refresh()
    await waitForCondition(() => dot().getAttribute("color") === "red")
    expect(servers()!.getAttribute("data-tooltip")).toBe(
      "2 of Spell's background servers have stopped.\nClick to see which ones, and start them again."
    )

    // the keeper runs, but didn't answer:  grey
    answer.glance = { page: "http://127.0.0.1:4949/servers/" }
    await ServersGlance.refresh()
    await waitForCondition(() => dot().getAttribute("color") === "grey")

    // a click opens the keeper's page, and closes the menu
    servers()!.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!.click()
    flush()
    await waitForCondition(() => showServers.mock.calls.length > 0)
    expect(showServers).toHaveBeenCalledWith("http://127.0.0.1:4949/servers/")
    expect(popup.visible).toBe(false)
  })
})

////////////////
// ## Helpers
////////////////

/** Answer the glance's address with `answer.glance`, as it is when asked;  everything else as before. */
function stubGlance(answer: { glance: SPACES.KeeperGlance }) {
  const realFetch = globalThis.fetch
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    if (url.includes(SPACES.KEEPER_GLANCE_API)) {
      return Promise.resolve(
        new Response(JSON.stringify(answer.glance), { headers: { "content-type": "application/json" } })
      )
    }
    return realFetch(input, init)
  })
  cleanups.push(() => spy.mockRestore())
}

/** Render `component` into a fresh `<div>` in the page, wait for its `<ui-*>` elements;  unmounted after the test. */
async function mount(component: () => unknown): Promise<HTMLElement> {
  await uiReady
  const host = document.createElement("div")
  document.body.append(host)
  const dispose = render(component as () => never, host)
  cleanups.push(() => {
    dispose()
    host.remove()
  })
  flush()
  await ElementFixture.settle(host)
  return host
}

/** Replace `editor[key]` with a spy, restored after the test. */
function spyOnEditor<K extends keyof EditorStore>(key: K) {
  const spy = vi.fn()
  const before = editor[key]
  editor[key] = spy as unknown as EditorStore[K]
  cleanups.push(() => (editor[key] = before))
  return spy
}

/** Wait for `condition`:  throws after 10s. */
async function waitForCondition(condition: () => boolean): Promise<void> {
  const started = Date.now()
  while (!condition()) {
    if (Date.now() - started > 10_000) throw new Error("waitForCondition():  timed out")
    await new Promise((resolve) => setTimeout(resolve, 50))
    flush()
  }
}
