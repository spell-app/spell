/**
 * The Spell Servers page's script (`servers.html`, epic `editor` P49):  draws the server keeper's `/api/servers` as a
 * card per server, and asks again every 2 seconds while the page shows.
 * - Each card, ONE compact row, three a row (epic `editor` I374, as the epic hub's Servers tab drew them before
 *   `epic-engine` P85):  its name (the link), Restart or Start as an icon, and its state as a pill
 *   - what it's for, how long it's been up, what it's building, why it's down:  the name's tooltip (`factsOf()`)
 * - In sections (`sections()`):  "This Mac" (the keeper), each repo's main checkout ("Spell" for Spell's own), then
 *   "Epics", each worktree under it, `⎇ <worktree>`, the one used most recently first (`KeptServer.used`)
 * - Spell UI from the docs pages' bundle (`SPELL_KEEPER.uiScript`, served by the keeper);  without it, or when it
 *   doesn't load in `UI_WAIT_MS`, a plain table with the same facts
 * - Cards are made once each and brought up to date in place
 * - Plain DOM, no imports:  the keeper serves it as it is.  Built with `document.createElement()`, never markup in strings.
 *   - Its pure parts are exported for its tests (`sections()`, `factsOf()`, `upFor()`, `actionOf()`);  it starts only on its page.
 * - In a frame (the epic tooling's Servers tab shows it for its cards, epic `epic-engine` P85):  no title of its own,
 *   light or dark as the page around it says (`?scheme=`), and its height told to that page as it changes
 *   (`embedInFrame()`), so the frame never scrolls
 */

/** How often the page asks, ms. */
const ASK_MS = 2_000

/** How long the page waits for Spell UI before it draws the plain table, ms. */
const UI_WAIT_MS = 6_000

/** What each state is drawn as:  one icon (the docs bundle's), its colour, its word */
const STATES = {
  running: { words: "Running", icon: "circle check", color: "green" },
  starting: { words: "Starting", icon: "circle notch", color: "blue", loading: true },
  stopped: { words: "Stopped", icon: "circle outline", color: "grey" },
  down: { words: "Down", icon: "triangle exclamation", color: "red" }
}

/** The page's words, in the novice voice */
const WORDS = {
  cantReach: "The server keeper isn't answering.\nThis page checks again every few seconds, so you can leave it open.",
  restart: "Restart",
  start: "Start",
  restartTip: "Restart the {name}, so it runs your latest changes",
  startTip: "Start the {name}",
  thisMac: "This Mac",
  epics: "Epics",
  building: "Building {what}",
  upFor: "Up for {time}",
  notRunning: "Not running",
  failed: "That didn't work:  {why}"
}

/** The page's settings, from the keeper */
const KEEPER = globalThis.SPELL_KEEPER ?? {}

/** each server's card, by id, made once */
const cards = new Map()

/** whether Spell UI drew;  `false`:  the plain table */
let hasUi = false

/** the last answer, for the plain table's redraws */
let lastAnswer

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

/** `text` with each `{name}` filled from `values` */
function fill(text, values) {
  return text.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "")
}

/** how long since `iso`, in a few words:  `40 sec`, `12 min`, `3 h 5 min`, `2 days` */
export function upFor(iso, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  if (seconds < 60) return `${seconds} sec`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ${minutes % 60} min`
  const days = Math.floor(hours / 24)
  return `${days} ${days === 1 ? "day" : "days"}`
}

/** the lines under a card's name:  what it's for, up for how long and what it's building;  not running, why */
export function factsOf(server, now = Date.now()) {
  const isUp = server.state === "running" || server.state === "starting"
  const lines = server.what ? [server.what] : []
  if (isUp && server.started) lines.push(fill(WORDS.upFor, { time: upFor(server.started, now) }))
  if (server.building?.length) lines.push(fill(WORDS.building, { what: server.building.join(", ") }))
  if (!isUp) lines.push(WORDS.notRunning)
  if (server.why) lines.push(server.why)
  return lines.join("\n")
}

/** the checkout a server belongs to, as its group's heading:  `Spell`, `⎇ editor`;  the keeper's own:  `This Mac` */
export function groupOf(server) {
  if (server.worktree) return `⎇ ${server.worktree}`
  return server.repo ? repoTitle(server.repo) : WORDS.thisMac
}

/** a repo's name as a heading:  Spell's own is "Spell", a name, capitalised (Owen, I374);  any other as it's named */
export function repoTitle(repo) {
  return repo === SPELL_REPO ? "Spell" : repo
}

/** Spell's own repo, as the keeper names it */
const SPELL_REPO = "spell"

/**
 * the page's sections, top to bottom, each `{ heading, servers, level }`:  pure, for the page's tests
 * - "This Mac" and each repo's main checkout first, in the keeper's order (`level` 2)
 * - then "Epics" (`level` 2, no servers of its own) and each worktree under it (`level` 3), the one used most recently
 *   first:  the newest `used` among its servers (its page server's last request, else its last git work), then by name
 */
export function sections(servers) {
  const groups = new Map()
  for (const server of servers) {
    const heading = groupOf(server)
    if (!groups.has(heading)) groups.set(heading, { heading, servers: [], worktree: server.worktree, used: 0 })
    const group = groups.get(heading)
    group.servers.push(server)
    group.used = Math.max(group.used, server.used ? Date.parse(server.used) || 0 : 0)
  }
  const all = [...groups.values()]
  const mains = all.filter((group) => !group.worktree).map(({ heading, servers }) => ({ heading, servers, level: 2 }))
  const worktrees = all
    .filter((group) => group.worktree)
    .sort((one, other) => other.used - one.used || one.heading.localeCompare(other.heading))
    .map(({ heading, servers }) => ({ heading, servers, level: 3 }))
  return worktrees.length ? [...mains, { heading: WORDS.epics, servers: [], level: 2 }, ...worktrees] : mains
}

/** the button a server gets:  Restart while it runs, Start while it doesn't;  none when it can't start */
export function actionOf(server) {
  if (!server.canStart) return undefined
  const action = server.state === "running" || server.state === "starting" ? "restart" : "start"
  if (server.actions && !server.actions.includes(action)) return undefined
  return action
}

////////////////
// ## Asking the keeper
////////////////

/** the keeper's answer;  `undefined` when it doesn't answer */
async function ask() {
  try {
    const response = await fetch("/api/servers", { cache: "no-store" })
    return response.ok ? await response.json() : undefined
  } catch {
    return undefined
  }
}

/** `action` done to `server`, through the keeper;  throws with its words when it says no */
async function act(server, action) {
  const response = await fetch(`/api/servers/${action}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-server-token": KEEPER.token ?? "" },
    body: JSON.stringify({ checkout: server.checkout, server: server.name })
  })
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? response.statusText)
}

////////////////
// ## Drawing:  Spell UI
////////////////

/** the page's cards, brought up to date from `answer` */
function drawCards(answer) {
  const page = document.getElementById("servers-page")
  const seen = new Set()
  const parts = []
  for (const { heading, servers, level } of sections(answer.servers)) {
    parts.push(el(`h${level}`, {}, heading))
    if (!servers.length) continue
    const cardList = el("div", { className: "servers-cards" })
    for (const server of servers) {
      seen.add(server.id)
      const card = cards.get(server.id) ?? newCard()
      cards.set(server.id, card)
      updateCard(card, server)
      cardList.append(card.root)
    }
    parts.push(cardList)
  }
  for (const id of cards.keys()) if (!seen.has(id)) cards.delete(id)
  page.replaceChildren(...parts)
}

/** a server's card, one row:  its name, its button, its state;  its parts kept to bring up to date */
function newCard() {
  const name = el("span", { className: "servers-name", "data-position": "top left", "data-variation": "multiline" })
  const actions = el("span", { className: "servers-actions" })
  const state = el("ui-label", { className: "servers-state", size: "mini" })
  const root = el(
    "ui-card",
    { className: "servers-card", fluid: true },
    el("ui-content", {}, el("div", { className: "servers-card-row" }, name, actions, state))
  )
  return { root, name, state, actions, drawn: "" }
}

/** `card` brought up to date for `server` */
function updateCard(card, server) {
  const look = STATES[server.state] ?? STATES.down
  const link = server.address ? el("a", { href: server.address, target: "_blank" }, server.name) : server.name
  card.name.replaceChildren(link)
  card.name.setAttribute("data-tooltip", factsOf(server))
  card.state.replaceChildren(
    el("ui-icon", { name: look.icon, loading: look.loading, "aria-hidden": "true" }),
    look.words
  )
  card.state.setAttribute("color", look.color)
  const action = actionOf(server)
  const drawn = `${action}:${server.state}`
  if (card.drawn !== drawn) {
    card.drawn = drawn
    card.actions.replaceChildren(...(action ? [actionButton(server, action)] : []))
  }
}

/** an icon button that restarts or starts `server`, its words its tooltip and its name */
function actionButton(server, action) {
  const tip = fill(WORDS[`${action}Tip`], { name: server.name })
  const button = el("ui-button", {
    size: "tiny",
    appearance: "basic compact",
    icon: action === "restart" ? "rotate right" : "play",
    "aria-label": WORDS[action],
    "data-tooltip": tip
  })
  button.addEventListener("click", () => void onAction(button, server, action))
  return button
}

////////////////
// ## Drawing:  a plain table
////////////////

/** the plain table, drawn again from `answer`:  without Spell UI */
function drawTable(answer) {
  const page = document.getElementById("servers-page")
  const rows = answer.servers.map((server) => {
    const look = STATES[server.state] ?? STATES.down
    const action = actionOf(server)
    const button = action ? el("button", { type: "button" }, WORDS[action]) : ""
    if (action) button.addEventListener("click", () => void onAction(button, server, action))
    const name = server.address ? el("a", { href: server.address, target: "_blank" }, server.name) : server.name
    return el(
      "tr",
      {},
      el("td", {}, groupOf(server)),
      el("td", {}, name),
      el("td", {}, look.words),
      el("td", { className: "servers-facts" }, factsOf(server)),
      el("td", {}, button)
    )
  })
  const head = el("tr", {}, ...["Where", "Server", "State", "", ""].map((words) => el("th", {}, words)))
  page.replaceChildren(el("table", { className: "servers-table" }, el("thead", {}, head), el("tbody", {}, rows)))
}

////////////////
// ## Running
////////////////

/** a button's action, its button loading meanwhile;  a refusal shown */
async function onAction(button, server, action) {
  button.setAttribute("loading", "")
  button.disabled = true
  try {
    await act(server, action)
    showProblem()
  } catch (error) {
    showProblem(fill(WORDS.failed, { why: error.message }))
  } finally {
    button.removeAttribute("loading")
    button.disabled = false
  }
  await refresh()
}

/** the message above the cards:  `words`, or none */
function showProblem(words) {
  const box = document.getElementById("servers-problem")
  if (!words) return box.replaceChildren()
  const message = hasUi ? el("ui-message", { color: "red" }, words) : el("p", {}, words)
  message.style.whiteSpace = "pre-line"
  box.replaceChildren(message)
}

/** one ask, then the page drawn */
async function refresh() {
  const answer = await ask()
  if (!answer) return showProblem(WORDS.cantReach)
  if (lastAnswer === undefined || document.getElementById("servers-problem").textContent === WORDS.cantReach)
    showProblem()
  lastAnswer = answer
  if (hasUi) drawCards(answer)
  else drawTable(answer)
}

/** Spell UI loaded from the keeper (`SPELL_KEEPER.uiScript`):  whether it came in time */
async function loadUi() {
  if (!KEEPER.uiScript) return false
  const script = el("script", { src: KEEPER.uiScript })
  document.body.append(script)
  const loaded = new Promise((done) => script.addEventListener("load", done, { once: true }))
  const failed = new Promise((done) => script.addEventListener("error", () => done(false), { once: true }))
  const late = new Promise((done) => setTimeout(() => done(false), UI_WAIT_MS))
  if ((await Promise.race([loaded, failed, late])) === false) return false
  const ready = Promise.resolve(globalThis.SpellUI?.loading).then(() => customElements.whenDefined("ui-card"))
  return Promise.race([ready.then(() => true), late])
}

/**
 * SIDE EFFECT:  in a frame, the page marked `servers-embedded` (its title hidden) and its height posted to the page
 * around it whenever it changes, `{ spellServersHeight }`:  only a number, so any page may hear it
 */
function embedInFrame() {
  if (window.parent === window) return
  document.documentElement.classList.add("servers-embedded")
  // the page around it says its light or dark (`?scheme=`):  a frame of another scheme draws an opaque background
  const scheme = new URLSearchParams(location.search).get("scheme")
  if (scheme === "light" || scheme === "dark") document.documentElement.style.colorScheme = scheme
  // the body's own bottom, not the document's scroll height:  that never drops below the frame's, so it'd only grow
  const tell = () =>
    window.parent.postMessage({ spellServersHeight: Math.ceil(document.body.getBoundingClientRect().bottom) }, "*")
  new ResizeObserver(tell).observe(document.body)
  tell()
}

/** the page started:  Spell UI, then an ask every `ASK_MS` while it shows */
async function start() {
  embedInFrame()
  await refresh()
  hasUi = await loadUi()
  if (hasUi && lastAnswer) drawCards(lastAnswer)
  setInterval(() => {
    if (document.visibilityState === "visible") void refresh()
  }, ASK_MS)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refresh()
  })
}

// only on the page:  its tests import this file for its pure parts
if (typeof document !== "undefined" && document.getElementById("servers-page")) void start()
