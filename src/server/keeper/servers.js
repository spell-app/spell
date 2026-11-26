/**
 * The Spell Servers page's script (`servers.html`, epic `editor` P49):  draws the server keeper's `/api/servers` as a
 * card per server, and asks again every 2 seconds while the page shows.
 * - Each card:  its name (the link), its state as an icon and a word, how long it's been up, what it's building, and
 *   its last 50 log lines in a fold (`/api/servers/log?id=<id>`, read while the fold is open);  Restart, or Start
 * - Grouped by checkout:  each repo's main checkout, then each worktree, `⎇ <worktree>`
 * - Spell UI from the docs pages' bundle (`SPELL_KEEPER.uiScript`, served by the keeper);  without it, or when it
 *   doesn't load in `UI_WAIT_MS`, a plain table with the same facts
 * - Cards are made once each and brought up to date in place, so an open fold stays open;  which folds are open is
 *   kept in the browser, by server
 * - Plain DOM, no imports:  the keeper serves it as it is.  Built with `document.createElement()`, never markup in strings.
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
  log: "Its recent messages (the last 50 lines of its log)",
  noLog: "Nothing in its log yet.",
  building: "Building {what}",
  upFor: "Up for {time}",
  notRunning: "Not running",
  failed: "That didn't work:  {why}"
}

/** The page's settings, from the keeper */
const KEEPER = globalThis.SPELL_KEEPER ?? {}

/** the open folds, by server id, kept in the browser */
const FOLDS_KEY = "spell-servers-open-logs"

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

/** the checkout a server belongs to, as its group's heading:  `spell`, `⎇ editor`;  the keeper's own:  `This Mac` */
export function groupOf(server) {
  if (server.worktree) return `⎇ ${server.worktree}`
  return server.repo || "This Mac"
}

/** the servers in groups, in the keeper's order:  `[[heading, servers]]` */
export function grouped(servers) {
  const groups = new Map()
  for (const server of servers) {
    const heading = groupOf(server)
    if (!groups.has(heading)) groups.set(heading, [])
    groups.get(heading).push(server)
  }
  return [...groups]
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

/** the last lines of server `id`'s log */
async function logOf(id) {
  try {
    const response = await fetch(`/api/servers/log?id=${encodeURIComponent(id)}`, { cache: "no-store" })
    return response.ok ? (await response.json()).lines : []
  } catch {
    return []
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
// ## Folds kept
////////////////

/** the ids whose log fold is open */
function openFolds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(FOLDS_KEY) ?? "[]"))
  } catch {
    return new Set()
  }
}

/** SIDE EFFECT:  server `id`'s fold kept open or closed */
function keepFold(id, isOpen) {
  const open = openFolds()
  if (isOpen) open.add(id)
  else open.delete(id)
  try {
    localStorage.setItem(FOLDS_KEY, JSON.stringify([...open]))
  } catch {
    // no storage here:  the fold's state lasts as long as the page
  }
}

////////////////
// ## Drawing:  Spell UI
////////////////

/** the page's cards, brought up to date from `answer` */
function drawCards(answer) {
  const page = document.getElementById("servers-page")
  const groups = grouped(answer.servers)
  const seen = new Set()
  const sections = []
  for (const [heading, servers] of groups) {
    const cardList = el("div", { className: "servers-cards" })
    for (const server of servers) {
      seen.add(server.id)
      const card = cards.get(server.id) ?? newCard(server)
      cards.set(server.id, card)
      updateCard(card, server)
      cardList.append(card.root)
    }
    sections.push(el("h2", {}, heading), cardList)
  }
  for (const id of cards.keys()) if (!seen.has(id)) cards.delete(id)
  page.replaceChildren(...sections)
}

/** a server's card, its parts kept to bring up to date */
function newCard(server) {
  const name = el("span", { className: "servers-name" })
  const state = el("ui-label", { size: "small" })
  const facts = el("p", { className: "servers-facts" })
  const actions = el("div", { className: "servers-actions" })
  const log = el("pre", {})
  const fold = el(
    "ui-section",
    {
      className: "servers-log",
      label: WORDS.log,
      level: 4,
      size: "small",
      collapsible: true,
      open: String(openFolds().has(server.id))
    },
    log
  )
  const root = el(
    "ui-card",
    { className: "servers-card", fluid: true },
    el("ui-content", {}, el("div", { className: "servers-card-head" }, name, state), facts, actions, fold)
  )
  const card = { root, name, state, facts, actions, log, fold, id: server.id, drawn: "" }
  // the fold opened:  its log read at once;  kept open across reloads
  const onFold = () => {
    const isOpen = isFoldOpen(fold)
    keepFold(server.id, isOpen)
    if (isOpen) void showLog(card)
  }
  new MutationObserver(onFold).observe(fold, { attributes: true, attributeFilter: ["open"] })
  return card
}

/** `card` brought up to date for `server` */
function updateCard(card, server) {
  const look = STATES[server.state] ?? STATES.down
  const link = server.address ? el("a", { href: server.address, target: "_blank" }, server.name) : server.name
  card.name.replaceChildren(link)
  card.state.replaceChildren(
    el("ui-icon", { name: look.icon, loading: look.loading, "aria-hidden": "true" }),
    look.words
  )
  card.state.setAttribute("color", look.color)
  card.facts.textContent = factsOf(server)
  const action = actionOf(server)
  const drawn = `${action}:${server.state}`
  if (card.drawn !== drawn) {
    card.drawn = drawn
    card.actions.replaceChildren(...(action ? [actionButton(server, action)] : []))
  }
  card.server = server
  if (isFoldOpen(card.fold)) void showLog(card)
}

/** whether a `<ui-section>` fold is open:  its `open` property, else its attribute (`open="false"` closed) */
function isFoldOpen(fold) {
  return typeof fold.open === "boolean" ? fold.open : fold.getAttribute("open") !== "false"
}

/** a Restart or Start button for `server` */
function actionButton(server, action) {
  const words = WORDS[action]
  const button = el("ui-button", {
    size: "small",
    appearance: "basic",
    icon: action === "restart" ? "rotate right" : "play",
    "data-tooltip": fill(WORDS[`${action}Tip`], { name: server.name })
  })
  button.append(words)
  button.addEventListener("click", () => void onAction(button, server, action))
  return button
}

/** `card`'s log fold filled with the last lines of its log */
async function showLog(card) {
  const lines = await logOf(card.id)
  card.log.textContent = lines.length ? lines.join("\n") : WORDS.noLog
}

////////////////
// ## Drawing:  a plain table
////////////////

/** the plain table, drawn again from `answer`:  without Spell UI */
function drawTable(answer) {
  const page = document.getElementById("servers-page")
  const open = openFolds()
  const rows = answer.servers.map((server) => {
    const look = STATES[server.state] ?? STATES.down
    const action = actionOf(server)
    const button = action ? el("button", { type: "button" }, WORDS[action]) : ""
    if (action) button.addEventListener("click", () => void onAction(button, server, action))
    const log = el("details", { open: open.has(server.id) }, el("summary", {}, WORDS.log), el("pre", {}))
    log.addEventListener("toggle", () => {
      keepFold(server.id, log.open)
      if (log.open) void logOf(server.id).then((lines) => (log.lastChild.textContent = lines.join("\n") || WORDS.noLog))
    })
    if (log.open) void logOf(server.id).then((lines) => (log.lastChild.textContent = lines.join("\n") || WORDS.noLog))
    const name = server.address ? el("a", { href: server.address, target: "_blank" }, server.name) : server.name
    return el(
      "tr",
      {},
      el("td", {}, groupOf(server)),
      el("td", {}, name),
      el("td", {}, look.words),
      el("td", { className: "servers-facts" }, factsOf(server)),
      el("td", {}, button),
      el("td", {}, log)
    )
  })
  const head = el("tr", {}, ...["Where", "Server", "State", "", "", ""].map((words) => el("th", {}, words)))
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

/** the page started:  Spell UI, then an ask every `ASK_MS` while it shows */
async function start() {
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

if (document.getElementById("servers-page")) void start()
