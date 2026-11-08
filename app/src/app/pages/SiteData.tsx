import { For, Show, createMemo, createSignal, onSettled } from "solid-js"

import type { TableColumn, TableEditDetail } from "spell/ui/components/components.types"
import { PlaceNerd, type ErdField, type NerdSpec } from "spell/parser/spell/ingest/PlaceNerd"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { SitePlaces, type ProjectIndex, type SampleRow, type SitePlace } from "./SitePlaces"

import "./SiteData.css"

/****************
 * ### `<SiteData>`
 * The site editor's Data tab:  each place the site reads, as a NERD, its boxes turning over to their ERD
 * (epic `mockup` P11).
 * - The NERD:  `<ui-diagram>` drawing `PlaceNerd.of()`, by Owen's NERD skill's rules:  a box per collection, only
 *   its linking fields, `contains` solid and `refers to` dashed, at most `columns` columns;  boxes dragged about
 *   stay where they're put, per project and place (`remember`);  a right click saves it as SVG.
 * - Clicking a box turns it over, a card flip, to its ERD side:  every field and its kind, ids and links said
 *   (`<ui-diagram-node>` holding a `<ui-shape>`);  clicking it again turns it back.
 *   - While it's turned, the box is the card, its lines at its middle;  turned back, it's the NERD's box again, its
 *     lines from its rows.
 * - Clicking a box also picks its collection:  its sample rows show under the diagram, in `<ui-table editable>`,
 *   kept in this browser (`SitePlaces.rowsOf()`).
 * - Several places:  a menu above picks one.
 ****************/
export function SiteData(props: SiteDataProps) {
  const [places, setPlaces] = createSignal<SitePlace[]>()
  const [placeIndex, setPlaceIndex] = createSignal(0)
  const [columns, setColumns] = createSignal(DEFAULT_COLUMNS)
  const [picked, setPicked] = createSignal<string>()
  // the boxes showing their ERD side, by name
  const [turned, setTurned] = createSignal<readonly string[]>([])
  onSettled(() => {
    void SitePlaces.of(props.projectId, props.contents).then(setPlaces)
  })
  const place = createMemo(() => places()?.[placeIndex()])
  const spec = createMemo(() => {
    const showing = place()
    return showing ? PlaceNerd.of(showing.description, { columns: columns() }) : undefined
  })
  const colorOf = createMemo(() => colorsIn(spec()))
  const turn = (box: string) => {
    setPicked(box)
    setTurned((names) => (names.includes(box) ? names : [...names, box]))
  }
  const turnBack = (box: string) => setTurned((names) => names.filter((name) => name !== box))
  return (
    <div class="SiteData">
      <Show when={places()} fallback={<p class="quiet">{appTexts.text("siteDataLoading")}</p>}>
        {(loaded) => (
          <Show when={loaded().length} fallback={<p class="quiet">{appTexts.text("siteDataNone")}</p>}>
            <header>
              <Show when={loaded().length > 1}>
                <ui-select
                  size="small"
                  options={loaded().map((each, index) => ({ value: String(index), text: each.name }))}
                  value={String(placeIndex())}
                  on-ui-changed={(event: CustomEvent<{ value: string | string[] }>) => {
                    setPlaceIndex(Number(event.detail.value))
                    setTurned([])
                    setPicked(undefined)
                  }}
                />
              </Show>
              <p class="quiet">{appTexts.text("siteDataHint")}</p>
              <label class="columns">
                {appTexts.text("siteDataColumns")}
                <ui-input
                  size="small"
                  type="number"
                  min="1"
                  max="6"
                  value={String(columns())}
                  on-ui-changed={(event: CustomEvent<{ value: string }>) => {
                    const count = Math.round(Number(event.detail.value))
                    if (count >= 1) setColumns(count)
                  }}
                />
              </label>
            </header>
            <ui-diagram
              class="nerd"
              spec={spec()}
              remember={`nerd:${props.projectId}:${place()?.path ?? ""}:${columns()}`}
              on-ui-node-clicked={(event: CustomEvent<{ name: string }>) => turn(event.detail.name)}
            >
              <For each={turned()}>
                {(box) => (
                  <ErdCard
                    box={box}
                    place={place()!}
                    color={colorOf().get(box) ?? FALLBACK_COLOR}
                    nerdFields={fieldsOf(spec(), box)}
                    onTurnedBack={() => turnBack(box)}
                    onPick={() => setPicked(box)}
                  />
                )}
              </For>
            </ui-diagram>
            <Show when={picked() && place() && PlaceNerd.collectionOfBox(place()!.description, picked()!)}>
              {(collection) => (
                <SampleRows projectId={props.projectId} place={place()!} collection={collection()} box={picked()!} />
              )}
            </Show>
          </Show>
        )}
      </Show>
    </div>
  )
}

/** What `<SiteData>` is handed. */
export type SiteDataProps = {
  /** The site's project. */
  projectId: string
  /** Its index, as the server gave it:  its imports and its place descriptions. */
  contents: ProjectIndex | undefined
}

/****************
 * ### `<ErdCard>`
 * One box of the NERD turned over:  a card whose front is the NERD's box, whose back is its ERD.
 * - It mounts showing its front, then turns at once:  so the turn is seen.
 * - A click on its back turns it to the front, then it's gone, and the diagram draws the box again.
 ****************/
function ErdCard(props: ErdCardProps) {
  let shape: (HTMLElement & { next(): Promise<boolean>; previous(): Promise<boolean> }) | undefined
  const collection = createMemo(() => PlaceNerd.collectionOfBox(props.place.description, props.box))
  const fields = createMemo(() => {
    const key = collection()
    return key === undefined ? [] : PlaceNerd.erdOf(props.place.description, key)
  })
  onSettled(() => {
    // after the shape draws:  its first side shows, then it turns
    void customElements.whenDefined("ui-shape").then(() => setTimeout(() => void shape?.next(), TURN_DELAY_MS))
  })
  const turnBack = () => {
    void shape?.previous().then(() => props.onTurnedBack())
  }
  return (
    <ui-diagram-node name={props.box}>
      <ui-shape ref={(element: HTMLElement) => (shape = element as typeof shape)} class="ErdCard">
        <ui-side>
          <div class="box" style={{ "--box-color": props.color }}>
            <div class="title">{props.box}</div>
            <For each={props.nerdFields}>{(field) => <div class="row">{field}</div>}</For>
          </div>
        </ui-side>
        <ui-side>
          <div
            class="box erd"
            style={{ "--box-color": props.color }}
            role="button"
            tabindex="0"
            title={appTexts.text("siteDataTurnBack")}
            onClick={turnBack}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") turnBack()
            }}
            onFocus={() => props.onPick()}
          >
            <div class="title">{appTexts.text("siteDataErdTitle", { box: props.box })}</div>
            <For each={fields()}>
              {(field) => (
                <div class={["row", { id: !!field.isId, link: !!field.linksTo }]}>
                  <span class="name">{field.words}</span>
                  <span class="kind">{kindOf(field)}</span>
                </div>
              )}
            </For>
          </div>
        </ui-side>
      </ui-shape>
    </ui-diagram-node>
  )
}

/** What `<ErdCard>` is handed. */
type ErdCardProps = {
  box: string
  place: SitePlace
  /** Its header's colour, the NERD's. */
  color: string
  /** The NERD box's rows, for its front. */
  nerdFields: readonly string[]
  onTurnedBack: () => void
  onPick: () => void
}

/****************
 * ### `<SampleRows>`
 * A collection's sample rows, to edit as a spreadsheet:  `<ui-table editable>`, kept in this browser.
 * - Its columns:  every field the ingester kept, its kind deciding its editor (a number's, a date's, yes or no);
 *   a link is text here, its target's id.
 * - "Start again" forgets what's kept:  back to the examples' row.
 ****************/
function SampleRows(props: SampleRowsProps) {
  const [rows, setRows] = createSignal<SampleRow[]>(SitePlaces.rowsOf(props.projectId, props.place, props.collection))
  const columns = createMemo<TableColumn[]>(() =>
    PlaceNerd.erdOf(props.place.description, props.collection).map((field) => ({
      key: field.key,
      header: field.words,
      ...(field.isId && { readOnly: true }),
      ...(TABLE_TYPES[field.kind] && { type: TABLE_TYPES[field.kind] })
    }))
  )
  const startAgain = () => {
    SitePlaces.forgetRows(props.projectId, props.place, props.collection)
    setRows(SitePlaces.rowsOf(props.projectId, props.place, props.collection))
  }
  return (
    <section class="samples">
      <header>
        <h2>{appTexts.text("siteDataSamples", { box: props.box })}</h2>
        <ui-button size="small" appearance="basic" icon="undo" onClick={startAgain}>
          {appTexts.text("siteDataStartAgain")}
        </ui-button>
      </header>
      <ui-table
        editable=""
        celled=""
        unstackable=""
        column-defs={columns()}
        rows={rows()}
        on-ui-editing={(event: CustomEvent<TableEditDetail>) => {
          const next = withEdits(rows(), event.detail)
          SitePlaces.keepRows(props.projectId, props.place, props.collection, next)
          setRows(next)
        }}
      />
    </section>
  )
}

/** What `<SampleRows>` is handed. */
type SampleRowsProps = {
  projectId: string
  place: SitePlace
  collection: string
  /** Its box's name, for its title. */
  box: string
}

////////////////
// ## Helpers
////////////////

/** The NERD skill's own most columns. */
const DEFAULT_COLUMNS = 3

/** A box's colour when its group says none. */
const FALLBACK_COLOR = "#475569"

/** How long a card waits after it's drawn before it turns, ms:  so its front is seen first. */
const TURN_DELAY_MS = 30

/** The table editor for each kind of field the ingester names;  the rest are text. */
const TABLE_TYPES: Partial<Record<ErdField["kind"], NonNullable<TableColumn["type"]>>> = {
  number: "number",
  date: "date",
  "yes or no": "yes-no"
}

/** Each box's header colour, by its name:  its group's. */
function colorsIn(spec: NerdSpec | undefined): Map<string, string> {
  const colors = new Map<string, string>()
  for (const column of spec?.columns ?? []) {
    for (const group of column.groups) {
      if ("legend" in group) continue
      const nodes = "nodes" in group ? group.nodes : group.lanes.flat()
      for (const node of nodes) colors.set(node.name, group.color)
    }
  }
  return colors
}

/** Box `box`'s rows in `spec`. */
function fieldsOf(spec: NerdSpec | undefined, box: string): string[] {
  for (const column of spec?.columns ?? []) {
    for (const group of column.groups) {
      if ("legend" in group) continue
      const nodes = "nodes" in group ? group.nodes : group.lanes.flat()
      const node = nodes.find((each) => each.name === box)
      if (node) return node.fields ?? []
    }
  }
  return []
}

/** A field's kind on the ERD side:  `id`, `→ Planet`, else the ingester's word. */
function kindOf(field: ErdField): string {
  if (field.isId) return appTexts.text("siteDataId")
  if (field.linksTo) return field.kind === "list of links" ? `→ ${field.linksTo}[]` : `→ ${field.linksTo}`
  return field.kind
}

/** `rows` with `detail`'s edits made:  a new list, new row objects where they changed. */
function withEdits(rows: readonly SampleRow[], { edits }: TableEditDetail): SampleRow[] {
  let next = [...rows]
  for (const edit of edits) {
    if (edit.kind === "set") next = next.map((row) => (row === edit.row ? { ...row, [edit.key]: edit.value } : row))
    else if (edit.kind === "add") next.push({ ...edit.values })
    else /* if (edit.kind === "remove") */ next = next.filter((row) => row !== edit.row)
  }
  return next
}
