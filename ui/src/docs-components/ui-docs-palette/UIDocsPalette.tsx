import { For, Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import type { ComponentDefinition, PaletteTable } from "spell/ui/components/ComponentDefinitions"
import { PALETTE_GROUPS_API } from "spell/ui/docs-components/docs-components.types"
import { docsPaletteVocabulary } from "./UIDocsPalette.en"
import type { DocsPaletteTextKey, DocsPaletteVocabulary } from "./UIDocsPalette.types"

import paletteCSS from "./UIDocsPalette.css?inline"

/****************
 * ### `<ui-docs-palette>`
 * The component behind `<ui-docs-palette>`:  the Spell editor palette's groups, as columns, for Owen to arrange
 * (epic `editor` T81).
 * - Reads the palette's table from the page server (`GET /api/ui/palette-groups`, Spell UI's `paletteRoutes`), and
 *   shows it as the palette does:  `ComponentDefinitions.paletteGroups()`, so a component the table doesn't name
 *   shows where the palette would put it.
 * - Drag a component to another group or place;  drag a group by its handle;  rename a group in its field;
 *   pick its icon (the editor's pinned Add bar shows it, epic `editor` T86);  add one, or remove one (its components go to Not in the palette).
 * - The last column, Not in the palette, holds every other component:  drag one into a group to offer it.
 * - Save writes the table back (`PUT`, with the page server's token):  the editor's palette shows it on its next load.
 * - Reads `ComponentDefinitions` itself, a lazy chunk on this page alone:  the palette's own rule, never a copy of it.
 *   Not the site's data (`SiteData`), which has no ready-made snippets, so no rule.
 ****************/
export class UIDocsPalette extends E.UIComponent<DocsPaletteVocabulary> {
  @E.proto static vocabulary = docsPaletteVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "docs-palette": paletteCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The table
  ////////////////

  /** The palette's rules, once loaded:  `ComponentDefinitions`. */
  @E.state accessor definitions:
    | typeof import("spell/ui/components/ComponentDefinitions").ComponentDefinitions
    | undefined = undefined

  /** The groups as edited, in order. */
  @E.state accessor groups: readonly EditedGroup[] = []

  /** The tags in Not in the palette. */
  @E.state accessor notOffered: readonly string[] = []

  /** How the table's load or save went. */
  @E.state accessor status: Status = "loading"

  /** Why the last save failed. */
  @E.state accessor saveError = ""

  /** Connected:  load the table, once. */
  @E.whileConnected
  protected watchTable() {
    void this.load()
  }

  /** The table from the page server, and the palette's rules;  `noServer` when either can't be had. */
  @E.once
  private async load(): Promise<void> {
    try {
      const [{ ComponentDefinitions }, response] = await Promise.all([
        import("spell/ui/components/ComponentDefinitions"),
        fetch(PALETTE_GROUPS_API, { cache: "no-store" })
      ])
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      const table = (await response.json()) as PaletteTable
      const groups = ComponentDefinitions.paletteGroups(table).map(({ topic, title, icon, parts }) => ({
        topic,
        title,
        icon,
        tags: parts.map((definition) => definition.tag)
      }))
      const placed = new Set(groups.flatMap((group) => group.tags))
      this.definitions = ComponentDefinitions
      this.groups = groups
      this.notOffered = ComponentDefinitions.paletteCandidates()
        .filter((definition) => !placed.has(definition.tag))
        .map((definition) => definition.tag)
      this.status = "ready"
    } catch (error) {
      E.Warnings.warn("<ui-docs-palette>", "can't load the palette's groups", error)
      this.status = "noServer"
    }
  }

  /** Write the table back;  `saved`, or `failed` with why. */
  @E.untracked
  private async save(): Promise<void> {
    const definitions = this.definitions
    if (!definitions) return
    this.status = "saving"
    // what the palette's rule would offer, if the table didn't say to leave it out
    const offeredByRule = new Set(
      definitions.paletteGroupsByTopic().flatMap(({ parts }) => parts.map((definition) => definition.tag))
    )
    const table: PaletteTable = {
      groups: this.groups.map(({ topic, title, icon, tags }) => ({
        ...(topic && { topic }),
        ...(title && { title }),
        ...(icon && { icon }),
        tags: [...tags]
      })),
      hidden: this.notOffered.filter((tag) => offeredByRule.has(tag))
    }
    try {
      const token = (window as { SPELL_SERVER?: { token?: string } }).SPELL_SERVER?.token ?? ""
      const response = await fetch(PALETTE_GROUPS_API, {
        method: "PUT",
        headers: { "content-type": "application/json", "x-server-token": token },
        body: JSON.stringify(table)
      })
      if (!response.ok) {
        const answer = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(answer.error ?? `${response.status} ${response.statusText}`)
      }
      this.status = "saved"
    } catch (error) {
      this.saveError = error instanceof Error ? error.message : String(error)
      this.status = "failed"
    }
  }

  /** Something changed:  there's a save to make. */
  private changed(): void {
    this.status = "changed"
  }

  ////////////////
  // ## Groups
  ////////////////

  /** `group`'s name as the palette shows it:  its title, else its topic's word, a capital first. */
  private nameOf(group: EditedGroup): string {
    const name = this.definitions?.groupNameIn(group, "en") ?? group.title ?? group.topic ?? ""
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  /** Rename group `at` to `text`:  its topic's word again when empty, or the same as it. */
  @E.untracked
  private rename(at: number, text: string): void {
    const group = this.groups[at]
    if (!group) return
    const words = text.trim()
    const topicWord = group.topic ? this.definitions?.topicIn(group.topic, "en") : undefined
    const title = words && words.toLowerCase() !== topicWord?.toLowerCase() ? words : undefined
    if (title === group.title || (!title && !group.topic)) return
    this.groups = this.groups.map((each, index) => (index === at ? { ...each, title } : each))
    this.changed()
  }

  /** Group `at`'s icon is now `icon`:  none when empty. */
  @E.untracked
  private setIcon(at: number, icon: string): void {
    const group = this.groups[at]
    if (!group || (group.icon ?? "") === icon) return
    this.groups = this.groups.map((each, index) => (index === at ? { ...each, icon: icon || undefined } : each))
    this.changed()
  }

  /** A new, empty group at the end. */
  @E.untracked
  private addGroup(): void {
    this.groups = [...this.groups, { title: this.text("newGroup"), tags: [] }]
    this.changed()
  }

  /** Remove group `at`:  its components go to Not in the palette. */
  @E.untracked
  private removeGroup(at: number): void {
    const group = this.groups[at]
    if (!group) return
    this.groups = this.groups.filter((_each, index) => index !== at)
    this.notOffered = this.sortedByName([...this.notOffered, ...group.tags])
    this.changed()
  }

  /** Move group `from` to `to`'s place. */
  private moveGroup(from: number, to: number): void {
    if (from === to) return
    const groups = [...this.groups]
    const [moved] = groups.splice(from, 1)
    groups.splice(to, 0, moved!)
    this.groups = groups
    this.changed()
  }

  /** Move `tag` into group `to` (`NOT_OFFERED`:  out of the palette), before its `before`th row. */
  private moveTag(tag: string, to: number, before: number): void {
    const from = this.groups.findIndex((group) => group.tags.includes(tag))
    if (to === NOT_OFFERED) {
      if (from === NOT_OFFERED) return
      this.groups = this.groups.map((group, index) =>
        index === from ? { ...group, tags: group.tags.filter((each) => each !== tag) } : group
      )
      this.notOffered = this.sortedByName([...this.notOffered, tag])
    } else {
      // where it lands, counted without it
      const at = from === to ? before - Number(this.groups[to]!.tags.indexOf(tag) < before) : before
      this.groups = this.groups.map((group, index) => {
        if (index !== from && index !== to) return group
        const tags = group.tags.filter((each) => each !== tag)
        if (index === to) tags.splice(at, 0, tag)
        return { ...group, tags }
      })
      this.notOffered = this.notOffered.filter((each) => each !== tag)
    }
    this.changed()
  }

  /** `tags`, by their components' names. */
  private sortedByName(tags: string[]): string[] {
    return tags.sort((a, b) => this.nameOfTag(a).localeCompare(this.nameOfTag(b)))
  }

  ////////////////
  // ## Dragging
  ////////////////

  /** What's being dragged:  a component's tag, or a group's place;  read on drop, so not reactive. */
  private dragged: { tag: string } | { group: number } | undefined

  /** The list a dragged component would land in, and where;  or the group a dragged group would take the place of. */
  @E.state accessor dropAt: { list: number; before?: number } | undefined = undefined

  /** A component's row starts to move. */
  @E.untracked
  private onTagDragStart(event: DragEvent, tag: string): void {
    event.stopPropagation()
    this.dragged = { tag }
    event.dataTransfer?.setData("text/plain", tag)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move"
  }

  /** A group's handle starts to move it:  the whole column is what's seen moving. */
  @E.untracked
  private onGroupDragStart(event: DragEvent, at: number): void {
    this.dragged = { group: at }
    event.dataTransfer?.setData("text/plain", this.nameOf(this.groups[at]!))
    const column = (event.currentTarget as HTMLElement).closest("section")
    if (column) event.dataTransfer?.setDragImage(column, 16, 16)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move"
  }

  /** Over list `list`:  a component lands before the first row below the pointer;  a group, in its place. */
  @E.untracked
  private onDragOver(event: DragEvent, list: number): void {
    const dragged = this.dragged
    if (!dragged || ("group" in dragged && list === NOT_OFFERED)) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move"
    if ("group" in dragged) {
      if (this.dropAt?.list !== list) this.dropAt = { list }
      return
    }
    const rows = [...((event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("li[data-tag]") ?? [])]
    const found = rows.findIndex((row) => {
      const box = row.getBoundingClientRect()
      return event.clientY < box.top + box.height / 2
    })
    const before = found === -1 ? rows.length : found
    if (this.dropAt?.list !== list || this.dropAt.before !== before) this.dropAt = { list, before }
  }

  /** Dropped on list `list`:  the component or group moves there. */
  @E.untracked
  private onDrop(event: DragEvent, list: number): void {
    const dragged = this.dragged
    const drop = this.dropAt
    event.preventDefault()
    this.endDrag()
    if (!dragged || drop?.list !== list) return
    if ("group" in dragged) this.moveGroup(dragged.group, list)
    else this.moveTag(dragged.tag, list, drop.before ?? 0)
  }

  /** The drag is over, dropped or not. */
  private endDrag(): void {
    this.dragged = undefined
    this.dropAt = undefined
  }

  ////////////////
  // ## Drawing
  ////////////////

  /** `tag`'s component, if it is one. */
  private definitionOf(tag: string): ComponentDefinition | undefined {
    return this.definitions?.byTag(tag)
  }

  /** `tag`'s component's name:  `Buttons`. */
  private nameOfTag(tag: string): string {
    return this.definitionOf(tag)?.name ?? tag
  }

  /** The text for `key`;  `""` until the runtime is in. */
  private text(key: DocsPaletteTextKey, params?: Record<string, string>): string {
    return this.isReady ? this.translationForKey(key, params) : ""
  }

  /** What the bar says of the load or save. */
  private get statusText(): string {
    const status = this.status
    if (status === "failed") return this.text("saveFailed", { error: this.saveError })
    if (status === "changed") return this.text("unsaved")
    return status === "loading" || status === "noServer" || status === "saved" ? this.text(status) : ""
  }

  render(): JSX.Element {
    return (
      <div class="palette">
        <div class="bar" part={this.partForName("bar")}>
          <span class="hint">{this.text("hint")}</span>
          <span class={["status", { failed: this.status === "failed" || this.status === "noServer" }]} role="status">
            {this.statusText}
          </span>
          <ui-button size="small" icon="plus" disabled={this.status === "loading"} onClick={() => this.addGroup()}>
            {this.text("addGroup")}
          </ui-button>
          <ui-button
            size="small"
            color="primary"
            icon="save"
            disabled={this.status !== "changed" && this.status !== "failed"}
            loading={this.status === "saving"}
            onClick={() => void this.save()}
          >
            {this.text("save")}
          </ui-button>
        </div>
        <Show when={this.definitions}>
          <div class="groups" part={this.partForName("groups")}>
            <For each={this.groups} keyed={false}>
              {(group, at) => this.group(group, at)}
            </For>
            <section
              class={["group", "not-offered", { over: this.dropAt?.list === NOT_OFFERED }]}
              onDragOver={(event) => this.onDragOver(event, NOT_OFFERED)}
              onDrop={(event) => this.onDrop(event, NOT_OFFERED)}
            >
              <header class="head">
                <h3>{this.text("notOffered")}</h3>
              </header>
              {this.rows(() => this.notOffered, NOT_OFFERED)}
            </section>
          </div>
        </Show>
      </div>
    )
  }

  /** Group `at`'s column:  its handle, name and remove button, then its rows. */
  private group(group: () => EditedGroup, at: number): JSX.Element {
    const name = () => this.nameOf(group())
    return (
      <section
        class={["group", { over: this.dropAt?.list === at && this.dropAt.before === undefined }]}
        onDragOver={(event) => this.onDragOver(event, at)}
        onDrop={(event) => this.onDrop(event, at)}
      >
        <header class="head">
          <span
            class="handle"
            draggable="true"
            title={this.text("moveGroup", { group: name() })}
            onDragStart={(event) => this.onGroupDragStart(event, at)}
            onDragEnd={() => this.endDrag()}
          >
            <ui-icon name="grip vertical" aria-hidden="true"></ui-icon>
          </span>
          <ui-icon-picker
            class="icon"
            size="small"
            value={group().icon ?? ""}
            aria-label={this.text("groupIcon", { group: name() })}
            title={this.text("groupIcon", { group: name() })}
            on-ui-changed={(event: CustomEvent<{ value: string }>) => this.setIcon(at, event.detail.value)}
          ></ui-icon-picker>
          <ui-input
            class="name"
            size="small"
            appearance="transparent"
            value={name()}
            aria-label={this.text("groupName")}
            on-ui-changed={(event: CustomEvent<{ value: string }>) => this.rename(at, event.detail.value)}
          ></ui-input>
          <ui-icon
            class="remove"
            name="xmark"
            link=""
            label={this.text("removeGroup", { group: name() })}
            title={this.text("removeGroup", { group: name() })}
            onClick={() => this.removeGroup(at)}
          ></ui-icon>
        </header>
        {this.rows(() => group().tags, at)}
      </section>
    )
  }

  /** List `list`'s rows:  each component's icon and name, to drag;  the drop marker where one would land. */
  private rows(tags: () => readonly string[], list: number): JSX.Element {
    const markerAt = (index: number) => this.dropAt?.list === list && this.dropAt.before === index
    return (
      <ul class="rows">
        <For each={tags()}>
          {(tag, index) => (
            <li
              data-tag={tag}
              class={["row", { "drop-before": markerAt(index()) }]}
              draggable="true"
              title={this.definitionOf(tag)?.description ?? ""}
              onDragStart={(event) => this.onTagDragStart(event, tag)}
              onDragEnd={() => this.endDrag()}
            >
              <ui-icon name={this.definitionOf(tag)?.icon ?? "cube"} aria-hidden="true"></ui-icon>
              <span class="label">{this.nameOfTag(tag)}</span>
            </li>
          )}
        </For>
        <li class={["end", { "drop-before": markerAt(tags().length) }]} aria-hidden="true"></li>
      </ul>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIDocsPalette extends E.AttributeValues<DocsPaletteVocabulary> {}

/** One group as it's edited:  its topic or title, and its tags in order. */
type EditedGroup = {
  readonly topic?: PaletteTable["groups"][number]["topic"]
  title?: string
  icon?: string
  tags: string[]
}

/** How the table's load or save went. */
type Status = "loading" | "noServer" | "ready" | "changed" | "saving" | "saved" | "failed"

/** The list number of Not in the palette. */
const NOT_OFFERED = -1
