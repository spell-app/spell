import { For, Show, createMemo, createSignal, onSettled } from "solid-js"
import type { JSX } from "@solidjs/web"
import type { RouteSectionProps } from "@solidjs/router"

import type { TableColumn } from "spell/ui/components/components.types"
import type {
  CollectionDescription,
  FieldDescription,
  OperationDescription,
  PlaceDescription,
  PlaceState
} from "spell/parser/spell/ingest/ingest.types"
import { descriptionFromDisk } from "spell/parser/spell/ingest/PlaceOnDisk"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
import { SpellPage, on } from "spell/app/app/solid"
import { SitePlaces, type SitePlace } from "./SitePlaces"

import "./PlaceReference.css"

/****************
 * ### `<PlaceReferencePage>`
 * A place's reference page, `/place/<its description's address>` (epic `data` P52):
 * `/place/@spell/examples/StarWars/StarWars.api.json5`.
 * - Linked from the site editor's Data tab, a link per place (`<SiteData>`).
 * - Its own page, under no top bar:  the reference alone, scrolling.
 ****************/
export function PlaceReferencePage(props: RouteSectionProps) {
  const path = () => (props.params.address as string | undefined)?.replace(/\/+$/, "") ?? ""
  return (
    <SpellPage id="PlaceReferencePage" fillWindow scrolling>
      <Show when={path()} keyed>
        {(shown) => <PlaceReference path={shown} />}
      </Show>
    </SpellPage>
  )
}

/****************
 * ### `<PlaceReference>`
 * A readable reference for one place, drawn from its description each time, so it's never out of date
 * (epic `data` P52, Q52):
 * - its line:  what and where it is, its version, when it was looked at, how many of its lists were tried and how
 * - where it runs:  the deployments its project's file lists
 * - a folded section per tag (NetBox's `dcim`, `ipam` ...;  one, "Lists", for a place with none), and in it a folded
 *   section per list:  its address, what it can change (its writes and action routes, what each takes), its fields
 * - each list and change labelled with how trying it went (`PlaceState`):  verified (when, on which deployment),
 *   failed (its answer), no field types, turned off, or not tried yet
 * - Every section starts folded, and draws what's in it only once it's opened:  NetBox's 143 lists stay quick.
 * - Reads the description through `SitePlaces`, as the Data tab does, whole through `descriptionFromDisk()`, the ONE
 *   reading of a description (J261).
 * - Changes nothing:  a place is changed by `spell place update`, never here.
 ****************/
export function PlaceReference(props: PlaceReferenceProps) {
  const [place, setPlace] = createSignal<SitePlace | null>()
  onSettled(() => {
    void SitePlaces.at(props.path).then((found) => setPlace(found ?? null))
  })
  return (
    <div class="PlaceReference">
      <Show
        when={place() !== undefined}
        fallback={<p class={["quiet", "loading"]}>{appTexts.text("placeRefLoading")}</p>}
      >
        <Show when={place()} fallback={<p class="quiet">{appTexts.text("placeRefNotFound", { path: props.path })}</p>}>
          {(found) => <PlaceSections place={found()} />}
        </Show>
      </Show>
    </div>
  )
}

/** What `<PlaceReference>` is handed. */
export type PlaceReferenceProps = {
  /** Its description's address, read once, as it mounts:  `@spell/examples/StarWars/StarWars.api.json5`. */
  path: string
}

/** A loaded place:  its line, where it runs, its lists by tag. */
function PlaceSections(props: { place: SitePlace }) {
  const description = createMemo(() => descriptionFromDisk(props.place.description))
  const tags = createMemo(() => tagsOf(description()))
  const counts = createMemo(() => stateCounts(description()))
  onSettled(() => {
    document.title = props.place.name
  })
  return (
    <>
      <header class="line">
        <h1>{props.place.name}</h1>
        <p>
          <span>{description().about.kind}</span>
          <code>{description().about.address}</code>
          <Show when={description().about.version}>
            {(version) => (
              <span title={version().where}>{appTexts.text("placeRefVersion", { version: version().says })}</span>
            )}
          </Show>
          <span title={description().about.specAt ?? description().about.docsAt ?? ""}>
            {appTexts.text("placeRefLooked", { date: dateOf(description().about.lookedAt) })}
          </span>
        </p>
        <div class="counts">
          <ui-label size="small" detail={String(Object.keys(description().collections).length)}>
            {appTexts.text("placeRefLists")}
          </ui-label>
          <For each={STATE_ORDER.filter((state) => counts()[state])}>
            {(state) => (
              <ui-label
                size="small"
                color={STATE_LOOKS[state].color}
                detail={String(counts()[state])}
                title={appTexts.text(STATE_LOOKS[state].why)}
              >
                {appTexts.text(STATE_LOOKS[state].words)}
              </ui-label>
            )}
          </For>
        </div>
      </header>
      <Fold label={appTexts.text("placeRefDeployments")} badge={countOf(props.place.deployments)}>
        <Deployments place={props.place} description={description()} />
      </Fold>
      <For each={tags()}>
        {(tag) => (
          <Fold label={tag.name} badge={String(tag.collections.length)}>
            <For each={tag.collections}>{(it) => <CollectionReference collection={it} />}</For>
          </Fold>
        )}
      </For>
      <Show when={description().notes.length}>
        <Fold label={appTexts.text("placeRefNotes")} badge={String(description().notes.length)}>
          <ul class="notes">
            <For each={description().notes}>{(note) => <li>{note}</li>}</For>
          </ul>
        </Fold>
      </Show>
    </>
  )
}

/** Where a place runs:  its project file's deployments, else the one address it was looked at. */
function Deployments(props: { place: SitePlace; description: PlaceDescription }) {
  const rows = createMemo(() =>
    Object.entries(props.place.deployments ?? {}).map(([name, deployment]) => ({
      name,
      at: deployment.at,
      key: deployment.key ?? props.description.about.keySecret ?? "",
      readOnly: deployment.readOnly ? appTexts.text("placeRefYes") : ""
    }))
  )
  return (
    <Show
      when={rows().length}
      fallback={
        <p class="quiet">{appTexts.text("placeRefDeploymentsNone", { address: props.description.about.address })}</p>
      }
    >
      <ui-table celled="" unstackable="" size="small" column-defs={DEPLOYMENT_COLUMNS()} rows={rows()} />
    </Show>
  )
}

/****************
 * ### `<CollectionReference>`
 * One list of a place, folded:  its name, how trying it went, its address;  opened, what it can change and its fields.
 ****************/
function CollectionReference(props: { collection: NamedCollection }) {
  const described = () => props.collection.described
  return (
    <Fold
      level="4"
      label={props.collection.key}
      hint={`GET ${described().at}`}
      badgeLabel={<StateLabel state={described().state} />}
    >
      <Show when={described().about}>{(about) => <p>{about()}</p>}</Show>
      <Show when={described().state}>{(state) => <p class="quiet">{stateLine(state())}</p>}</Show>
      <Show when={described().leftOut}>
        {(why) => <p class="quiet">{appTexts.text("placeRefListLeftOut", { why: why() })}</p>}
      </Show>
      <Show when={Object.keys(described().operations ?? {}).length}>
        <h4>{appTexts.text("placeRefChanges")}</h4>
        <ui-table
          celled=""
          unstackable=""
          size="small"
          column-defs={OPERATION_COLUMNS()}
          rows={operationRows(described().operations ?? {})}
        />
      </Show>
      <h4>{appTexts.text("placeRefFields")}</h4>
      <ui-table celled="" unstackable="" size="small" column-defs={FIELD_COLUMNS()} rows={fieldRows(described())} />
    </Fold>
  )
}

/** A list's key and its description, whole. */
type NamedCollection = { key: string; described: CollectionDescription }

/** How trying a list or a change went, as a label:  its words, its colour, why in its tooltip. */
function StateLabel(props: { state: PlaceState | undefined }) {
  const look = () => STATE_LOOKS[props.state?.is ?? "unverified"]
  return (
    <ui-label
      slot="badge"
      size="mini"
      color={look().color}
      title={props.state ? stateLine(props.state) : appTexts.text(look().why)}
    >
      {appTexts.text(look().words)}
    </ui-label>
  )
}

/****************
 * ### `<Fold>`
 * A section of the reference:  folded to start with, and what's in it drawn only once it's first opened.
 * - So a place with hundreds of lists draws only their titles until one is opened.
 ****************/
function Fold(props: FoldProps) {
  const [opened, setOpened] = createSignal(false)
  return (
    <ui-section
      class="Fold"
      collapsible=""
      open="false"
      level={props.level ?? "3"}
      label={props.label}
      hint={props.hint}
      badge={props.badge}
      ref={on("ui-opened", (event) => {
        if (event.target === event.currentTarget) setOpened(true)
      })}
    >
      {props.badgeLabel}
      <Show when={opened()}>{props.children}</Show>
    </ui-section>
  )
}

/** What `<Fold>` is handed. */
type FoldProps = {
  /** Its title. */
  label: string
  /** Its heading's level.  Default:  `3`. */
  level?: "3" | "4"
  /** A line under its title. */
  hint?: string
  /** A count after its title. */
  badge?: string
  /** A label after its title, in its badge's place. */
  badgeLabel?: JSX.Element
  /** What's in it:  drawn once it's first opened. */
  children: JSX.Element
}

////////////////
// ## Helpers
////////////////

/** The order the state counts show in. */
const STATE_ORDER = ["verified", "failed", "untyped", "disabled", "unverified"] as const

/** Each state's label:  its colour, its words, and why, its tooltip. */
const STATE_LOOKS: Record<
  PlaceState["is"],
  { color?: "green" | "red" | "yellow" | "grey"; words: AppTextKey; why: AppTextKey }
> = {
  verified: { color: "green", words: "placeRefVerified", why: "placeRefVerifiedWhy" },
  failed: { color: "red", words: "placeRefFailed", why: "placeRefFailedWhy" },
  untyped: { color: "yellow", words: "placeRefUntyped", why: "placeRefUntypedWhy" },
  disabled: { color: "grey", words: "placeRefDisabled", why: "placeRefDisabledWhy" },
  unverified: { words: "placeRefUnverified", why: "placeRefUnverifiedWhy" }
}

/** The deployments' columns, in the page's language. */
const DEPLOYMENT_COLUMNS = (): TableColumn[] => [
  { key: "name", header: appTexts.text("placeRefName") },
  { key: "at", header: appTexts.text("placeRefAddress") },
  { key: "key", header: appTexts.text("placeRefKey") },
  { key: "readOnly", header: appTexts.text("placeRefReadOnly") }
]

/** A list's changes' columns. */
const OPERATION_COLUMNS = (): TableColumn[] => [
  { key: "name", header: appTexts.text("placeRefChange") },
  { key: "route", header: appTexts.text("placeRefAddress") },
  { key: "takes", header: appTexts.text("placeRefTakes") },
  { key: "state", header: appTexts.text("placeRefState") }
]

/** A list's fields' columns. */
const FIELD_COLUMNS = (): TableColumn[] => [
  { key: "key", header: appTexts.text("placeRefField") },
  { key: "words", header: appTexts.text("placeRefInSpell") },
  { key: "kind", header: appTexts.text("placeRefKind") },
  { key: "notes", header: appTexts.text("placeRefFieldNotes") }
]

/** The place's lists, a group per tag, the tags in order;  a place with none, one group, "Lists". */
function tagsOf(description: PlaceDescription): { name: string; collections: NamedCollection[] }[] {
  const byTag = new Map<string, NamedCollection[]>()
  for (const [key, described] of Object.entries(description.collections)) {
    const tag = described.tag ?? appTexts.text("placeRefLists")
    byTag.set(tag, [...(byTag.get(tag) ?? []), { key, described }])
  }
  return [...byTag.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, collections]) => ({ name, collections }))
}

/** How many lists are in each state. */
function stateCounts(description: PlaceDescription): Partial<Record<PlaceState["is"], number>> {
  const counts: Partial<Record<PlaceState["is"], number>> = {}
  for (const described of Object.values(description.collections)) {
    const is = described.state?.is ?? "unverified"
    counts[is] = (counts[is] ?? 0) + 1
  }
  return counts
}

/**
 * A list's or a change's state, in a line:  how it went, when it was tried and where, and what it answered.
 * - `Verified, tried on dev, Nov 17, 2026, 9:31 PM:  3 rows read`
 * - `Failed, tried Nov 17, 2026, 9:32 PM:  it answered 403 ...`
 * - never tried:  why, `Not tried yet:  known from its description only ...`
 */
function stateLine(state: PlaceState): string {
  const look = STATE_LOOKS[state.is]
  let line = appTexts.text(look.words)
  if (state.at) {
    const date = dateOf(state.at)
    const tried = state.deployment
      ? appTexts.text("placeRefTriedOn", { date, deployment: state.deployment })
      : appTexts.text("placeRefTried", { date })
    line += `, ${tried}`
  }
  const said =
    state.reason ??
    (state.is === "verified" && state.rows !== undefined
      ? appTexts.text("placeRefRows", { count: String(state.rows) })
      : state.at
        ? undefined
        : appTexts.text(look.why))
  return said ? `${line}:  ${said}` : line
}

/** A list's changes as table rows:  each one's name, method and address, what it takes, how trying it went. */
function operationRows(operations: Record<string, OperationDescription>) {
  return Object.entries(operations).map(([name, operation]) => ({
    name,
    route: `${operation.method} ${operation.at}`,
    takes: Object.entries(operation.params ?? {})
      .map(([param, kind]) => `${param} (${kind})`)
      .join(", "),
    state: appTexts.text(STATE_LOOKS[operation.state?.is ?? "unverified"].words)
  }))
}

/** A list's fields as table rows:  the source's name, Spell's, its kind, and what else its description says. */
function fieldRows({ fields, idField }: CollectionDescription) {
  return Object.entries(fields).map(([key, field]) => ({
    key,
    words: field.words,
    kind: field.format ? `${field.type} (${field.format})` : field.type,
    notes: fieldNotes(key === idField, field).join(";  ")
  }))
}

/** What a field's description says besides its kind, in words. */
function fieldNotes(isId: boolean, field: FieldDescription): string[] {
  const notes: string[] = []
  if (isId) notes.push(appTexts.text("placeRefIsId"))
  if (field.linksTo) notes.push(appTexts.text("placeRefLinksTo", { target: field.linksTo }))
  if (field.isRequired) notes.push(appTexts.text("placeRefRequired"))
  if (field.isReadOnly) notes.push(appTexts.text("placeRefSetByServer"))
  if (field.choices?.length) notes.push(appTexts.text("placeRefOneOf", { choices: field.choices.join(", ") }))
  if (field.leftOut) notes.push(appTexts.text("placeRefLeftOut"))
  return notes
}

/** How many `deployments` there are, for a badge:  none, no badge. */
function countOf(deployments: Record<string, unknown> | undefined): string | undefined {
  const count = Object.keys(deployments ?? {}).length
  return count ? String(count) : undefined
}

/** An ISO date as people read it, in this browser's language:  `Nov 17, 2026, 9:31 PM`. */
function dateOf(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : DATE_FORMAT.format(date)
}

/** How `dateOf()` writes a date. */
const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" })
