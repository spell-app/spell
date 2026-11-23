/**
 * The Servers tab's page script (`servers-page.html`, epic `epic-engine` P82):  draws `/api/servers` (the server
 * keeper's `ServersAnswer`) as Spell UI elements, and asks again every 10 seconds while the page shows.
 * - Built with `document.createElement()`, never markup in strings;  every control a `<ui-button>`.
 * - Start, Restart and Stop POST `/api/servers/<action>` with this page's write token (`SPELL_SERVER.token`);  the
 *   page server hands them on to the hub (`serverRoutes`).
 * - Plain DOM, no imports:  the page loads it as it is, beside the docs bundle.
 * - Its own timer, not the kit's `pollWhileVisible()`:  that's for bundled code, and this page has no bundle of its own;
 *   the same rule, by hand:  no look while the page is hidden, one as soon as it shows again.
 */

/** How often the page asks, seconds, when the answer doesn't say (`lookSeconds`). */
const LOOK_SECONDS = 10

/** What each state is drawn as:  its words and its colour. */
const STATES = {
  running: { words: "Running", color: "green" },
  starting: { words: "Starting up", color: "blue" },
  stopped: { words: "Stopped", color: "grey" },
  down: { words: "Stopped by a problem", color: "red" }
}

/** The buttons a server that can start gets, by its state. */
const BUTTONS = {
  running: ["restart", "stop"],
  starting: ["stop"],
  stopped: ["start"],
  down: ["start"]
}

/** Each button's words, and its tooltip. */
const ACTIONS = {
  start: { words: "Start", tip: "Start it now" },
  restart: { words: "Restart", tip: "Stop it, then start it again, so it picks up your newest changes" },
  stop: { words: "Stop", tip: "Stop it.  It stays off until you press Start." }
}

/** whether a look is under way */
let isLooking = false

/** the element `tag`, with `attributes` and `children` (text or elements) */
function el(tag, attributes = {}, ...children) {
  const element = document.createElement(tag)
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined || value === false) continue
    if (name === "className") element.className = value
    else element.setAttribute(name, value === true ? "" : String(value))
  }
  for (const child of children.flat()) if (child !== undefined) element.append(child)
  return element
}

/** an ISO time as `14:32`, or `11/22 14:32` when it's not today */
function when(iso) {
  const at = new Date(iso)
  const time = at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
  return at.toDateString() === new Date().toDateString() ? time : `${at.getMonth() + 1}/${at.getDate()} ${time}`
}

/** ask the keeper, and draw what it says;  a failure says so above the sections */
async function look() {
  if (isLooking || document.visibilityState === "hidden") return
  isLooking = true
  try {
    const response = await fetch("/api/servers", { cache: "no-store" })
    const answer = await response.json()
    if (!response.ok) throw new Error(answer.error ?? `The server answered ${response.status}.`)
    sayProblem()
    draw(answer)
  } catch (error) {
    sayProblem("Can't see the servers right now", error.message)
  } finally {
    isLooking = false
  }
}

/** a problem above the sections, as a `<ui-message>`;  none:  it goes */
function sayProblem(heading, words) {
  const place = document.getElementById("servers-problem")
  place.replaceChildren(...(heading ? [el("ui-message", { state: "negative", heading }, words)] : []))
}

/** every section, from `answer` */
function draw(answer) {
  drawServers(answer.servers)
  drawMain(answer.justOnMain)
  drawWaiting(answer.waitingForMain)
  document.getElementById("servers-github").replaceChildren(
    // a line per repo, once there are two or more
    ...(answer.waitingForGitHub ?? "Nothing is waiting.  GitHub has everything on main.")
      .split("\n")
      .map((line) => el("p", {}, line))
  )
}

/**
 * the servers' table:  a row each, two columns, so it fits the side bar and a phone
 * - the server:  its name, its project (and worktree), what it's for
 * - how it stands:  its state, its address, why, and its buttons
 */
function drawServers(servers) {
  const rows = servers.map((server) => {
    const state = STATES[server.state] ?? STATES.down
    const where = server.worktree ? `${server.repo} ⎇ ${server.worktree}` : server.repo || "this computer"
    const address = server.address
      ? el(
          "a",
          { href: server.address, target: "_blank" },
          server.address.replace(/^https?:\/\//, "").replace(/\/$/, "")
        )
      : server.port
        ? `port ${server.port}`
        : undefined
    // its own list, when it takes only some (main's editor:  never Stop)
    const actions = (BUTTONS[server.state] ?? []).filter((action) => !server.actions || server.actions.includes(action))
    const buttons = server.canStart ? actions.map((action) => actionButton(server, action)) : []
    return el(
      "tr",
      {},
      el(
        "td",
        {},
        el("strong", {}, server.name),
        ` · ${where}`,
        server.what ? el("span", { className: "servers-what" }, server.what) : undefined
      ),
      el(
        "td",
        {},
        el(
          "div",
          { className: "servers-state" },
          el("ui-label", { size: "mini", color: state.color }, state.words),
          address,
          buttons
        ),
        server.why ? el("span", { className: "servers-why" }, server.why) : undefined
      )
    )
  })
  const head = el(
    "thead",
    {},
    el(
      "tr",
      {},
      ["Server", "Status"].map((words) => el("th", {}, words))
    )
  )
  document
    .getElementById("servers-rows")
    .replaceChildren(
      el(
        "ui-table",
        { className: "servers-table", celled: true, padding: "compact", appearance: "striped", unstackable: true },
        el("table", {}, head, el("tbody", {}, rows))
      )
    )
}

/** a Start, Restart or Stop button for `server` */
function actionButton(server, action) {
  const { words, tip } = ACTIONS[action]
  const button = el("ui-button", { size: "mini", appearance: "basic", "data-tooltip": tip }, words)
  button.addEventListener("click", async () => {
    button.setAttribute("loading", "")
    try {
      const response = await fetch(`/api/servers/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-server-token": window.SPELL_SERVER?.token ?? "" },
        body: JSON.stringify({ checkout: server.checkout, server: server.name })
      })
      const answer = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(answer.error ?? `The server answered ${response.status}.`)
    } catch (error) {
      sayProblem(`Couldn't ${words.toLowerCase()} the ${server.name}`, error.message)
    } finally {
      button.removeAttribute("loading")
      void look()
    }
  })
  return button
}

/** what just reached main:  the new ones marked */
function drawMain(moves) {
  const list = moves.length
    ? el(
        "ul",
        { className: "servers-list" },
        moves.map((move) =>
          el(
            "li",
            { className: move.isNew ? "servers-new" : undefined },
            el("span", { className: "servers-when" }, when(move.at)),
            move.isNew ? el("ui-label", { size: "mini", color: "blue" }, "new") : undefined,
            " ",
            move.repo ? `${move.repo}:  ` : "",
            // its first part only:  a commit's subject says what, then ` -- ` and the details
            move.subject.split(" -- ")[0]
          )
        )
      )
    : el("p", {}, "Nothing has reached main yet.")
  document.getElementById("servers-main").replaceChildren(list)
}

/** a line per running epic:  what waits to merge, and why */
function drawWaiting(epics) {
  const list = epics.length
    ? el(
        "ul",
        { className: "servers-list" },
        epics.map((epic) =>
          el("li", {}, epic.repo ? `${epic.repo}:  ` : "", el("a", { href: epic.url }, epic.epic), `:  ${epic.why}`)
        )
      )
    : el("p", {}, "No epic is running.")
  document.getElementById("servers-waiting").replaceChildren(list)
}

void look()
setInterval(() => void look(), LOOK_SECONDS * 1000)
document.addEventListener("visibilitychange", () => void look())
