import { Match, Show, Switch, createEffect, createSignal, getOwner, onSettled, runWithOwner, untrack } from "solid-js"

import { textChecksum } from "spell/util/string"
import type { LSP } from "spell/app/lsp"
import type { SP } from "spell/parser/spell"
import type { SiteHost } from "spell/parser/core/core.types"
import type { ThingExplorerState, TypeExplorerState } from "spell/app/app/ui/ui.types"
// Import directly, NOT through the `spell/app/spaces` barrel, which pulls in spell's parser
import { BUILD_STEP_PAGE_EVENT, type BuildStep } from "spell/app/spaces/models/buildSteps"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
// Import directly, NOT through the `spell/app/app/solid` barrel, which pulls in the editor
import { TypeExplorer } from "spell/app/app/solid/TypeExplorer"
import { ThingExplorer } from "spell/app/app/solid/ThingExplorer"
import { LazyPages } from "./LazyPages"
import { loadRuntime, type LoadedRuntime } from "./loadRuntime"
import { ViewerSiteHost } from "./ViewerSiteHost"
import { fetchJSON, fetchText } from "./fetchFresh"
import { watchBuild } from "./buildProgress"
import type { BuildProgress } from "spell/parser/spell/SpellUrls"
import { languagesOf, mergedWords, wordsAt, wordsOfLanguages } from "./words"
import {
  loadScopePack,
  scopesFromPacks,
  type CompiledDeclarations,
  type ScopesSource
} from "spell/app/lsp/ScopesSource"

import { RunnerPane, type RunnerTab, runnerSplit, DEFAULT_SPLIT } from "./RunnerPane"
import { RunnerConsole } from "./RunnerConsole"
import { layoutHasSpell, type SpellCompiled } from "./runner.types"

import "./SpellAppRunner.css"

/****************
 * ### `<SpellAppRunner>`
 * Runs one spell app in a page, inside `<spell-viewer>`'s shadow root:
 * an optional toolbar, the app, and a "debug" pane below it --
 * the Type Explorer, the Thing Explorer, and the program's console.
 * - Runs on its OWN copy of the spell runtime -- see `loadRuntime()` -- so many can run on a page at once.
 * - Runs `source`:
 *   - when the runtime's loaded
 *   - again when `source` changes (a NEW object)
 *   - and on Restart, which fetches the program afresh, so a recompiled one shows
 *     -- or runs `source.compiled` again, if set
 * - The program draws with Solid (`App.start()` mounts its own root, `core.mountApp()`):
 *   we only hand it `appRoot`, a `<div>` drawn once and never touched again.
 *   The app it mounted is unmounted with us.
 * - A program with NO app shows its console on top instead, and the explorers below.
 *   One that starts its app AFTER the run finished, e.g. from a timer, shows it once it draws.
 * - The Type Explorer is read-only, and shows only if there's a scope pack -- see `ScopesSource`.
 * - The Thing Explorer shows things' members in spell's words,
 *   if the program and what it imports have words files -- see `SP.SpellWords`.
 *   They're loaded afresh after each run, as its imports are.
 * - `debug` and `fluid` are read once, to start;  `runtimeUrl` once per copy loaded.
 * - Its `<ui-*>` tags are the caller's to define, with Fomantic's icon names:
 *   `<spell-viewer>` is a root that loads them as they appear;  the VS Code runner imports `spell/app/app/solid/loadUI`.
 * - While a program it fetches is made ready on the server, a box over it says each step, in words
 *   (`<ui-dimmer>` holding a `<ui-loader text>`;  epic `editor` P45):
 *   - shown only after `WAIT_BOX_DELAY_MSEC`, so a program that's built already never flashes it
 *   - "Reading your project…", then "Getting it ready…" as the page server says it compiles (`BUILD_STEP_PAGE_EVENT`),
 *     then "Starting it…" once the page has it, until it draws or runs
 *   - a project with mistakes that can't run:  says so, with a button opening it in the editor (`editUrl`)
 *   - on the run page, whose app fills the page, it reads as a loading screen
 * - A site it runs keeps its own address, and wears its theme:  one of Spell UI's, or its project's own
 *   (`ViewerSiteHost`);  the run page's keeps it in the page's URL (`siteHost`).
 * - NEVER imports `spell/parser/core`:  it'd land in the bundle's shared chunk, so every app would share it.
 *   Everything of spell's comes from this app's copy of the runtime.
 ****************/
export function SpellAppRunner(props: SpellAppRunnerProps) {
  // `run()` reads props from an effect's callback, and a conditional prop is a memo made on its first read:
  // in Solid 2 a memo made there needs an owner (`PRIMITIVE_IN_EFFECT_CALLBACK`, since rc.17)
  const owner = getOwner()
  /** A running site's host for a new run:  the page's own (`siteHost`), else one keeping its address to itself. */
  const newSiteHost = (): SiteHost => untrack(() => props.siteHost)?.() ?? new ViewerSiteHost()
  const [loaded, setLoaded] = createSignal<LoadedRuntime>()
  const [error, setError] = createSignal<string>()
  // Does the program draw an app?  Assume so until a run says.
  const [hasApp, setHasApp] = createSignal(true)
  const [debugOpen, setDebugOpen] = createSignal(!!untrack(() => props.debug))
  const [pane, setPane] = createSignal<DebugPane>(untrack(() => props.debug) ?? "explorer")
  const [split, setSplit] = createSignal(untrack(() => props.fluid) ? DEFAULT_DEBUG_HEIGHT : DEFAULT_SPLIT)
  const [scopes, setScopes] = createSignal<ScopesSource>()
  const [words, setWords] = createSignal<SP.SpellWordsData>()
  // the waiting box (`startWaiting()`):  the step it says, and whether it shows yet
  // - internal state, written as a run starts, which may be inside the effect that runs it (`ownedWrite`)
  const [waiting, setWaiting] = createSignal<WaitingStep | undefined>(undefined, { ownedWrite: true })
  const [waitShown, setWaitShown] = createSignal(false, { ownedWrite: true })
  /** what shows the waiting box, once `WAIT_BOX_DELAY_MSEC` has gone by */
  let waitTimer: ReturnType<typeof setTimeout> | undefined
  /** the page server said this run's project has mistakes (`BuildStep`):  a run that then fails says so */
  let hasMistakes = false
  // how the page server's compile is coming along, while the waiting box waits on it (`watchBuild()`):  its time so
  // far and the projects done, said in the box
  const [building, setBuilding] = createSignal<BuildProgress | undefined>(undefined, { ownedWrite: true })
  // the explorers' state, kept here so it outlives switching tabs:  each reads it once, as it mounts
  let explorerState: TypeExplorerState = {}
  let thingsState: ThingExplorerState = {}
  // compiled javascript of each project the last run loaded, by id -- for the Type Explorer's "Compiled Output"
  const compiledRef: CompiledRef = { current: new Map() }

  // what takes back the last run's layout spell -- see `bindLayout()`.
  // Declared up here:  a run may start before this function reaches its end.
  let unbindLayout: (() => void) | undefined
  /** What we ran last:  a new compile of the same program keeps its things;  an older run's late words aren't shown. */
  let lastSource: SpellAppSource | undefined

  // what takes back the last run's `in="header"` slots -- see `slotsFromIn()`.  Up here, as above.
  let unslot: (() => void) | undefined
  // a site's host:  its theme, and where it last went, for a run that keeps its things.  Up here, as above.
  let siteHost = newSiteHost()

  // NOTE: ALWAYS here, just hidden without an app -- so its mount point is never redrawn
  const appRoot = (<div class="App" />) as HTMLDivElement
  // a layout in markup is the app's drawing:  shown through a slot, its `to draw` not drawn (epic `drawable-thing` P9)
  const appPane = (
    <div class={["SpellAppApp", { hidden: !hasApp() && !props.layout }]}>
      <Show when={props.layout}>
        <slot />
      </Show>
      {appRoot}
    </div>
  )

  // this app's own copy of the runtime, for as long as we're here -- and its app, unmounted with us
  createEffect(
    () => props.runtimeUrl,
    (runtimeUrl) => {
      let copy: LoadedRuntime | undefined
      let gone = false
      loadRuntime(runtimeUrl).then(
        (it) => (gone ? it.release() : setLoaded((copy = it))),
        (problem: unknown) => setError(messageOf(problem))
      )
      return () => {
        gone = true
        unbindLayout?.()
        ;(appRoot as AppElement).spellRoot?.unmount()
        copy?.release()
      }
    }
  )

  // run the program -- once the runtime's loaded, and again for each new `source`:
  // a new compile of the same program keeps its things, e.g. the game in progress (epic `drawable-thing` P16)
  createEffect(
    () => [loaded(), props.source] as const,
    ([copy, source]) => {
      if (copy) void runWithOwner(owner, () => run(copy, source, "keep things"))
    }
  )

  // the Type Explorer's scopes, for each new `source`
  createEffect(
    () => [props.source, props.builtInsUrl] as const,
    ([source, builtInsUrl]) => {
      let gone = false
      void loadScopes(source, builtInsUrl, compiledRef).then((it) => gone || setScopes(it))
      return () => {
        gone = true
      }
    }
  )

  // each step of a project the page server makes ready:  the waiting box says this run's project's
  onSettled(() => {
    const listener = (event: Event) => {
      const { projectId, step } = (event as CustomEvent<BuildStep>).detail ?? {}
      if (!projectId || projectId !== untrack(() => props.source.projectId)) return
      if (step === "mistakes") hasMistakes = true
      else if ((step === "compiling" || step === "checking") && waiting() === "reading") setWaiting("compiling")
    }
    addEventListener(BUILD_STEP_PAGE_EVENT, listener)
    return () => {
      removeEventListener(BUILD_STEP_PAGE_EVENT, listener)
      clearTimeout(waitTimer)
    }
  })

  // An app started AFTER the run finished, e.g. from a timer, shows once it draws;  so does one still starting.
  onSettled(() => {
    const observer = new MutationObserver(() => {
      if (!appRoot.childElementCount) return
      setHasApp(true)
      // drawn:  the waiting box goes, though the program may still be starting (waiting on a sign-in, say)
      if (waiting() === "starting") {
        clearTimeout(waitTimer)
        setWaiting(undefined)
        setWaitShown(false)
      }
    })
    observer.observe(appRoot, { childList: true })
    return () => observer.disconnect()
  })

  props.onControls?.({ restart })

  return (
    <div class={["SpellApp", { fluid: props.fluid }]}>
      <Show when={props.toolbar}>
        <SpellAppToolbar
          name={props.source.name}
          error={error()}
          onRestart={restart}
          debugOpen={debugOpen()}
          onToggleDebug={() => setDebugOpen(!debugOpen())}
        />
      </Show>
      <Show when={!props.toolbar && error()}>
        <div class="SpellAppError">{error()}</div>
      </Show>
      <Show when={waitShown() && waiting()}>
        {(step) => <WaitingBox step={step()} editUrl={props.editUrl} name={props.source.name} progress={building()} />}
      </Show>
      <ui-split-panel
        class={["RunnerSplit", { byPixels: !!props.fluid }]}
        resizable
        {...runnerSplit(split(), props.fluid ? "px" : "%", setSplit)}
      >
        <div class="RunnerSplitTop">
          {appPane}
          <Show when={!hasApp()}>
            <RunnerPane tabs={[debugTab("console")]} pane="console">
              {output()}
            </RunnerPane>
          </Show>
        </div>
        <Show when={debugOpen()}>
          <div class="RunnerSplitBottom">
            <RunnerPane tabs={debugTabs().map(debugTab)} pane={showing()} onPane={setPane}>
              <Switch>
                <Match when={showing() === "explorer"}>{explorer()}</Match>
                <Match when={showing() === "things"}>{things()}</Match>
                <Match when={showing() === "console"}>{output()}</Match>
              </Switch>
            </RunnerPane>
          </div>
        </Show>
      </ui-split-panel>
    </div>
  )

  /** Tabs the debug pane has now -- no console without an app:  it's on top already. */
  function debugTabs(): DebugPane[] {
    return [...(scopes() ? ["explorer" as const] : []), "things" as const, ...(hasApp() ? ["console" as const] : [])]
  }

  /** Tab the debug pane shows:  the one chosen, if it has it, else its first. */
  function showing(): DebugPane {
    const tabs = debugTabs()
    return tabs.includes(pane()) ? pane() : tabs[0]!
  }

  /** Run the program again, afresh, on purpose:  a new deal (Q25) -- once the runtime's loaded. */
  function restart() {
    const copy = loaded()
    if (copy) void run(copy, props.source, "afresh")
  }

  /**
   * Run `source` in `copy` -- see `runProgram()` -- and show how it went.
   * - `keep things`:  when it's the program that ran last, its things carry over;  else it starts afresh.
   */
  async function run(copy: LoadedRuntime, source: SpellAppSource, how: "afresh" | "keep things") {
    unbindLayout?.()
    unbindLayout = undefined
    unslot?.()
    unslot = undefined
    // read props before waiting:  by then, whoever handed them to us may be gone (`<spell-viewer>` dropping its source)
    // - untracked:  it runs from an effect's second function, where a read follows nothing (`STRICT_READ_UNTRACKED`)
    const layout = untrack(() => props.layout)
    if (layout) unslot = slotsFromIn(layout)
    const keepThings = how === "keep things" && isSameProgram(lastSource, source)
    lastSource = source
    // fetched from the server, which may have to make it first (its words too):  the waiting box, if it takes a while,
    // saying how the compile is coming along
    if (source.compiled === undefined) startWaiting()
    const stopWatching =
      source.compiled === undefined && source.projectId ? watchBuild(source.projectId, setBuilding) : undefined
    try {
      await runAfterItsWords(copy, source, layout, keepThings)
    } finally {
      stopWatching?.()
    }
  }

  /** `run()`'s work, once it's ready:  its own words, then the program -- see `runProgram()`. */
  async function runAfterItsWords(
    copy: LoadedRuntime,
    source: SpellAppSource,
    layout: Element | undefined,
    keepThings: boolean
  ) {
    // its own words first:  their `messages` are what the core says as it runs, e.g. its tests' lines in Spanish
    // - awaited only when there are some to load:  else the last run's app goes at once, in the same tick, as before
    const own = source.words || !source.wordsUrl ? source.words : await ownWords(source)
    // a program in another language draws with that language's tags (`<es-boton>`):  Spell UI defines them first
    if (own?.lang && own.lang !== "en") {
      const { RootLoader } = await import("spell/ui/components/ui-root")
      // oxlint-disable-next-line react-hooks/rules-of-hooks -- Spell UI's `useLanguage()` is no React hook
      await RootLoader.useLanguage(own.lang)
    }
    if (!keepThings) siteHost = newSiteHost()
    const ran = await runProgram(copy, source, appRoot, {
      layout: !!layout,
      keepThings,
      messages: own?.messages,
      siteHost,
      onFetched: () => {
        // may run at once, inside the effect's second function that ran this:  what the box says now, not a read to follow
        if (untrack(waiting)) setWaiting("starting")
      }
    })
    if (source === lastSource) stopWaiting(ran)
    compiledRef.current = ran.compiled
    setError(ran.error)
    setHasApp(ran.hasApp)
    if (layout && !ran.error && layoutHasSpell(layout)) {
      bindLayout(copy, source, layout).then(
        (unbind) => (unbindLayout = unbind),
        (problem: unknown) => setError(messageOf(problem))
      )
    }
    const loaded = await loadWords(
      source,
      own,
      [...ran.compiled.keys()].filter((id) => id !== MAIN_PROJECT)
    )
    // a newer source's run may have started meanwhile:  its words are its own
    if (source === lastSource) setWords(loaded)
  }

  /** Start the waiting box for a run's program:  it shows only once `WAIT_BOX_DELAY_MSEC` has gone by. */
  function startWaiting() {
    clearTimeout(waitTimer)
    hasMistakes = false
    setWaiting("reading")
    waitTimer = setTimeout(() => setWaitShown(true), WAIT_BOX_DELAY_MSEC)
  }

  /**
   * The run's done:  the waiting box goes;
   * or, its project having mistakes and the run failing, it stays to say so, at once.
   */
  function stopWaiting(ran: Ran) {
    clearTimeout(waitTimer)
    if (ran.error && hasMistakes) {
      setWaiting("mistakes")
      setWaitShown(true)
    } else {
      setWaiting(undefined)
      setWaitShown(false)
    }
  }

  /** The Type Explorer, read-only, if there's a scope pack. */
  function explorer() {
    return (
      <Show when={scopes()} keyed>
        {(it) => (
          <TypeExplorer
            readonly
            tree={it.tree}
            loadDetails={it.details}
            onOpen={(href) => props.onOpen(href)}
            state={explorerState}
            onStateChange={(state) => (explorerState = state)}
          />
        )}
      </Show>
    )
  }

  /** The Thing Explorer, once the runtime's loaded. */
  function things() {
    return (
      <Show when={loaded()} keyed>
        {(copy) => (
          <ThingExplorer
            things={copy.runtime.core.things}
            words={words()}
            state={thingsState}
            onStateChange={(state) => (thingsState = state)}
          />
        )}
      </Show>
    )
  }

  /** The program's console, once the runtime's loaded. */
  function output() {
    return (
      <Show when={loaded()} keyed>
        {(copy) => <RunnerConsole console={copy.runtime.core.console} />}
      </Show>
    )
  }
}

/** Props for `<SpellAppRunner>`. */
export type SpellAppRunnerProps = {
  /**
   * What to run, and where its scope pack is -- from `<spell-viewer>`'s attributes, or pushed by an editor.
   * - Re-run when this is a NEW object -- see `SpellAppSource`.
   */
  source: SpellAppSource
  /** Show the toolbar? */
  toolbar: boolean
  /**
   * The element whose markup lays the app out, inside its `<spell-viewer>`:  the `<spell-viewer>` itself, if it has some.
   * - That markup shows, through a slot, and the app's `to draw` isn't drawn -- see `core.appLayout`.
   * - Its spell (holes, actions, `<spell>` blocks) is compiled in the page, after each run -- see `LayoutSpell`.
   */
  layout?: Element
  /** Open the debug pane to start, on this tab -- else it starts closed. */
  debug?: DebugPane
  /** As tall as it needs to be, NOT a fixed height -- see `runnerSplit()`'s `unit`. */
  fluid: boolean
  /** URL of `spell-runtime.js`, which each app loads a copy of. */
  runtimeUrl: string
  /** URL of the built-in types' scope pack, `core.scopes.js`. */
  builtInsUrl: string
  /**
   * A running site's host, made for each run that doesn't keep its things:  where its address lives.
   * - None:  `ViewerSiteHost`, the site's address its own, as in a `<spell-viewer>` on any page.
   * - The run page's keeps it in the page's URL (`RunSiteHost`).
   */
  siteHost?: () => SiteHost
  /** A Type Explorer link clicked, e.g. `spell:/@spell/examples/Solitaire/Solitaire.spell#L12`. */
  onOpen: (href: string) => void
  /** Hand over what the element can do to us, e.g. `restart()` -- every render. */
  onControls?: (controls: SpellAppControls) => void
  /** Where the project opens in the editor:  the waiting box's button, when it has mistakes;  none, no button. */
  editUrl?: string
}

/**
 * Where a `<spell-viewer>`'s program, and what's around it, come from --
 * worked out from its attributes, or from code a `<spell-editor>` pushed to it.  See `pushedSource()`.
 * - NOTE: `compiled`, `scopes`, `declarations` and `words` are in memory, the rest are URLs.
 *   An in-memory one wins over its URL.
 */
export type SpellAppSource = {
  /** Name for the toolbar, e.g. `Solitaire`. */
  name: string
  /**
   * Its project, e.g. `@spell/examples/solitaire`:  what its remembered props are kept under (`runCompiled()`).
   * - None:  nothing's remembered.
   */
  projectId?: string
  /**
   * URL of its compiled javascript.
   * - NOT fetched while `compiled` is set.  Still required:  every source has one, as a project's is its server's.
   */
  compiledUrl: string
  /** Its compiled javascript, in memory -- run instead of fetching `compiledUrl`, e.g. what an editor compiled. */
  compiled?: string
  /** URL of its scope pack, if it may have one. */
  scopesUrl?: string
  /** Its scope pack, in memory -- used instead of loading `scopesUrl`, e.g. fresh from an editor. */
  scopes?: LSP.ScopePack
  /** URL of its declarations, `<Project>.declarations.json5`, if it may have them:  where the Type Explorer finds code. */
  declarationsUrl?: string
  /** Its declarations, in memory -- used instead of loading `declarationsUrl`, e.g. fresh from an editor. */
  declarations?: CompiledDeclarations
  /** URL of the compiled javascript of project `projectId`, which it imports. */
  importUrl: (projectId: string) => string
  /**
   * URL of the javascript of the code file it imports as `module`, for `call native` (epic `from-console` P10):
   * a project's is its server's, `SpellUrls.codeFileUrl()`.
   * - None:  a program that calls one won't run, and says so (`runCompiled()`).
   */
  nativeUrl?: (module: string) => string
  /** URL of the declarations of project `projectId`, which it imports -- if it may have them. */
  importDeclarationsUrl?: (projectId: string) => string
  /**
   * URL of its words, `<Project>.en.js`, if it may have them:  the Thing Explorer's labels -- see `SP.SpellWords`.
   * - `{lang}` in it is each language its files are in, from its declarations:
   *   `<Project>.{lang}.js` => `Solitario.es.js`, and `Solitario.en.js` too for a project mixing them (epic `spanish` P19).
   */
  wordsUrl?: string
  /** Its words, in memory -- used instead of loading `wordsUrl`, e.g. fresh from an editor. */
  words?: SP.SpellWordsData
  /** URL of the words of project `projectId`, which it imports -- if it may have them;  `{lang}` as in `wordsUrl`. */
  importWordsUrl?: (projectId: string) => string
  /** URL of spell file `uri`, e.g. `spell:/@spell/examples/Solitaire/Solitaire.spell` -- if its sources can be had. */
  sourceUrl?: (uri: string) => string
}

/** What a `<spell-viewer>` can ask its runner to do. */
export type SpellAppControls = {
  /** Run the program again, afresh. */
  restart: () => void
}

/** Tab of the debug pane:  the Type Explorer, the Thing Explorer, or the program's console (`<spell-viewer debug>`). */
export type DebugPane = "explorer" | "things" | "console"

/****************
 * ### `<SpellAppToolbar>`
 * The app's name, Restart, the last run's error if it threw, then "Debug" at the right.
 ****************/
function SpellAppToolbar(props: SpellAppToolbarProps) {
  return (
    <ui-menu attach-to="top" size="small" class="SpellAppToolbar">
      <ui-item kind="header">{props.name}</ui-item>
      <ui-item appearance="link" icon="redo" class="restart" onClick={() => props.onRestart()}>
        {appTexts.text("restart")}
      </ui-item>
      <Show when={props.error}>
        <ui-item icon="warning sign" class="error">
          {props.error}
        </ui-item>
      </Show>
      <ui-menu position="right">
        <ui-item
          appearance="link"
          icon="bug"
          class="debug"
          selected={props.debugOpen}
          onClick={() => props.onToggleDebug()}
        >
          {appTexts.text("debug")}
        </ui-item>
      </ui-menu>
    </ui-menu>
  )
}

/****************
 * ### `<WaitingBox>`
 * The box over the app while its project is made ready to run:  a `<ui-dimmer>` holding a `<ui-loader>` with the
 * step's words;  or, with mistakes, a line saying so and a button opening it in the editor.
 ****************/
function WaitingBox(props: WaitingBoxProps) {
  return (
    <ui-dimmer visible="" inverted="" class="SpellAppWaiting">
      <Show
        when={props.step === "mistakes"}
        fallback={
          <ui-loader visible="" text="">
            {waitingWords(props)}
          </ui-loader>
        }
      >
        <div class="SpellAppMistakes" role="alert">
          <p>{appTexts.text("buildMistakes")}</p>
          <Show when={props.editUrl}>
            {(url) => (
              <ui-button icon="pencil" onClick={() => location.assign(url())}>
                {appTexts.text("buildMistakesOpen")}
              </ui-button>
            )}
          </Show>
        </div>
      </Show>
    </ui-dimmer>
  )
}

/**
 * What the waiting box's spinner says:  its step's words;  or, while the page server says how the compile is coming
 * along (`SP.BuildProgress`, e.g. a fresh checkout's first run), how long it's taken so far and the projects done.
 */
function waitingWords({ step, name, progress }: WaitingBoxProps): string {
  if (!progress || step === "starting") return appTexts.text(WAITING_TEXTS[step as Exclude<WaitingStep, "mistakes">])
  const params = { name, seconds: String(progress.seconds ?? 0) }
  const said = appTexts.text(progress.afterStartup ? "buildingAfterStartup" : "building", params)
  const done = (progress.compiled ?? []).map((id) => id.slice(id.lastIndexOf("/") + 1))
  return done.length ? `${said}  ${appTexts.text("buildingDone", { projects: done.join(", ") })}` : said
}

/** Props for `<WaitingBox>`. */
type WaitingBoxProps = {
  /** The step it says. */
  step: WaitingStep
  /** Where the project opens in the editor, for its mistakes;  none, no button. */
  editUrl?: string
  /** The program's name, for the compile's words. */
  name: string
  /** How the page server's compile is coming along, once it says (`watchBuild()`);  none, the step's words alone. */
  progress?: BuildProgress
}

/**
 * What the waiting box says:  the page server's steps (`BuildStep`), then the page's own, starting it.
 * - `compiling` stands for the server's `compiling` and `checking`:  "Getting it ready…" for both.
 */
type WaitingStep = "reading" | "compiling" | "starting" | "mistakes"

/** The words of each step the waiting box shows with its spinner. */
const WAITING_TEXTS: Record<Exclude<WaitingStep, "mistakes">, AppTextKey> = {
  reading: "buildStepReading",
  compiling: "buildStepCompiling",
  starting: "buildStepStarting"
}

/** How long a run waits before its waiting box shows:  a program that's built already never flashes it. */
const WAIT_BOX_DELAY_MSEC = 500

/** Props for `<SpellAppToolbar>`. */
type SpellAppToolbarProps = {
  /** App's name. */
  name: string
  /** Last run's error message, if it threw. */
  error?: string
  /** Restart pressed. */
  onRestart: () => void
  /** Is the debug pane showing? */
  debugOpen: boolean
  /** "Debug" pressed. */
  onToggleDebug: () => void
}

////////////////
// ## Running
////////////////

/**
 * Run `source`'s program in runtime copy `copy`, drawing into `appRoot`:
 * fetched again, with each project it imports and each code file it calls (`call native`).
 * - Afresh, unless `keepThings`:  then the last run's things carry over (`runCompiled()`).
 * - `onFetched`:  called once its own javascript is in hand, before it starts.
 * - NOTE: its own javascript is NOT fetched if it's in memory, `source.compiled` -- its imports still are.
 * - Answers how it went, and the compiled javascript it loaded, by project id --
 *   the program's own under `MAIN_PROJECT` -- for the Type Explorer's "Compiled Output".
 */
async function runProgram(
  copy: LoadedRuntime,
  source: SpellAppSource,
  appRoot: HTMLElement,
  {
    layout,
    keepThings,
    messages,
    siteHost,
    onFetched
  }: {
    layout: boolean
    keepThings: boolean
    messages?: Record<string, string>
    siteHost: SiteHost
    onFetched?: () => void
  }
): Promise<Ran> {
  const compiled = new Map<string, string>()
  stopFetchingAhead.get(appRoot)?.()
  try {
    const text = source.compiled ?? (await fetchText(source.compiledUrl))
    // the page has it:  what's left is starting it
    onFetched?.()
    compiled.set(MAIN_PROJECT, text)
    // a built site's pages, each loaded the first time it's shown (epic `solid-2-final` P13)
    const lazy = source.compiled === undefined ? LazyPages.forProgram(text, source.compiledUrl, copy) : undefined
    const error = await copy.runtime.runApp(text, {
      sourceMap: source.compiled === undefined ? await sourceMapOf(text, source.compiledUrl) : undefined,
      appRoot,
      layout,
      keepThings,
      messages,
      projectId: source.projectId,
      siteHost: lazy ? lazy.hostFor(siteHost) : siteHost,
      // only a program this page fetched:  an editor's own compiles would each ask every other window to reload
      ...(source.compiled === undefined && { programVersion: textChecksum(text) }),
      coreUrl: copy.coreUrl,
      loadImport: async (projectId) => {
        const imported = await fetchText(source.importUrl(projectId))
        compiled.set(projectId, imported)
        return imported
      },
      ...(source.nativeUrl && { loadNative: (module: string) => fetchText(source.nativeUrl!(module)) })
    })
    if (lazy && !error) stopFetchingAhead.set(appRoot, lazy.fetchAheadIn(appRoot))
    return { error, hasApp: copy.runtime.appIsMounted(), compiled }
  } catch (problem) {
    return { error: messageOf(problem), hasApp: false, compiled }
  }
}

/** What stops fetching a built site's pages ahead, for the program drawn in each app root (`LazyPages`). */
const stopFetchingAhead = new WeakMap<HTMLElement, () => void>()

/**
 * The source map compiled javascript `text`, fetched from `url`, names on its last line (epic `elemental-spell` P14):
 * `//# sourceMappingURL=Solitaire.spell.js.map`, beside it.
 * - Fetched here because the program runs from a `blob:` URL, which can't reach it:  `runCompiled()` inlines it.
 * - NEVER throws:  `undefined` when it names none, or it isn't there.
 */
async function sourceMapOf(text: string, url: string): Promise<string | undefined> {
  const file = /\n\/\/# sourceMappingURL=([^\s]+)\s*$/.exec(text)?.[1]
  if (!file || file.startsWith("data:")) return undefined
  return fetchText(new URL(file, new URL(url, document.baseURI)).href).catch(() => undefined)
}

/**
 * Compile and run the spell in `root`'s layout, against `source`'s program as it ran in `copy` -- see `LayoutSpell`.
 * - Loads `LayoutSpell`, and so spell's parser, only now:  a layout with spell in it is the only thing that needs it.
 * - Answers what takes it back.
 */
async function bindLayout(copy: LoadedRuntime, source: SpellAppSource, root: Element): Promise<() => void> {
  const [{ LayoutSpell }, declarations] = await Promise.all([
    import("./LayoutSpell"),
    source.declarations ?? fetchJSON(source.declarationsUrl)
  ])
  const { core } = copy.runtime
  await LayoutSpell.loadLanguagesOf(declarations)
  return new LayoutSpell({ root, projectId: source.name, declarations, core }).bind()
}

/**
 * Is `source` the same program as `last`, compiled again?  The same name, from the same place.
 * - `undefined` (nothing ran yet):  no.
 */
function isSameProgram(last: SpellAppSource | undefined, source: SpellAppSource): boolean {
  return !!last && last.name === source.name && last.compiledUrl === source.compiledUrl
}

/** How a run went -- see `runProgram()`. */
type Ran = {
  /** Its error message, if it threw. */
  error?: string
  /** Did it start an app? */
  hasApp: boolean
  /** Compiled javascript it loaded, by project id -- the program's own under `MAIN_PROJECT`. */
  compiled: Map<string, string>
}

/**
 * The Type Explorer's data for `source`:  the built-ins' scope pack, then its own -- `undefined` if it has none.
 * - Its own is `source.scopes` if that's set, else loaded from `source.scopesUrl`.
 * - Its `spell` from the sources, if `source` says where they are;
 *   its `compiled` from what the last run loaded, in `compiledRef`.
 */
async function loadScopes(
  source: SpellAppSource,
  builtInsUrl: string,
  compiledRef: CompiledRef
): Promise<ScopesSource | undefined> {
  const [builtIns, pack] = await Promise.all([
    loadScopePack(builtInsUrl),
    source.scopes ?? (source.scopesUrl ? loadScopePack(source.scopesUrl) : undefined)
  ])
  if (!pack) return undefined
  const { sourceUrl } = source
  return scopesFromPacks(builtIns ? [builtIns, pack] : [pack], {
    loadSource: sourceUrl && ((uri) => fetchText(sourceUrl(uri))),
    loadCompiled: async (projectId) => compiledRef.current.get(projectId === pack.id ? MAIN_PROJECT : projectId),
    loadDeclarations: async (projectId) => {
      if (projectId !== pack.id) return fetchJSON(source.importDeclarationsUrl?.(projectId))
      return source.declarations ?? fetchJSON(source.declarationsUrl)
    }
  })
}

/**
 * `source`'s own words:  `source.words` if set, else loaded from `source.wordsUrl`, in each of its languages.
 * - `undefined` if it has none.
 * - NEVER throws:  words are optional, as a scope pack is.
 */
async function ownWords(source: SpellAppSource): Promise<SP.SpellWordsData | undefined> {
  const ownDeclarations = async () => source.declarations ?? fetchJSON<CompiledDeclarations>(source.declarationsUrl)
  return source.words ?? wordsInLanguages(source.wordsUrl, ownDeclarations)
}

/**
 * The Thing Explorer's words for `source`, as one:  its own (`own`), then those of each project it imported (`importIds`).
 * - `undefined` if none of them has any.
 * - NEVER throws:  words are optional, as a scope pack is.
 */
async function loadWords(
  source: SpellAppSource,
  own: SP.SpellWordsData | undefined,
  importIds: string[]
): Promise<SP.SpellWordsData | undefined> {
  const { importWordsUrl, importDeclarationsUrl } = source
  const imported = await Promise.all(
    importIds.map((id) => wordsInLanguages(importWordsUrl?.(id), () => fetchJSON(importDeclarationsUrl?.(id))))
  )
  return mergedWords([own, ...imported])
}

/**
 * The words at `url`, with `{lang}` filled in with each language its project's declarations name, as one:
 * the one its program speaks first, whose `messages` they keep -- English (`en`) alone if they name none.
 * - A project mixing languages has a words file in each (epic `spanish` P19):  `wordsOfLanguages()` joins them.
 * - Declarations are read only when the URL asks for a language.
 * - NEVER throws:  no declarations, English.
 */
async function wordsInLanguages(
  _url: string | undefined,
  declarations: () => Promise<CompiledDeclarations | undefined>
): Promise<SP.SpellWordsData | undefined> {
  // a project's file URL is encoded (`SpellUrls.fileUrl()`):  its `{lang}` comes as `%7Blang%7D`
  const url = _url?.replaceAll(encodeURIComponent(LANG), LANG)
  if (!url?.includes(LANG)) return wordsAt(url)
  const languages = await declarations()
    .then((it) => languagesOf(it))
    .catch(() => languagesOf(undefined))
  return wordsOfLanguages(await Promise.all(languages.map((lang) => wordsAt(url.replace(LANG, lang)))))
}

/** Where a words file's URL takes each of its project's languages:  `<Project>.{lang}.js`. */
const LANG = "{lang}"

////////////////
// ## Fed by an editor
//  what a `<spell-viewer editor="<selector>">` decides --
//  here, NOT in its component (`SpellViewer`), so it's testable with no DOM.
////////////////

/**
 * What a `<spell-viewer>` runs for `pushed`, code an editor compiled.
 * - `base` (its project's source, for its imports and sources),
 *   with `pushed`'s javascript, scope pack, declarations and words in memory.
 * - A NEW object, so `<SpellAppRunner>` re-runs it.
 * - `name`, the app's `name` attribute, wins over `base`'s, if set.
 */
export function pushedSource(base: SpellAppSource, pushed: SpellCompiled, name?: string | null): SpellAppSource {
  return {
    ...base,
    name: name || base.name,
    compiled: pushed.compiled,
    ...(pushed.scopes ? { scopes: pushed.scopes } : {}),
    ...(pushed.declarations ? { declarations: pushed.declarations } : {}),
    ...(pushed.words ? { words: pushed.words } : {})
  }
}

/**
 * What code pushed to a `<spell-viewer>` was pushed FOR, as one string:
 * the app's `PUSHED_FOR` attributes then -- `project`, `src`, `scopes`, `name` and `editor`.
 * - Pushed code counts only while the app's are the same:
 *   a change of what it runs, or of which editor feeds it, drops it.
 * - NOT `toolbar`, `debug`, `width`, `height`, `assets`:  they change how it looks, and NEVER re-run it.
 * - `undefined` and `null` are the same:  no such attribute.
 */
export function pushedKey(app: PushedFor): string {
  return JSON.stringify(PUSHED_FOR.map((name) => app[name] ?? null))
}

/** The `<spell-viewer>` attributes whose change drops the code an editor pushed to it -- see `pushedKey()`. */
export const PUSHED_FOR = ["project", "src", "scopes", "name", "editor"] as const

/** A `<spell-viewer>`, or its component, as far as `pushedKey()` cares. */
export type PushedFor = { readonly [Name in (typeof PUSHED_FOR)[number]]?: string | null }

/**
 * Is `target`, what fired an event, an element `selector` matches -- e.g. a `<spell-viewer>`'s `editor`?
 * - `false` if it's not an element, or `selector` isn't a CSS selector.
 * - NOTE: duck-typed, NOT `instanceof Element`, which throws where there's no DOM.
 */
export function isEditor(target: unknown, selector: string): boolean {
  const element = target as { matches?: unknown } | null
  if (typeof element?.matches !== "function") return false
  return orIfBadSelector(() => (target as Element).matches(selector), false)
}

/**
 * What the editor `selector` finds in `root` compiled last -- its `compiled` property -- if anything.
 * - `undefined` if there's no such editor, it hasn't compiled, or `selector` isn't a CSS selector.
 */
export function editorCompiled(root: EditorRoot, selector: string): SpellCompiled | undefined {
  const editor = orIfBadSelector(() => root.querySelector(selector), null) as EditorElement | null
  return editor?.compiled
}

/** Where a `<spell-viewer>` looks for its editor:  its root node, a document or a shadow root. */
export type EditorRoot = { querySelector(selector: string): Element | null }

/** A `<spell-editor>`, as far as a `<spell-viewer>` cares:  what it compiled last, if anything. */
type EditorElement = { compiled?: SpellCompiled }

/**
 * `find()` -- else `fallback` if it threw because a selector isn't CSS, a `SyntaxError` `DOMException`.
 * - Anything else it throws, it throws.
 */
function orIfBadSelector<T>(find: () => T, fallback: T): T {
  try {
    return find()
  } catch (problem) {
    if ((problem as { name?: unknown } | null)?.name === "SyntaxError") return fallback
    throw problem
  }
}

////////////////
// ## Helpers
////////////////

/** Each debug pane tab's icon, and its title's key. */
const DEBUG_TABS: Record<DebugPane, { icon: string; text: AppTextKey }> = {
  explorer: { icon: "sitemap", text: "typeExplorer" },
  things: { icon: "cubes", text: "thingExplorer" },
  console: { icon: "terminal", text: "console" }
}

/** Debug pane tab `id`, titled in the page's language. */
function debugTab(id: DebugPane): RunnerTab<DebugPane> {
  const { icon, text } = DEBUG_TABS[id]
  return { id, icon, title: appTexts.text(text) }
}

/** Debug pane's height to start, in px, when `fluid` -- until dragged. */
const DEFAULT_DEBUG_HEIGHT = 280

/** Key in a run's compiled javascript for the program's own -- its project id isn't known until its pack is. */
const MAIN_PROJECT = ""

/** Message of `problem`, whatever was thrown. */
function messageOf(problem: unknown): string {
  return problem instanceof Error ? problem.message : String(problem)
}

/** The app's mount point, with the mounted app `App.start()` leaves on it (`core.mountApp()`). */
type AppElement = HTMLElement & { spellRoot?: { unmount(): void } }

/** Compiled javascript the last run loaded, by project id -- a box, so the Type Explorer reads the latest. */
type CompiledRef = { current: Map<string, string> }

/**
 * Spell's `in="header"` on a layout's tags, written the web's way:  `slot="header"` (Q21 B, J35).
 * - So a child the page writes by hand lands in its frame's `<children name="header"/>`.
 * - A tag with a `slot` of its own keeps it.
 * - Returns what takes the slots back.
 */
export function slotsFromIn(root: Element): () => void {
  const slotted = [...root.querySelectorAll("[in]")].filter((element) => !element.hasAttribute("slot"))
  for (const element of slotted) element.setAttribute("slot", element.getAttribute("in")!)
  return () => {
    for (const element of slotted) element.removeAttribute("slot")
  }
}
