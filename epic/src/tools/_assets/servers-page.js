/**
 * The Servers tab's page script (`servers-page.html`, epic `epic-engine` P82, T162):  draws `/api/servers` (Spell's
 * server keeper's answer, and the epic tooling's own facts beside it:  `ServersAnswer`) as Spell UI elements, and asks
 * again every 10 seconds while the page shows.
 * - SPELL'S SERVERS PAGE for the cards (epic `epic-engine` P85, epic `editor` P49):  while the answer names it
 *   (`keeperPage`, on the keeper's own port), the page frames it under main's heading (`keeperFrame()`):  a card per
 *   server, main's and every worktree's, with their logs and Restart;  the frame made once, and as tall as the page
 *   inside says (`spellServersHeight`), so it never scrolls;  the tab's own cards below are drawn only without it
 * - The page, top to bottom, nothing folding:
 *   - the HANDS-OFF switch (`handsOffSwitch()`, T164):  on, the keeper leaves main's servers alone, and a notice
 *     under it says so plainly
 *   - "main", with Restart all at its right (the page server and editor together, `restartAllButton()`, T164):  a card
 *     per server of the main checkout (the hub, the page server, the editor, a repo's own);  the page server's card
 *     has the secure link's switch, HTTPS on the page servers, as the lock before its address (`httpsButton()`, epic
 *     `epic-engine` T164, I454, I456:  a card of its own before, which read as if every server had HTTPS;  then a
 *     second lock among its buttons)
 *   - "Merged into main recently":  the branches that landed on main, newest first (`ServerFacts.mergedIntoMain()`),
 *     a row each in columns, and last, quieter, a row per repo for main's commits not on GitHub yet
 *   - each epic's worktree, `⎇ <worktree>`, the one worked on last first, how long ago beside its name:  a card per
 *     server it has, then what it holds that main hasn't got
 * - Each card:  the server's name, a link, and its address under it ("Not running" while it isn't, T164);  its state
 *   on the right as one icon, and under it its buttons, icons only, a tight group;  three a row at most, fewer as the
 *   page narrows (epic `epic-engine` I449, I451, I456).
 * - Built with `document.createElement()`, never markup in strings;  every control a `<ui-button>`.
 * - Show in the editor, at the right of a checkout's heading (main's, or a worktree's), where its repo has projects of
 *   its own (`answer.editorSpaces`, `editorChoices()`):  POSTs `/api/servers/editor-spaces`, `{ repo, worktree? }`,
 *   so the editor at :3000 shows that checkout's projects;  the checkout it shows now says "In the editor" instead
 * - Start, Restart and Stop POST `/api/servers/<action>` with this page's write token (`SPELL_SERVER.token`);  the
 *   page server hands them on to the hub (`serverRoutes`).
 * - Plain DOM, no imports:  the page loads it as it is, beside the docs bundle;  so `ago()` is its own.
 *   - Its pure parts are exported for its tests (`worktreeOrder()`, `inCardOrder()`, `firstClause()`, `editorChoices()`, `httpsToggle()`, `withSecureAddress()`,
 *     `addressLine()`, `stateLook()`);  it starts only on its page.
 * - Its own timer, not the kit's `pollWhileVisible()`:  that's for bundled code, and this page has no bundle of its own;
 *   the same rule, by hand:  no look while the page is hidden, one as soon as it shows again.
 */

/** How often the page asks, seconds, when the answer doesn't say (`lookSeconds`). */
const LOOK_SECONDS = 10

/**
 * What each state is drawn as:  one icon, its colour, its words in its tooltip (epic `epic-engine` I456:  a pill
 * saying "Running" ate into the card's name)
 * - each icon is one the docs bundle registers (`ICONS` in `bundle-spell-ui.js`):  no other draws
 */
const STATES = {
  running: { words: "Running", icon: "circle check", color: "green" },
  starting: { words: "Starting", icon: "circle notch", color: "blue", loading: true },
  stopped: { words: "Stopped", icon: "circle outline", color: "grey" },
  down: { words: "Down", icon: "triangle exclamation", color: "red" }
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
 * - an editor comes with its page server:  main's is restarted through it, a worktree's restarts with it
 */
const NO_STOP = {
  editor: "The editor runs inside its page server.\nStop that server to stop the editor."
}

/** Why a server has no Restart, by server name;  none named:  the general reason */
const NO_RESTART = {
  editor: "This editor runs inside its page server.\nRestart that server to restart the editor."
}

/**
 * The page server's secure link (`HttpsStatus.state`), as its HTTPS switch's tooltip starts (novice voice, checked)
 * - only the page servers have it:  the editor and the hub use plain links (epic `epic-engine` I454)
 */
const HTTPS_STATES = {
  on: { tip: "Secure link (HTTPS) is on.\nYour browser opens these pages faster, over HTTP/2." },
  off: { tip: "Secure link (HTTPS) is off.\nThese pages open unencrypted." },
  "needs-trust": { tip: "Secure link (HTTPS) is set up, but your Mac hasn't approved it yet." },
  "out-of-date": { tip: "Secure link (HTTPS) has expired." }
}

/** The HTTPS switch's accessible name, and what a click does */
const HTTPS_ACTIONS = {
  on: {
    label: "Turn on the secure link",
    tip: "Click to turn it on.\nYour Mac will ask for your password once, so it trusts this secure link."
  },
  off: {
    label: "Turn off the secure link",
    tip: "Click to turn it off.\nThe pages still open, but unencrypted and a little slower."
  }
}

/** The lock before a page server's address while it has the secure link */
const SECURE_ADDRESS = "This page server uses the secure link (HTTPS)"

/** The card the HTTPS switch rides on:  main's page server */
const PAGE_SERVER = "page server"

/** What's said while the Mac's password window is open. */
const HTTPS_ASKING =
  "Your Mac is asking for your password, to approve the secure link.\nType it in the box that just appeared."

/** The hands-off switch's label, and what's said while it's on (novice voice, checked) */
const HANDS_OFF_LABEL = "I'm working on the servers myself.  Spell should leave them alone until I turn this off."
const HANDS_OFF_NOTICE =
  "Spell won't start, stop or restart your servers under main by itself until you turn the switch off.\n" +
  "The buttons on each card still work."

/** What a card says under its name while its server isn't running (Owen, T164:  its description wasn't helpful) */
const NOT_RUNNING = "Not running"

/** what the page says where the worktrees go, while none is active (epic `epic-engine` J369) */
const NO_ACTIVE_WORKTREES = "No worktrees are in use right now."

/** Restart all's tooltip */
const RESTART_ALL_TIP =
  "Restart the page server and the editor together, so both use your latest changes.\nYour pages reload by themselves."

/** Show in the editor's words, its tooltip, and what the checkout the editor shows now says (novice voice, checked) */
const SHOW_IN_EDITOR = "Show in the editor"
const SHOW_IN_EDITOR_TIP = (name) =>
  `Opens the projects from the ${name} copy in the editor, so you can try them out.\n` +
  "The editor closes and opens again, which takes a moment.\n" +
  "Save your work in the editor first, or you may lose changes you haven't saved."
const IN_EDITOR = "In the editor"
const IN_EDITOR_TIP = (name) => `The editor is showing the projects from the ${name} copy now.`
const SHOW_FAILED = (name) => `Couldn't open ${name} in the editor`
const SHOW_FAILED_AFTER =
  "The editor still shows what it showed before.\nWait a moment and press Show in the editor again."

/** How long Restart all spins:  about as long as a restart takes, ms */
const RESTART_ALL_WAIT_MS = 5000

/** What's said once it's on:  where to open the pages */
const HTTPS_ON = (address) =>
  `Your pages reload to use it, which takes a moment.\nFrom now on, open them at ${address ?? "https://localhost:4747/"}`

/** How each kind of last work is said (`WorktreeWorked.by`):  `last commit 3 weeks ago` */
const WORKED_WORDS = { commit: "last commit", change: "last change", page: "last worked on" }

/** The glyph a worktree's name wears, as every window title and page does. */
const WORKTREE = "⎇"

/** How often a look that failed asks again, and how long it keeps quiet before saying there's a problem, seconds. */
const RETRY_SECONDS = 2
const GIVE_UP_SECONDS = 30

/** What's said while the page waits for the servers to answer again (novice voice, checked) */
const RECONNECTING = "Your servers are restarting.\nThis page reconnects by itself in a few seconds."
const CANT_SEE = "The servers haven't answered for a while.\nThis page keeps trying, so you can leave it open."

/** when looks started failing, ms;  none while they answer */
let failingSince

/** whether a look is under way */
let isLooking = false

/** whether the secure link is being turned:  a look leaves the message saying so */
let isTurning = false

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

/**
 * ask the keeper, and draw what it says
 * - a failure rides out a hub handing over to a fresh one, or a page server restarting (epic `epic-engine` I455):
 *   it asks again every `RETRY_SECONDS`, the page as it was, a calm "Reconnecting…" at most;  only past
 *   `GIVE_UP_SECONDS` without an answer does it say there's a problem
 */
async function look() {
  if (isLooking || document.visibilityState === "hidden") return
  isLooking = true
  try {
    const response = await fetch("/api/servers", { cache: "no-store" })
    const answer = await response.json()
    if (!response.ok) throw new Error(answer.error ?? `The server answered ${response.status}.`)
    failingSince = undefined
    if (!isTurning) sayProblem()
    draw(answer)
  } catch (error) {
    failingSince ??= Date.now()
    if (Date.now() - failingSince < GIVE_UP_SECONDS * 1000) sayProblem("Reconnecting…", RECONNECTING, "info")
    else sayProblem("Can't see the servers right now", `${CANT_SEE}\n(${error.message})`)
    setTimeout(() => void look(), RETRY_SECONDS * 1000)
  } finally {
    isLooking = false
  }
}

/** a problem at the top, as a `<ui-message>` (`state`:  `info` for news that's no problem);  none:  it goes */
function sayProblem(heading, words, state = "negative") {
  const place = document.getElementById("servers-problem")
  place.replaceChildren(...(heading ? [el("ui-message", { state, heading }, words)] : []))
}

/**
 * the whole page, from `answer`:  above Spell's Servers page (`keeperFrame()`) the switches and main's heading,
 * below it what merged into main and each active worktree's open work;  no `keeperPage`:  the tab's own cards
 */
function draw(answer) {
  const named = new Set(answer.servers.map((server) => server.repo).filter(Boolean)).size > 1
  const framed = keeperFrame(answer.keeperPage)
  const onMain = inCardOrder(answer.servers.filter((server) => !server.worktree))
  const mainHttps = framed && answer.https ? [httpsButton(answer.https)] : []
  document
    .getElementById("servers-page")
    .replaceChildren(
      handsOffSwitch(Boolean(answer.handsOff)),
      ...(answer.handsOff ? [el("ui-message", { state: "warning", heading: "Hands off" }, HANDS_OFF_NOTICE)] : []),
      heading("main", undefined, undefined, [
        ...mainHttps,
        ...(editorButtons(answer.editorSpaces, undefined, undefined, named) ?? []),
        restartAllButton()
      ]),
      ...(framed ? [] : [cards(onMain, named, answer.https)])
    )
  document
    .getElementById("servers-after")
    .replaceChildren(
      el("h3", { className: "servers-sub" }, "Merged into main recently"),
      mergedList(answer.mergedIntoMain ?? [], answer.notOnGitHub ?? [], named),
      ...worktreeGroups(answer, named, { framed })
    )
}

/**
 * Spell's Servers page in its frame, under main's heading (epic `epic-engine` P85):  made once, its address changed
 * only when the keeper's does, so it never reloads between looks;  whether it's shown
 * - as tall as the page inside says (`spellServersHeight`, posted as it changes):  a cross-origin frame can't be
 *   measured from here
 * - light or dark as this page is (`?scheme=`)
 */
function keeperFrame(address) {
  const place = document.getElementById("servers-keeper")
  if (!place) return false
  if (!address) {
    place.replaceChildren()
    return false
  }
  let frame = place.querySelector("iframe")
  if (!frame) {
    frame = el("iframe", { className: "servers-keeper-frame", title: KEEPER_FRAME_TITLE })
    place.replaceChildren(frame)
  }
  // light or dark as this page is drawn (Spell UI's theme, not the system's):  the frame's own background goes
  const scheme = getComputedStyle(document.documentElement).colorScheme.includes("dark") ? "dark" : "light"
  const source = `${address}?scheme=${scheme}`
  if (frame.dataset.source !== source) {
    frame.dataset.source = source
    frame.src = source
  }
  return true
}

/** The frame's name, for a screen reader. */
const KEEPER_FRAME_TITLE = "Spell's servers, a card each"

// the framed page's height, as it tells it
if (typeof window !== "undefined")
  window.addEventListener("message", (event) => {
    const height = Number(event.data?.spellServersHeight)
    const frame = document.querySelector(".servers-keeper-frame")
    if (!frame || event.source !== frame.contentWindow || !(height > 0)) return
    frame.style.height = `${Math.ceil(height)}px`
  })

/** a group's heading:  `main`, `⎇ atmosphere` (its epic page linked), a muted note after it, and its `tools` at the right */
function heading(words, url, note, tools) {
  return el(
    "h2",
    { className: `servers-head${tools ? " servers-head-tools" : ""}` },
    url ? el("a", { href: url }, words) : words,
    note ? el("span", { className: "servers-age" }, note) : undefined,
    tools ? el("span", { className: "servers-tools" }, tools) : undefined
  )
}

/**
 * the hands-off switch (epic `epic-engine` T164):  on, the keeper starts, stops and restarts nothing of main's by
 * itself, until it's turned off;  the cards' buttons and Restart all still work
 */
function handsOffSwitch(isOn) {
  const toggle = el("ui-checkbox", {
    className: "servers-hands-off",
    appearance: "toggle",
    label: HANDS_OFF_LABEL,
    selected: isOn
  })
  toggle.addEventListener("ui-changed", async (event) => {
    isTurning = true
    try {
      const response = await fetch("/api/servers/hands-off", {
        method: "POST",
        headers: { "content-type": "application/json", "x-server-token": window.SPELL_SERVER?.token ?? "" },
        body: JSON.stringify({ on: Boolean(event.detail?.selected) })
      })
      const answer = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(answer.error ?? `The server answered ${response.status}.`)
      sayProblem()
    } catch (error) {
      sayProblem("Couldn't change the switch", error.message)
    } finally {
      isTurning = false
      void look()
    }
  })
  return toggle
}

/**
 * main's Restart all (epic `epic-engine` T164):  every main page server restarted, its editor with it, one stopped by
 * hand too;  the keeper answers first, then restarts them, so the page loses its server for a moment
 */
function restartAllButton() {
  const button = el(
    "ui-button",
    { size: "tiny", appearance: "basic", icon: "rotate right", "data-tooltip": RESTART_ALL_TIP },
    "Restart all"
  )
  button.addEventListener("click", async () => {
    button.setAttribute("loading", "")
    try {
      const response = await fetch("/api/servers/restart-all", {
        method: "POST",
        headers: { "content-type": "application/json", "x-server-token": window.SPELL_SERVER?.token ?? "" },
        body: "{}"
      })
      const answer = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(answer.error ?? `The server answered ${response.status}.`)
    } catch (error) {
      sayProblem("Couldn't restart the servers", error.message)
    } finally {
      // the restart comes just after the answer:  the next looks show them coming back
      setTimeout(() => button.removeAttribute("loading"), RESTART_ALL_WAIT_MS)
      void look()
    }
  })
  return button
}

/**
 * The checkouts a heading offers to show in the editor (`ServersAnswer.editorSpaces`):  `worktree`'s, or main's (none
 * given), of each repo that has one, `repo` only where the epic names it;  each `{ repo, worktree?, served }`;  pure,
 * for the page's tests
 */
export function editorChoices(editorSpaces = [], worktree, repo) {
  return editorSpaces.flatMap((spaces) => {
    if (repo && spaces.repo !== repo) return []
    const checkout = spaces.checkouts.find((each) => each.worktree === worktree)
    return checkout ? [{ repo: spaces.repo, ...(worktree && { worktree }), served: checkout.served }] : []
  })
}

/** a heading's Show in the editor buttons (`editorButton()`);  none:  `undefined`, so the heading has no tools */
function editorButtons(editorSpaces, worktree, repo, named) {
  const buttons = editorChoices(editorSpaces, worktree, repo).map((choice) => editorButton(choice, named))
  return buttons.length ? buttons : undefined
}

/**
 * a heading's Show in the editor (`editorChoices()`):  the editor at :3000 shows that checkout's projects, after the
 * page servers restart;  the checkout it shows now:  "In the editor", a quiet label
 * - `named`:  the page names repos, so the button says whose
 */
function editorButton(choice, named) {
  const words = named ? `${choice.repo}:  ` : ""
  const name = choice.worktree ?? "main"
  if (choice.served)
    return el(
      "ui-label",
      { className: "servers-in-editor", size: "tiny", appearance: "basic", "data-tooltip": IN_EDITOR_TIP(name) },
      `${words}${IN_EDITOR}`
    )
  const button = el(
    "ui-button",
    {
      className: "servers-show-in-editor",
      size: "tiny",
      appearance: "basic",
      icon: "eye",
      "data-tooltip": SHOW_IN_EDITOR_TIP(name)
    },
    `${words}${SHOW_IN_EDITOR}`
  )
  button.addEventListener("click", async () => {
    button.setAttribute("loading", "")
    try {
      const response = await fetch("/api/servers/editor-spaces", {
        method: "POST",
        headers: { "content-type": "application/json", "x-server-token": window.SPELL_SERVER?.token ?? "" },
        body: JSON.stringify({ repo: choice.repo, ...(choice.worktree && { worktree: choice.worktree }) })
      })
      const answer = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(answer.error ?? `The server answered ${response.status}.`)
    } catch (error) {
      sayProblem(SHOW_FAILED(name), `${error.message}\n${SHOW_FAILED_AFTER}`)
    } finally {
      // the page server restarts just after the answer:  the next looks show it back, this checkout in the editor
      setTimeout(() => button.removeAttribute("loading"), RESTART_ALL_WAIT_MS)
      void look()
    }
  })
  return button
}

/**
 * a card per server, in a grid that fits the side bar and a phone;  none:  a line saying so
 * - `https`:  main's, HTTPS on the page servers (`HttpsStatus`), its switch on main's page server's card
 */
function cards(servers, named, https) {
  if (!servers.length) return el("p", { className: "servers-quiet" }, "No servers running.")
  return el(
    "div",
    { className: "servers-cards" },
    servers.map((server) =>
      serverCard(server, named, server.name === PAGE_SERVER && !server.worktree ? https : undefined)
    )
  )
}

/**
 * The page server's HTTPS switch, the lock before its address (epic `epic-engine` I454, I456):  pure, for the page's
 * tests
 * - on:  a closed lock;  a click turns it off
 * - off, or wanting the password, or expired:  an open lock;  a click turns it on, disabled saying why when it can't
 *   (no mkcert, not a Mac)
 * - its tooltip says what it is first, then what a click does
 */
export function httpsToggle(https) {
  const state = HTTPS_STATES[https.state] ?? HTTPS_STATES.off
  if (https.state === "on") return { turn: "off", icon: "lock", tip: `${state.tip}\n${HTTPS_ACTIONS.off.tip}` }
  const tip = `${state.tip}\n${HTTPS_ACTIONS.on.tip}`
  return https.canTurnOn
    ? { turn: "on", icon: "unlock", tip }
    : { turn: "on", icon: "unlock", tip, whyNot: `${state.tip}\n${https.whyNot ?? https.words}` }
}

/**
 * the HTTPS switch, the lock before main's page server's address (`httpsToggle()`, `addressLock()`);  `whyNot`:
 * disabled, saying why in its tooltip
 */
function httpsButton(https) {
  const { turn, icon, tip, whyNot } = httpsToggle(https)
  const button = el("ui-button", {
    className: "servers-https",
    size: "tiny",
    appearance: "basic compact",
    icon,
    "aria-label": HTTPS_ACTIONS[turn].label,
    disabled: Boolean(whyNot)
  })
  // a disabled button takes no pointer:  its tooltip goes on a box round it
  if (whyNot) return el("span", { className: "servers-why-not", "data-tooltip": whyNot }, button)
  button.dataset.tooltip = tip
  button.addEventListener("click", async () => {
    button.setAttribute("loading", "")
    isTurning = true
    if (turn === "on") sayProblem("Waiting for your password", HTTPS_ASKING, "info")
    try {
      const response = await fetch("/api/servers/https", {
        method: "POST",
        headers: { "content-type": "application/json", "x-server-token": window.SPELL_SERVER?.token ?? "" },
        body: JSON.stringify({ turn })
      })
      const answer = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(answer.error ?? `The server answered ${response.status}.`)
      if (answer.state === "on") sayProblem("The secure link is on", HTTPS_ON(answer.address), "positive")
      else sayProblem()
    } catch (error) {
      sayProblem(`Couldn't turn ${turn} the secure link`, error.message)
    } finally {
      isTurning = false
      button.removeAttribute("loading")
      void look()
    }
  })
  return button
}

/**
 * one server's card, two rows of two (epic `epic-engine` I451, I456):
 * - its name, a link to its address;  on the right, its state as one icon (`stateLook()`), its words the tooltip
 * - under the name, the address itself, small (what it's for, its tooltip);  before it, on a page server, the lock
 *   (`addressLock()`);  on the right, its buttons as icons, a tight group
 * - a button it hasn't got is drawn disabled, its tooltip saying why (`NO_STOP`, `NO_RESTART`), so every running
 *   card has the same icons in the same place
 */
function serverCard(_server, named, https) {
  const server = withSecureAddress(_server, https)
  const look = stateLook(server)
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
          "span",
          { className: "servers-state", "data-tooltip": look.tip },
          el("ui-icon", { name: look.icon, color: look.color, loading: look.loading, label: look.tip })
        ),
        el(
          "span",
          { className: "servers-address" },
          addressLock(server, https),
          el(
            "span",
            {
              className: "servers-address-words",
              "data-tooltip": (isRunning(server) ? server.what : server.why) || undefined
            },
            addressLine(server, address)
          )
        ),
        el("span", { className: "servers-actions" }, cardButtons(server))
      )
    )
  )
}

/**
 * a server's state as one icon (`STATES`), its words the tooltip:  `Running`, `Down:  <why>`;  pure, for the page's
 * tests
 */
export function stateLook(server) {
  const state = STATES[server.state] ?? STATES.down
  return { ...state, tip: server.why ? `${state.words}:  ${server.why}` : state.words }
}

/**
 * the lock before a page server's address (epic `epic-engine` I456:  "Why are there two lock icons?")
 * - main's page server (`https` given):  the secure link's switch itself (`httpsButton()`), closed while on
 * - a worktree's on its https address:  a plain lock, saying so
 * - any other server:  none
 */
function addressLock(server, https) {
  if (https) return httpsButton(https)
  if (isRunning(server) && /^https:/.test(server.address ?? ""))
    return el("ui-icon", {
      className: "servers-lock",
      name: "lock",
      label: SECURE_ADDRESS,
      "data-tooltip": SECURE_ADDRESS
    })
  return undefined
}

/**
 * `server` at its secure address while the secure link is on (`https.address`, `https://localhost:4747/`):  the keeper
 * names the page server by its plain one, which the same port answers too;  pure, for the page's tests
 */
export function withSecureAddress(server, https) {
  return https?.state === "on" && https.address && isRunning(server) ? { ...server, address: https.address } : server
}

/** the line under a card's name:  its address;  not running, saying so;  else what it's for */
export function addressLine(server, address = server.address) {
  return isRunning(server) ? (address ?? server.what ?? "") : NOT_RUNNING
}

/** whether `server` runs, or is starting:  neither stopped nor down */
function isRunning(server) {
  return server.state !== "stopped" && server.state !== "down"
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
    appearance: "basic compact",
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
 * each ACTIVE worktree:  its heading, its servers' cards (not while Spell's Servers page is framed:  it has them), then
 * what it holds that main hasn't got
 * - only the active ones (`isActiveWorktree()`);  the rest hidden, and none active, one calm line (epic `epic-engine`
 *   J369:  "inactive ones should be hidden")
 * - in the order the keeper sends them, the one worked on last first (`ServerFacts.newestFirst()`, epic `epic-engine`
 *   I449);  a worktree only a server names, after them, by name
 */
function worktreeGroups(answer, named, { framed = false } = {}) {
  const active = worktreeOrder(answer).filter(isActiveWorktree)
  if (!active.length) return [el("p", { className: "servers-quiet" }, NO_ACTIVE_WORKTREES)]
  return active.flatMap(({ worktree, epic, servers }) => {
    // framed:  Spell's Servers page draws every worktree's cards
    const shown = framed ? [] : worktreeCards(servers)
    return [
      heading(
        `${WORKTREE} ${named && epic?.repo ? `${epic.repo} ` : ""}${worktree}`,
        epic?.url,
        workedWords(epic),
        editorButtons(answer.editorSpaces, worktree, epic?.repo, named)
      ),
      ...(shown.length ? [cards(shown, named)] : []),
      openStuff(epic)
    ].filter(Boolean)
  })
}

/**
 * Whether the page lists a worktree (`worktreeOrder()`'s group):  something is going on in it now
 * - any of its servers runs (starting, or down, counts:  as `worktreeCards()`)
 * - a Claude session for its epic is mid-turn (`busy`), its agents work (`agents`), it holds a turn (`turn`), or a
 *   phase is under way (`phase`)
 * - NOT a session merely open in a tab, idle (epic `epic-engine` J369)
 * - NOT commits waiting to merge alone:  a worktree untouched for weeks may hold hundreds
 * - pure:  the page's tests call it
 */
export function isActiveWorktree({ epic, servers }) {
  if (worktreeCards(servers).length) return true
  return Boolean(epic && (epic.busy || epic.agents || epic.turn || epic.phase))
}

/**
 * A worktree's cards:  every one of its servers while any of them runs, each with its own state;  none while none does
 * - so a worktree with nothing running shows no "stopped" line, and one with its page server up shows its editor's
 *   card too, stopped or not (epic `epic-engine` I465)
 * - "runs":  anything but stopped (starting, or down, counts:  it's trying)
 * - pure:  the page's tests call it
 */
export function worktreeCards(servers) {
  return servers.some((server) => server.state !== "stopped") ? servers : []
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
 * the worktree's rows, as the merged list:  what it holds that main hasn't got:  its commits first, then its phase,
 * items, agents, turn
 * - no row for a stopped server:  its card says so, or the worktree has none (`worktreeCards()`, I465)
 */
function openStuff(epic) {
  const rows = epic ? openRows(epic) : []
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
