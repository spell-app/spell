import { For, Show, createSignal, onSettled } from "solid-js"
import type { JSX } from "@solidjs/web"

import type { ComponentDefinition } from "spell/ui/components/ComponentDefinitions"
import { SPACES } from "spell/app/spaces"
import { appTexts, type AppTextKey, type AppTextParams } from "spell/app/app/ui/AppTexts"
import { SpellPage } from "spell/app/app/solid"
import { on } from "spell/app/app/solid/on"
import { ChooserToolbar } from "./ProjectChooser"

import "./PaletteGroupsPage.css"

/****************
 * ### `<PaletteGroupsPage>`
 * The editor's palette groups page, at `/palette`:  the + menu's groups as columns, for Owen to arrange and save
 * (epic `editor` T81;  Spell UI's `<ui-docs-palette>` until epic `editor` P42, Q81).
 * - Reads the palette's table from the page server (`GET`, `SPACES.PALETTE_GROUPS_API`, spaces' `paletteRoutes`), and
 *   shows it as the palette does:  `PaletteGroups.inGroups()`, so a component the table doesn't name shows where the
 *   palette would put it.
 * - Drag a component to another group or place;  drag a group by its handle;  rename a group in its field;
 *   pick its icon (the add bar down the editor's left edge shows it, epic `editor` T86, T151);  put a divider under it
 *   in that bar, or take it away (T151);  add one, or remove one (its components go to Not in the + menu).
 * - The last column, Not in the + menu, holds every other component:  drag one into a group to offer it.
 * - Save writes the table back (`PUT`):  the palette shows it on its next load.
 * - Reads `PaletteGroups` itself, a lazy chunk of this page alone (it loads every vocabulary):
 *   the palette's own rule, never a copy of it.
 * - Reached by its address, `/palette`, or the page server's `/editor/palette` (Spell UI's old palette page links it).
 ****************/
export function PaletteGroupsPage(): JSX.Element {
  const [rule, setRule] = createSignal<GroupRule | undefined>(undefined)
  const [groups, setGroups] = createSignal<readonly EditedGroup[]>([])
  const [notOffered, setNotOffered] = createSignal<readonly string[]>([])
  const [status, setStatus] = createSignal<Status>("loading")
  const [saveError, setSaveError] = createSignal("")
  const [dropAt, setDropAt] = createSignal<DropAt | undefined>(undefined)
  // what's being dragged, read on drop:  so not reactive
  let dragged: { tag: string } | { group: number } | undefined

  onSettled(() => void load())

  ////////////////
  // ## The table
  ////////////////

  /** The table from the page server, and the palette's rule;  `noServer` when either can't be had. */
  async function load(): Promise<void> {
    try {
      const [{ PaletteGroups }, response] = await Promise.all([
        import("spell/app/app/ui/PaletteGroups"),
        fetch(SPACES.PALETTE_GROUPS_API, { cache: "no-store" })
      ])
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      const table = (await response.json()) as SPACES.PaletteTable
      const loaded = PaletteGroups.inGroups(table).map(({ topic, title, icon, dividerAfter, parts }) => ({
        topic,
        title,
        icon,
        dividerAfter,
        tags: parts.map((definition) => definition.tag)
      }))
      const placed = new Set(loaded.flatMap((group) => group.tags))
      setRule(() => PaletteGroups)
      setGroups(loaded)
      setNotOffered(
        PaletteGroups.candidates()
          .filter((definition) => !placed.has(definition.tag))
          .map((definition) => definition.tag)
      )
      setStatus("ready")
    } catch (error) {
      console.error("<PaletteGroupsPage>:  can't load the palette's groups", error)
      setStatus("noServer")
    }
  }

  /** Write the table back;  `saved`, or `failed` with why. */
  async function save(): Promise<void> {
    const groupRule = rule()
    if (!groupRule) return
    setStatus("saving")
    // what the palette's rule would offer, if the table didn't say to leave it out
    const offeredByRule = new Set(groupRule.byTopic().flatMap(({ parts }) => parts.map((definition) => definition.tag)))
    const table: SPACES.PaletteTable = {
      groups: groups().map(({ topic, title, icon, dividerAfter, tags }) => ({
        ...(topic && { topic }),
        ...(title && { title }),
        ...(icon && { icon }),
        ...(dividerAfter && { dividerAfter }),
        tags: [...tags]
      })),
      hidden: notOffered().filter((tag) => offeredByRule.has(tag))
    }
    try {
      const response = await fetch(SPACES.PALETTE_GROUPS_API, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(table)
      })
      if (!response.ok) {
        const answer = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(answer.error ?? `${response.status} ${response.statusText}`)
      }
      setStatus("saved")
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error))
      setStatus("failed")
    }
  }

  ////////////////
  // ## Groups
  ////////////////

  /** `group`'s name as the palette shows it:  its title, else its topic's word, a capital first. */
  function nameOf(group: EditedGroup): string {
    const name = rule()?.groupNameIn(group, appTexts.lang) ?? group.title ?? group.topic ?? ""
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  /** Rename group `at` to `text`:  its topic's word again when empty, or the same as it. */
  function rename(at: number, text: string): void {
    const group = groups()[at]
    if (!group) return
    const words = text.trim()
    const topicWord = group.topic ? rule()?.groupNameIn({ topic: group.topic }, appTexts.lang) : undefined
    const title = words && words.toLowerCase() !== topicWord?.toLowerCase() ? words : undefined
    if (title === group.title || (!title && !group.topic)) return
    setGroups(groups().map((each, index) => (index === at ? { ...each, title } : each)))
    setStatus("changed")
  }

  /** Group `at`'s icon is now `icon`:  none when empty. */
  function setIcon(at: number, icon: string): void {
    const group = groups()[at]
    if (!group || (group.icon ?? "") === icon) return
    setGroups(groups().map((each, index) => (index === at ? { ...each, icon: icon || undefined } : each)))
    setStatus("changed")
  }

  /** A divider under group `at` in the add bar, or none:  the other of what it has. */
  function toggleDivider(at: number): void {
    setGroups(groups().map((each, index) => (index === at ? { ...each, dividerAfter: !each.dividerAfter } : each)))
    setStatus("changed")
  }

  /** A new, empty group at the end. */
  function addGroup(): void {
    setGroups([...groups(), { title: text("palettePage.newGroup"), tags: [] }])
    setStatus("changed")
  }

  /** Remove group `at`:  its components go to Not in the + menu. */
  function removeGroup(at: number): void {
    const group = groups()[at]
    if (!group) return
    setGroups(groups().filter((_each, index) => index !== at))
    setNotOffered(sortedByName([...notOffered(), ...group.tags]))
    setStatus("changed")
  }

  /** Move group `from` to `to`'s place. */
  function moveGroup(from: number, to: number): void {
    if (from === to) return
    const moved = [...groups()]
    const [group] = moved.splice(from, 1)
    moved.splice(to, 0, group!)
    setGroups(moved)
    setStatus("changed")
  }

  /** Move `tag` into group `to` (`NOT_OFFERED`:  out of the palette), before its `before`th row. */
  function moveTag(tag: string, to: number, before: number): void {
    const now = groups()
    const from = now.findIndex((group) => group.tags.includes(tag))
    if (to === NOT_OFFERED) {
      if (from === NOT_OFFERED) return
      setGroups(
        now.map((group, index) =>
          index === from ? { ...group, tags: group.tags.filter((each) => each !== tag) } : group
        )
      )
      setNotOffered(sortedByName([...notOffered(), tag]))
    } else {
      // where it lands, counted without it
      const at = from === to ? before - Number(now[to]!.tags.indexOf(tag) < before) : before
      setGroups(
        now.map((group, index) => {
          if (index !== from && index !== to) return group
          const tags = group.tags.filter((each) => each !== tag)
          if (index === to) tags.splice(at, 0, tag)
          return { ...group, tags }
        })
      )
      setNotOffered(notOffered().filter((each) => each !== tag))
    }
    setStatus("changed")
  }

  /** `tags`, by their components' names. */
  function sortedByName(tags: string[]): string[] {
    return tags.sort((a, b) => nameOfTag(a).localeCompare(nameOfTag(b)))
  }

  ////////////////
  // ## Dragging
  ////////////////

  /** A component's row starts to move. */
  function onTagDragStart(event: DragEvent, tag: string): void {
    event.stopPropagation()
    dragged = { tag }
    event.dataTransfer?.setData("text/plain", tag)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move"
  }

  /** A group's handle starts to move it:  the whole column is what's seen moving. */
  function onGroupDragStart(event: DragEvent, at: number): void {
    dragged = { group: at }
    event.dataTransfer?.setData("text/plain", nameOf(groups()[at]!))
    const column = (event.currentTarget as HTMLElement).closest("section")
    if (column) event.dataTransfer?.setDragImage(column, 16, 16)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move"
  }

  /** Over list `list`:  a component lands before the first row below the pointer;  a group, in its place. */
  function onDragOver(event: DragEvent, list: number): void {
    if (!dragged || ("group" in dragged && list === NOT_OFFERED)) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move"
    const drop = dropAt()
    if ("group" in dragged) {
      if (drop?.list !== list) setDropAt({ list })
      return
    }
    const rows = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("li[data-tag]")]
    const found = rows.findIndex((row) => {
      const box = row.getBoundingClientRect()
      return event.clientY < box.top + box.height / 2
    })
    const before = found === -1 ? rows.length : found
    if (drop?.list !== list || drop.before !== before) setDropAt({ list, before })
  }

  /** Dropped on list `list`:  the component or group moves there. */
  function onDrop(event: DragEvent, list: number): void {
    const what = dragged
    const drop = dropAt()
    event.preventDefault()
    endDrag()
    if (!what || drop?.list !== list) return
    if ("group" in what) moveGroup(what.group, list)
    else moveTag(what.tag, list, drop.before ?? 0)
  }

  /** The drag is over, dropped or not. */
  function endDrag(): void {
    dragged = undefined
    setDropAt(undefined)
  }

  ////////////////
  // ## Drawing
  ////////////////

  /** `tag`'s component, if it is one. */
  function definitionOf(tag: string): ComponentDefinition | undefined {
    return rule()?.definitionOf(tag)
  }

  /** `tag`'s component's name:  `Buttons`. */
  function nameOfTag(tag: string): string {
    return definitionOf(tag)?.name ?? tag
  }

  /** What the bar says of the load or save. */
  function statusText(): string {
    const now = status()
    if (now === "failed") return text("palettePage.saveFailed", { error: saveError() })
    if (now === "changed") return text("palettePage.unsaved")
    return now === "loading" || now === "noServer" || now === "saved" ? text(STATUS_TEXTS[now]) : ""
  }

  /** Group `at`'s column:  its handle, icon, name and remove button, then its rows. */
  function column(group: () => EditedGroup, at: number): JSX.Element {
    const name = () => nameOf(group())
    return (
      <section
        class={[
          "group",
          { over: dropAt()?.list === at && dropAt()?.before === undefined, "divider-after": !!group().dividerAfter }
        ]}
        onDragOver={(event) => onDragOver(event, at)}
        onDrop={(event) => onDrop(event, at)}
      >
        <header class="head">
          <span
            class="handle"
            draggable="true"
            data-tooltip={text("palettePage.moveGroup", { group: name() })}
            onDragStart={(event) => onGroupDragStart(event, at)}
            onDragEnd={() => endDrag()}
          >
            <ui-icon name="grip vertical" aria-hidden="true"></ui-icon>
          </span>
          <ui-icon-picker
            class="icon"
            size="small"
            value={group().icon ?? ""}
            aria-label={text("palettePage.groupIcon", { group: name() })}
            data-tooltip={text("palettePage.groupIcon", { group: name() })}
            ref={on<{ value: string }>("ui-changed", (event) => setIcon(at, event.detail.value))}
          ></ui-icon-picker>
          <ui-input
            class="name"
            size="small"
            appearance="transparent"
            value={name()}
            aria-label={text("palettePage.groupName")}
            ref={on<{ value: string }>("ui-changed", (event) => rename(at, event.detail.value))}
          ></ui-input>
          <ui-button
            class="divider"
            size="mini"
            appearance="basic"
            icon="grip lines"
            selected={!!group().dividerAfter}
            aria-label={text(group().dividerAfter ? "palettePage.removeDivider" : "palettePage.addDivider", {
              group: name()
            })}
            data-tooltip={text(group().dividerAfter ? "palettePage.removeDivider" : "palettePage.addDivider", {
              group: name()
            })}
            onClick={() => toggleDivider(at)}
          ></ui-button>
          <ui-button
            class="remove"
            size="mini"
            appearance="basic"
            icon="xmark"
            aria-label={text("palettePage.removeGroup", { group: name() })}
            data-tooltip={text("palettePage.removeGroup", { group: name() })}
            onClick={() => removeGroup(at)}
          ></ui-button>
        </header>
        {rows(() => group().tags, at)}
      </section>
    )
  }

  /** List `list`'s rows:  each component's icon and name, to drag;  the drop marker where one would land. */
  function rows(tags: () => readonly string[], list: number): JSX.Element {
    const markerAt = (index: number) => dropAt()?.list === list && dropAt()?.before === index
    return (
      <ul class="rows">
        <For each={tags()}>
          {(tag, index) => (
            <li
              data-tag={tag}
              class={["row", { "drop-before": markerAt(index()) }]}
              draggable="true"
              data-tooltip={definitionOf(tag)?.description ?? ""}
              onDragStart={(event) => onTagDragStart(event, tag)}
              onDragEnd={() => endDrag()}
            >
              <ui-icon name={definitionOf(tag)?.icon ?? "cube"} aria-hidden="true"></ui-icon>
              <span class="label">{nameOfTag(tag)}</span>
            </li>
          )}
        </For>
        <li class={["end", { "drop-before": markerAt(tags().length) }]} aria-hidden="true"></li>
      </ul>
    )
  }

  return (
    <SpellPage id="PaletteGroupsPage" fillWindow dark rows>
      <ChooserToolbar isHome={false} />
      <div class="PaletteGroupsPage">
        <ui-header level="1" class="title">
          {text("palettePage.title")}
        </ui-header>
        <div class="bar">
          <p class="hint">{text("palettePage.hint")}</p>
          <span class={["status", { failed: status() === "failed" || status() === "noServer" }]} role="status">
            {statusText()}
          </span>
          <ui-button size="small" icon="plus" disabled={status() === "loading"} onClick={() => addGroup()}>
            {text("palettePage.addGroup")}
          </ui-button>
          <ui-button
            size="small"
            color="primary"
            icon="save"
            disabled={status() !== "changed" && status() !== "failed"}
            loading={status() === "saving"}
            onClick={() => void save()}
          >
            {text("palettePage.save")}
          </ui-button>
        </div>
        <Show when={rule()}>
          <div class="groups">
            <For each={groups()} keyed={false}>
              {(group, at) => column(group, at)}
            </For>
            <section
              class={["group", "not-offered", { over: dropAt()?.list === NOT_OFFERED }]}
              onDragOver={(event) => onDragOver(event, NOT_OFFERED)}
              onDrop={(event) => onDrop(event, NOT_OFFERED)}
            >
              <header class="head">
                <h3>{text("palettePage.notOffered")}</h3>
              </header>
              {rows(notOffered, NOT_OFFERED)}
            </section>
          </div>
        </Show>
      </div>
    </SpellPage>
  )
}

/** The palette's rule, `PaletteGroups`, once its lazy chunk is in. */
type GroupRule = typeof import("spell/app/app/ui/PaletteGroups").PaletteGroups

/** One group as it's edited:  its topic or title, and its tags in order. */
type EditedGroup = {
  readonly topic?: SPACES.PaletteTableGroup["topic"]
  title?: string
  icon?: string
  /** A divider under it in the add bar. */
  dividerAfter?: boolean
  tags: string[]
}

/** The list a dragged component would land in, and where;  or the group a dragged group would take the place of. */
type DropAt = { list: number; before?: number }

/** How the table's load or save went. */
type Status = "loading" | "noServer" | "ready" | "changed" | "saving" | "saved" | "failed"

/** What the bar says for each status that's said in a word of its own. */
const STATUS_TEXTS = {
  loading: "palettePage.loading",
  noServer: "palettePage.noServer",
  saved: "palettePage.saved"
} as const satisfies Partial<Record<Status, AppTextKey>>

/** The list number of Not in the + menu. */
const NOT_OFFERED = -1

/** The page's text for `key`, in the editor's language. */
function text(key: AppTextKey, params?: AppTextParams): string {
  return appTexts.text(key, params)
}
