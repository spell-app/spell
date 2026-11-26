/**
 * The worktree names page's script (`names.html`, `HostRoutes`;  epic `editor` P49).
 * - starting:  "Starting <name>…", asking `/_spell/names` every second, and loading the page once its server answers
 * - unknown:  the worktrees, each one's name a link to its address, and its editor's beside it
 * - Spell UI when the page server names its script (`SPELL_NAMES.uiScript`);  plain HTML without it
 * - Plain DOM, no imports:  the page server puts it in the page as it is.  Never markup in strings.
 */

/** The page's settings, from the page server:  `{ name, state, uiScript? }` */
const NAMES = globalThis.SPELL_NAMES ?? {}

/** The page's words, in the novice voice */
const WORDS = {
  starting: "Opening {name}…",
  startingWhy:
    "Spell is getting this copy of your work ready.\nThe page opens by itself in a moment.\nIf it doesn't, reload this page.",
  unknown: "No copy is called {name}",
  unknownWhy: "Each copy of your work has its own name, and {name} isn't one of them.\nChoose a copy to open it:",
  none: "There are no other copies of your work yet.",
  pages: "its pages",
  editor: "its editor",
  running: "open now",
  stopped: "opens in a moment"
}

/** the element `tag`, with `attributes` and `children` */
function el(tag, attributes = {}, ...children) {
  const element = document.createElement(tag)
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined || value === false) continue
    element.setAttribute(name, value === true ? "" : String(value))
  }
  for (const child of children.flat()) if (child !== undefined) element.append(child)
  return element
}

/** `text` with `{name}` filled */
function fill(text) {
  return text.replaceAll("{name}", NAMES.name ?? "")
}

/** the worktrees and how they stand;  none when the server doesn't answer */
async function names() {
  try {
    const response = await fetch("/_spell/names", { cache: "no-store" })
    return response.ok ? await response.json() : []
  } catch {
    return []
  }
}

/** the page while a worktree starts:  it loads once its page server answers */
function drawStarting() {
  const page = document.getElementById("names-page")
  const loader = NAMES.uiScript ? el("ui-loader", { active: true, inline: true, size: "small" }) : undefined
  page.replaceChildren(
    el("h1", {}, loader ?? "", loader ? " " : "", fill(WORDS.starting)),
    el("p", { class: "names-muted" }, WORDS.startingWhy)
  )
  const look = async () => {
    const found = (await names()).find((each) => each.name === NAMES.name)
    if (found?.running) location.reload()
    else setTimeout(look, 1000)
  }
  setTimeout(look, 1000)
}

/** the page for a name nobody has:  every worktree, a link each */
async function drawUnknown() {
  const page = document.getElementById("names-page")
  const all = await names()
  const items = all.map((each) =>
    el(
      "li",
      {},
      el("strong", {}, each.name),
      ":  ",
      el("a", { href: each.address }, WORDS.pages),
      ", ",
      el("a", { href: each.editor }, WORDS.editor),
      el("span", { class: "names-muted" }, ` (${each.running ? WORDS.running : WORDS.stopped})`)
    )
  )
  page.replaceChildren(
    el("h1", {}, fill(WORDS.unknown)),
    el("p", { class: "names-muted" }, all.length ? fill(WORDS.unknownWhy) : WORDS.none),
    el("ul", { class: "names-list" }, items)
  )
}

if (NAMES.uiScript) document.body.append(el("script", { src: NAMES.uiScript }))
if (NAMES.state === "starting") drawStarting()
else void drawUnknown()
