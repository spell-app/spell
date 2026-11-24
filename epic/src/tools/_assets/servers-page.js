/**
 * The Servers tab's page script (`servers-page.html`, epic `epic-engine` P82, T162):  draws `/api/servers` (the
 * server keeper's `ServersAnswer`) as Spell UI elements, and asks again every 10 seconds while the page shows.
 * - The page, top to bottom, nothing folding:
 *   - "main":  a card per server of the main checkout (the hub, the page server, the editor, a repo's own)
 *   - "Merged into main recently":  the branches that landed on main, newest first (`ServerFacts.mergedIntoMain()`),
 *     a row each in columns, and last, quieter, a row per repo for main's commits not on GitHub yet
 *   - each epic's worktree, `⎇ <worktree>`, the one worked on last first, how long ago beside its name:  a card per
 *     server it has, then what it holds that main hasn't got
 * - Each card:  the server's name, a link, and its address under it;  its state on the right, and under the state its
 *   buttons, icons only;  three a row at most, fewer as the page narrows (epic `epic-engine` I449, I451).
 * - Built with `document.createElement()`, never markup in strings;  every control a `<ui-button>`.
 * - Start, Restart and Stop POST `/api/servers/<action>` with this page's write token (`SPELL_SERVER.token`);  the
 *   page server hands them on to the hub (`serverRoutes`).
 * - Plain DOM, no imports:  the page loads it as it is, beside the docs bundle;  so `ago()` is its own.
 *   - Its pure parts are exported for its tests (`worktreeOrder()`, `inCardOrder()`, `firstClause()`);  it starts only on its page.
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

/** The buttons a server that can start gets, by its state:  icons under its state, in this order. */
const BUTTONS = {
  running: ["restart", "stop"],
  starting: ["stop"],
  stopped: ["start"],
  down: ["start"]
}

/** Each button's icon and words:  its tooltip and accessible name, `{name}` the server's */
const ACTIONS = {
  start: { icon: "play", words: "Start", tip: "Start the {name}" },
  restart: { icon: "rotate right", words: "Restart", tip: "Restart the {name}, so it runs your latest changes" },
  stop: { icon: "stop", words: "Stop", tip: "Stop the {name}.  It stays off until you start it again." }
}

/**
 * Why a server has no Stop (or no buttons at all), said on the button it lacks, by server name (epic `epic-engine`
 * I451:  "why can I start/stop some and not the others?")
 * - the hub IS the keeper:  stopped, nothing would keep the other servers up, nor this page
 * - an editor comes with its page server:  main's is restarted through it, a worktree's restarts with it
 */
const NO_STOP = {
  "epic hub":
    "This server keeps your other servers running, so you can't stop it here.\nIt restarts by itself when you change its code.",
  editor: "The editor runs inside its page server.\nStop that server to stop the editor."
}

/** Why a server has no Restart, by server name;  none named:  the general reason */
const NO_RESTART = {
  "epic hub": NO_STOP["epic hub"],
  editor: "This editor runs inside its page server.\nRestart that server to restart the editor."
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
      mergedList(answer.mergedIntoMain ?? [], answer.notOnGitHub ?? [], named),
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
 * one server's card, two rows of two (epic `epic-engine` I451):
 * - its name, a link to its address;  under it, the address itself, small (what it's for, its tooltip)
 * - on the right its state, and under the state, lined up with it, its buttons as icons
 * - a button it hasn't got is drawn disabled, its tooltip saying why (`NO_STOP`, `NO_RESTART`), so every running
 *   card has the same icons in the same place
 */
function serverCard(server, named) {
  const state = STATES[server.state] ?? STATES.down
  const name = named && server.repo && !server.worktree ? `${server.repo} ${server.name}` : server.name
  const address = server.address?.replace(/^https?:\/\//, "").replace(/\/$/, "")
  return el(
    "ui-card",
    { className: "servers-card", fluid: true, "data-state": server.state },
    el(
      "ui-content",
      {},
      el(
        "div",
        { className: "servers-card-grid" },
        el(
          "strong",
          { className: "servers-name" },
          server.address ? el("a", { href: server.address, target: "_blank" }, name) : name
        ),
        el(
          "ui-label",
          { className: "servers-state", size: "mini", color: state.color, "data-tooltip": server.why || undefined },
          state.words
        ),
        el(
          "span",
          { className: "servers-address", "data-tooltip": server.what || undefined },
          address ?? server.what ?? ""
        ),
        el("span", { className: "servers-actions" }, cardButtons(server))
      )
    )
  )
}

/** the icons under a card's state:  what it can do now, and, disabled, what it can't and why */
function cardButtons(server) {
  const wanted = BUTTONS[server.state] ?? []
  const can = (action) => server.canStart && (!server.actions || server.actions.includes(action))
  return wanted.flatMap((action) => {
    if (can(action)) return [actionButton(server, action)]
    const why = (action === "stop" ? NO_STOP : NO_RESTART)[server.name]
    return why && action !== "start" ? [actionButton(server, action, why)] : []
  })
}

/** an icon button that starts, restarts or stops `server`;  `whyNot`:  disabled, saying why in its tooltip */
function actionButton(server, action, whyNot) {
  const { icon, words, tip } = ACTIONS[action]
  const label = tip.replace("{name}", server.name).split(".  ")[0]
  const button = el("ui-button", {
    className: "servers-action",
    size: "tiny",
    appearance: "circular basic",
    icon,
    "aria-label": label,
    disabled: Boolean(whyNot)
  })
  // a disabled button takes no pointer:  its tooltip goes on a box round it
  if (whyNot) return el("span", { className: "servers-why-not", "data-tooltip": whyNot }, button)
  button.dataset.tooltip = tip.replace("{name}", server.name)
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

/**
 * what landed on main lately, a row each, newest first, then main's commits GitHub hasn't got as a quiet last row
 * (epic `epic-engine` I451:  "List is very ugly"):
 *   `•  [epic-engine]  T163, I450:  ONE listener for every epic's page    1 commit    5 min ago`
 * - a dot for one that's new (`RECENT_MINUTES`), the branch a small label, its newest commit's first clause cut to
 *   the row (the whole subject its tooltip), how many commits and when in columns of their own, right-aligned
 */
function mergedList(moves, waiting, named) {
  const repoNamed = named || new Set(moves.map((move) => move.repo)).size > 1
  const rows = moves.map((move) =>
    listRow({
      isNew: move.isNew,
      tag: `${repoNamed && move.repo ? `${move.repo}/` : ""}${move.branch ?? "main"}`,
      words: firstClause(whatItBrought(move)),
      tip: move.subject,
      count: counted(move.commits, "commit"),
      when: ago(move.at),
      whenTip: `${counted(move.commits, "commit")}, ${new Date(move.at).toLocaleString()}`
    })
  )
  const github = waiting.map(({ repo, base, count }) =>
    listRow({
      isQuiet: true,
      tag: repo && repoNamed ? `${repo}/${base}` : base,
      words: "Not on GitHub yet",
      tip: "These commits are on main on this computer only.\nThe tooling home's session sends them to GitHub.",
      // in the last column, which stays at every width
      when: counted(count, "commit")
    })
  )
  if (!rows.length && !github.length) return el("p", { className: "servers-quiet" }, "Nothing merged into main lately.")
  return rowList([...rows, ...github])
}

/** a landing's newest commit, short:  its subject before ` -- `, the branch's name taken off its start */
function whatItBrought(move) {
  const subject = move.subject.split(" -- ")[0]
  return move.branch && subject.startsWith(`${move.branch} `) ? subject.slice(move.branch.length + 1) : subject
}

/** a commit subject's first clause:  up to its first `;` or ` -- ` */
export function firstClause(subject) {
  return subject.split(/;\s| -- /)[0].trim()
}

/** rows in a list, evenly spaced, a rule between them;  `plain`:  only words and a count, no dot, tag or time */
function rowList(rows, { plain = false } = {}) {
  return el("ui-list", { className: `servers-rows${plain ? " servers-rows-plain" : ""}`, divided: true }, rows)
}

/**
 * one row of a list, in columns every row of its list shares (`.servers-rows`, a grid its rows join), nothing wrapping
 * - `isNew`:  a blue dot in the first column;  `tag`:  a small label;  `words`, cut to the row, `tip` in full;
 *   `count` and `when`, right-aligned in figures of one width
 * - `isQuiet`:  muted;  `isLoud`:  the count orange (work waiting);  `plain`:  words and count only (`rowList()`)
 */
function listRow({ plain, isNew, isQuiet, isLoud, tag, words, tip, count, when, whenTip }) {
  const dot = isNew
    ? el("ui-label", {
        circular: true,
        empty: true,
        size: "mini",
        color: "blue",
        "data-tooltip": "Added to main a few minutes ago"
      })
    : undefined
  return el(
    "ui-item",
    {},
    el(
      "div",
      { className: `servers-row${isQuiet ? " servers-row-quiet" : ""}` },
      plain ? undefined : el("span", { className: "servers-dot" }, dot),
      plain
        ? undefined
        : el(
            "span",
            { className: "servers-tag" },
            tag ? el("ui-label", { size: "tiny", appearance: "basic" }, tag) : ""
          ),
      el("span", { className: "servers-words", "data-tooltip": tip || undefined }, words),
      el("span", { className: `servers-count${isLoud ? " servers-loud" : ""}` }, count ?? ""),
      plain ? undefined : el("span", { className: "servers-when", "data-tooltip": whenTip }, when ?? "")
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
      openStuff(
        epic,
        servers.filter((server) => server.state === "stopped")
      )
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

/**
 * the worktree's rows, as the merged list:  each stopped server (its Start in the count's column), then what it holds
 * that main hasn't got:  its commits first, then its phase, items, agents, turn
 */
function openStuff(epic, stopped) {
  const rows = [
    ...stopped.map((server) =>
      listRow({
        plain: true,
        isQuiet: true,
        words: `The ${server.name} is stopped`,
        tip: server.why,
        count: server.canStart ? el("span", { className: "servers-actions" }, actionButton(server, "start")) : undefined
      })
    ),
    ...(epic ? openRows(epic) : [])
  ]
  return rows.length ? rowList(rows, { plain: true }) : undefined
}

/** what an epic's worktree holds that main hasn't got, a row each */
function openRows(epic) {
  return [
    epic.ahead
      ? listRow({ plain: true, words: "Not merged into main yet", count: counted(epic.ahead, "commit"), isLoud: true })
      : listRow({ plain: true, words: "Everything is merged into main", isQuiet: true }),
    epic.phase && listRow({ plain: true, words: `Working on ${epic.phase}`, tip: epic.phase }),
    epic.open && listRow({ plain: true, words: epic.open }),
    epic.agents && listRow({ plain: true, words: "Agents working", count: counted(epic.agents, "agent") }),
    epic.turn && listRow({ plain: true, words: `Running its ${epic.turn} turn now` })
  ].filter(Boolean)
}

// only on the page:  its tests import this file for its pure parts
if (typeof document !== "undefined" && document.getElementById("servers-page")) {
  void look()
  setInterval(() => void look(), LOOK_SECONDS * 1000)
  document.addEventListener("visibilitychange", () => void look())
}
