/**
 * The Servers tab's page script (`servers-page.html`, epic `epic-engine` P82, T162):  draws `/api/servers` (the
 * server keeper's `ServersAnswer`) as Spell UI elements, and asks again every 10 seconds while the page shows.
 * - The page, top to bottom, nothing folding:
 *   - "main":  a card per server of the main checkout (the hub, the page server, the editor, a repo's own)
 *   - "Merged into main recently":  the branches that landed on main, newest first (`ServerFacts.mergedIntoMain()`)
 *   - one line per repo:  main's commits not on GitHub yet
 *   - each epic's worktree, `⎇ <worktree>`, the one worked on last first, how long ago beside its name:  a card per
 *     server it has, then what it holds that main hasn't got
 * - Each card:  the server's name, a link to its address, its state, and its buttons along its bottom;  three a row at
 *   most, fewer as the page narrows (epic `epic-engine` I449).
 * - Built with `document.createElement()`, never markup in strings;  every control a `<ui-button>`.
 * - Start, Restart and Stop POST `/api/servers/<action>` with this page's write token (`SPELL_SERVER.token`);  the
 *   page server hands them on to the hub (`serverRoutes`).
 * - Plain DOM, no imports:  the page loads it as it is, beside the docs bundle;  so `ago()` is its own.
 *   - Its pure parts are exported for its tests (`worktreeOrder()`, `inCardOrder()`);  it starts only on its page.
 * - Its own timer, not the kit's `pollWhileVisible()`:  that's for bundled code, and this page has no bundle of its own;
 *   the same rule, by hand:  no look while the page is hidden, one as soon as it shows again.
 */

/** How often the page asks, seconds, when the answer doesn't say (`lookSeconds`). */
const LOOK_SECONDS = 10

/** What each state is drawn as:  its words and its colour. */
const STATES = {
  running: { words: "Running", color: "green" },
  starting: { words: "Starting", color: "blue" },
  stopped: { words: "Stopped", color: "grey" },
  down: { words: "Down", color: "red" }
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

/** How each kind of last work is said (`WorktreeWorked.by`):  `last commit 3 weeks ago` */
const WORKED_WORDS = { commit: "last commit", change: "last change", page: "last worked on" }

/** The glyph a worktree's name wears, as every window title and page does. */
const WORKTREE = "⎇"

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
  for (const child of children.flat()) if (child !== undefined && child !== false) element.append(child)
  return element
}

/** `count` and its noun, `1 commit`, `3 commits` */
function counted(count, one, many = `${one}s`) {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`
}

/** how long ago an ISO time was, in a few words:  `just now`, `20 min ago`, `3 h ago`, `11/22` */
function ago(iso) {
  const at = new Date(iso)
  const minutes = Math.round((Date.now() - at.getTime()) / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}\u00a0min ago`
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)}\u00a0h ago`
  return `${at.getMonth() + 1}/${at.getDate()}`
}

/** how long ago, in words, for days and weeks too:  `20 min ago`, `3 days ago`, `3 weeks ago`, `2 months ago` */
function agoLong(iso) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  const days = Math.round(minutes / (24 * 60))
  if (minutes < 60) return minutes < 1 ? "just now" : `${counted(minutes, "minute")} ago`
  if (minutes < 24 * 60) return `${counted(Math.round(minutes / 60), "hour")} ago`
  if (days < 14) return `${counted(days, "day")} ago`
  if (days < 60) return `${counted(Math.round(days / 7), "week")} ago`
  return `${counted(Math.round(days / 30), "month")} ago`
}

/** ask the keeper, and draw what it says;  a failure says so at the top */
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

/** a problem at the top, as a `<ui-message>`;  none:  it goes */
function sayProblem(heading, words) {
  const place = document.getElementById("servers-problem")
  place.replaceChildren(...(heading ? [el("ui-message", { state: "negative", heading }, words)] : []))
}

/** the whole page, from `answer` */
function draw(answer) {
  const named = new Set(answer.servers.map((server) => server.repo).filter(Boolean)).size > 1
  const onMain = inCardOrder(answer.servers.filter((server) => !server.worktree))
  document
    .getElementById("servers-page")
    .replaceChildren(
      heading("main"),
      cards(onMain, named),
      el("h3", { className: "servers-sub" }, "Merged into main recently"),
      mergedList(answer.mergedIntoMain ?? []),
      ...gitHubLines(answer.notOnGitHub ?? []),
      ...worktreeGroups(answer, named)
    )
}

/** a group's heading:  `main`, `⎇ atmosphere` (its epic page linked), and a muted note after it */
function heading(words, url, note) {
  return el(
    "h2",
    { className: "servers-head" },
    url ? el("a", { href: url }, words) : words,
    note ? el("span", { className: "servers-age" }, note) : undefined
  )
}

/** a card per server, in a grid that fits the side bar and a phone;  none:  a line saying so */
function cards(servers, named) {
  if (!servers.length) return el("p", { className: "servers-quiet" }, "No servers running.")
  return el(
    "div",
    { className: "servers-cards" },
    servers.map((server) => serverCard(server, named))
  )
}

/**
 * one server's card:
 * - its name, a link to its address (the address and what it's for, its tooltip), and its state;  stopped:  why, the
 *   state's tooltip
 * - its buttons in a row along the bottom
 */
function serverCard(server, named) {
  const state = STATES[server.state] ?? STATES.down
  // its own list, when it takes only some (main's editor:  never Stop)
  const actions = (BUTTONS[server.state] ?? []).filter((action) => !server.actions || server.actions.includes(action))
  const buttons = server.canStart ? actions.map((action) => actionButton(server, action)) : []
  const name = named && server.repo && !server.worktree ? `${server.repo} ${server.name}` : server.name
  const tip = [server.address?.replace(/^https?:\/\//, "").replace(/\/$/, ""), server.what].filter(Boolean).join(":  ")
  return el(
    "ui-card",
    { className: "servers-card", fluid: true, "data-state": server.state },
    el(
      "ui-content",
      {},
      el(
        "div",
        { className: "servers-line" },
        el(
          "strong",
          { className: "servers-name", "data-tooltip": tip || undefined },
          server.address ? el("a", { href: server.address, target: "_blank" }, name) : name
        ),
        el("ui-label", { size: "mini", color: state.color, "data-tooltip": server.why || undefined }, state.words)
      ),
      buttons.length ? el("div", { className: "servers-buttons" }, buttons) : undefined
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

/** what landed on main lately, a line each:  `editor · P43:  Spell UI site · 12 commits · 20 min ago` */
function mergedList(moves) {
  if (!moves.length) return el("p", { className: "servers-quiet" }, "Nothing merged into main lately.")
  return el(
    "ui-list",
    { className: "servers-list" },
    moves.map((move) =>
      el(
        "ui-item",
        { className: move.isNew ? "servers-new" : undefined },
        move.isNew ? el("ui-label", { size: "mini", color: "blue" }, "new") : undefined,
        el("strong", {}, move.repo ? `${move.repo} ` : "", move.branch ?? "main"),
        ` · ${whatItBrought(move)}`,
        el("span", { className: "servers-when" }, ` · ${counted(move.commits, "commit")} · ${ago(move.at)}`)
      )
    )
  )
}

/** a landing's newest commit, short:  its subject before ` -- `, the branch's name taken off its start */
function whatItBrought(move) {
  const subject = move.subject.split(" -- ")[0]
  return move.branch && subject.startsWith(`${move.branch} `) ? subject.slice(move.branch.length + 1) : subject
}

/** a line per repo whose main GitHub hasn't got all of;  none:  nothing */
function gitHubLines(waiting) {
  return waiting.map(({ repo, base, count }) =>
    el(
      "p",
      { className: "servers-github", "data-tooltip": "Only the tooling home's session sends them to GitHub." },
      `${repo ? `${repo}:  ` : ""}${counted(count, "commit")} on ${base} not on GitHub yet`
    )
  )
}

/**
 * each epic's worktree:  its heading, its servers' cards, then what it holds that main hasn't got
 * - every worktree a server or a running epic names, busy or idle
 * - in the order the keeper sends them, the one worked on last first (`ServerFacts.newestFirst()`, epic `epic-engine`
 *   I449);  a worktree only a server names, after them, by name
 */
function worktreeGroups(answer, named) {
  return worktreeOrder(answer).flatMap(({ worktree, epic, servers }) => {
    const running = servers.filter((server) => server.state !== "stopped")
    return [
      heading(`${WORKTREE} ${named && epic?.repo ? `${epic.repo} ` : ""}${worktree}`, epic?.url, workedWords(epic)),
      ...(running.length ? [cards(running, named)] : []),
      stoppedLine(servers.filter((server) => server.state === "stopped")),
      openStuff(epic)
    ].filter(Boolean)
  })
}

/**
 * The worktrees the page lists, in order, each with its epic (if one runs there) and its servers in card order
 * - the epics' worktrees first, in the order the keeper sends them (newest worked on first), then a worktree only a
 *   server names, by name
 * - a server is its worktree's by name, and by repo where the answer names the epic's repo (two repos may each have
 *   a worktree of one name)
 * - pure:  the page's tests call it
 */
export function worktreeOrder(answer) {
  const servers = answer.servers ?? []
  const groups = (answer.epicWorktrees ?? []).map((epic) => ({
    worktree: epic.worktree,
    epic,
    servers: inCardOrder(
      servers.filter((server) => server.worktree === epic.worktree && (!epic.repo || epic.repo === server.repo))
    )
  }))
  const left = servers.filter((server) => server.worktree && !groups.some((group) => group.servers.includes(server)))
  const names = [...new Set(left.map((server) => server.worktree))].sort((one, other) => one.localeCompare(other))
  return [
    ...groups,
    ...names.map((worktree) => ({
      worktree,
      servers: inCardOrder(left.filter((server) => server.worktree === worktree))
    }))
  ]
}

/** The order of a checkout's cards, by server name:  the page server, its editor, the hub;  a repo's own after. */
const CARD_ORDER = ["page server", "editor", "epic hub"]

/** `servers` in card order (`CARD_ORDER`), a repo's own servers after, each kept in the order it came;  a new list */
export function inCardOrder(servers) {
  const rank = (server) => {
    const place = server.own ? -1 : CARD_ORDER.indexOf(server.name)
    return place < 0 ? CARD_ORDER.length : place
  }
  return servers
    .map((server, index) => ({ server, index }))
    .sort((one, other) => rank(one.server) - rank(other.server) || one.index - other.index)
    .map(({ server }) => server)
}

/** when the worktree was last worked on, a few words:  `last commit 3 weeks ago`;  not known:  `undefined` */
function workedWords(epic) {
  if (!epic?.worked) return undefined
  return `${WORKED_WORDS[epic.worked.by] ?? WORKED_WORDS.commit} ${agoLong(epic.worked.at)}`
}

/** the worktree's stopped servers, one line:  `page server stopped  [Start]` */
function stoppedLine(servers) {
  if (!servers.length) return undefined
  return el(
    "div",
    { className: "servers-stopped" },
    servers.map((server) =>
      el(
        "span",
        { className: "servers-stopped-one", "data-tooltip": server.why || undefined },
        `${server.name} stopped`,
        server.canStart ? actionButton(server, "start") : undefined
      )
    )
  )
}

/** what the worktree holds that main hasn't got, a line each:  its commits first, then its items, agents, phase */
function openStuff(epic) {
  if (!epic) return undefined
  const lines = [
    epic.ahead
      ? el(
          "ui-item",
          { className: "servers-ahead" },
          el("strong", {}, counted(epic.ahead, "commit")),
          " not merged into main"
        )
      : el("ui-item", {}, "Nothing waiting to merge into main"),
    epic.open && el("ui-item", {}, epic.open),
    epic.agents && el("ui-item", {}, `${counted(epic.agents, "agent")} working`),
    epic.phase && el("ui-item", {}, `Working on ${epic.phase}`),
    epic.turn && el("ui-item", {}, `In the ${epic.turn} turn now`)
  ]
  return el("ui-list", { className: "servers-list", bulleted: true }, lines.filter(Boolean))
}

// only on the page:  its tests import this file for its pure parts
if (typeof document !== "undefined" && document.getElementById("servers-page")) {
  void look()
  setInterval(() => void look(), LOOK_SECONDS * 1000)
  document.addEventListener("visibilitychange", () => void look())
}
