import { For, Loading, Show, createMemo, createSignal } from "solid-js"
import type { JSX } from "@solidjs/web"

import { withArticle } from "spell/util"
// Import directly, NOT through the `spell/app/lsp` barrel, which would pull the language service into the bundle.
import { firstLine, type ScopeNode } from "spell/app/lsp/lsp.types"
import { editor } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { ACTION_ICON, THING_ICON, typeWordsOf } from "./Inspector"
import { Markdown } from "./Markdown"
import { SCOPE_ICONS } from "./ScopeDetailsPane"
import { chooseRow, treeChoosesRows } from "./treeRows"

import "./SpellReference.css"

/****************
 * ### `<SpellReference>`
 * What you can use:  your app's templates and Spell's, with what each holds.
 * - In the Program panel's Reference tab, and the Inspector's Views card's (epic `editor` T104).
 * - ONE tree (`<ui-tree>`):  This app first, your own templates as the program declares them;
 *   then Spell's built-ins;  then each project the app imports, by its name.
 * - A template's rows are its members, in program order, each as `rowLookOf()` says:
 *   a thing it holds by its type then name (`Deck "deck"`), an action with a circled play, a test with a vial.
 * - `filter`, the header's search, finds any row, closed ones too.
 * - A click shows what it is beside the tree (`stacked`:  under it):  its description, and for your own, Show in Code.
 * - Reads the scope tree the editor works out after each compile (`editor.scopeTree`),
 *   and each one's details as it's shown (`editor.scopeDetails()`).
 * - The runners keep `<TypeExplorer>`:  this is the editor's.
 ****************/
export function SpellReference(props: {
  /** Only the rows holding these words. */
  filter?: string
  /** What's picked under the tree, not beside it:  for a narrow column (the Inspector's). */
  stacked?: boolean
}): JSX.Element {
  const [selected, setSelected] = createSignal<ScopeNode>()
  const groups = createMemo(() => groupsOf(editor.scopeTree))
  const types = createMemo(() => typesIn(editor.scopeTree))
  return (
    <Show when={editor.scopeTree} fallback={<p class="InspectorTip">{appTexts.text("runToSeeScopes")}</p>}>
      <div class={["SpellReference", { stacked: props.stacked }]}>
        <ui-tree label={appTexts.text("referenceTab")} filter={props.filter ?? ""} ref={treeChoosesRows}>
          <For each={groups()}>
            {(group) => (
              <ui-tree-item group="" label={group.title} which={String(group.nodes.length)} open="">
                <For each={group.nodes} keyed={(node) => node.path}>
                  {(node) => (
                    <ReferenceRow node={node()} types={types()} selected={selected()} onSelect={setSelected} />
                  )}
                </For>
              </ui-tree-item>
            )}
          </For>
        </ui-tree>
        <div class="ReferenceDetails">
          <Show when={selected()} keyed fallback={<p class="InspectorTip">{appTexts.text("referenceNothing")}</p>}>
            {(node) => <ReferenceDetails node={node} types={types()} />}
          </Show>
        </div>
      </div>
    </Show>
  )
}

/** One template or member, with its own members inside it, closed. */
function ReferenceRow(props: {
  node: ScopeNode
  types: ReadonlyMap<string, ScopeNode>
  selected: ScopeNode | undefined
  onSelect: (node: ScopeNode) => void
}): JSX.Element {
  const look = () => rowLookOf(props.node, props.types)
  return (
    <ui-tree-item
      icon={look().icon}
      label={look().label}
      which={look().which}
      selected={props.selected?.path === props.node.path}
      ref={chooseRow(() => props.onSelect(props.node))}
    >
      <For each={props.node.children} keyed={(child) => child.path}>
        {(child) => (
          <ReferenceRow node={child()} types={props.types} selected={props.selected} onSelect={props.onSelect} />
        )}
      </For>
    </ui-tree-item>
  )
}

/**
 * What `node` is:  its name and kind, its description, and where it's written, for your own.
 * - A thing it holds with no comment of its own says what it is from its type's:
 *   `a Deck of playing cards named "deck"` (`instanceWords()`).
 */
function ReferenceDetails(props: { node: ScopeNode; types: ReadonlyMap<string, ScopeNode> }): JSX.Element {
  const look = () => rowLookOf(props.node, props.types)
  const details = createMemo(async () => editor.scopeDetails(props.node.path))
  const typeDetails = createMemo(async () => {
    const type = look().type
    return type ? editor.scopeDetails(type.path) : null
  })
  const description = () =>
    details()?.description ||
    (look().type ? instanceWords(props.node, look().type!, typeDetails()?.description) : undefined)
  const place = () => {
    const at = details()?.line
    const uri = details()?.uri ?? props.node.uri
    return uri && at !== undefined && uri.startsWith("spell:") ? `${uri}#L${firstLine(at)}` : undefined
  }
  return (
    <>
      <h4>
        <ui-icon name={look().icon} /> {look().label}
        <Show when={look().which}>
          <span class="which">{look().which}</span>
        </Show>
      </h4>
      <Loading>
        <Show when={description()}>{(text) => <Markdown text={text()} onOpen={editor.openScopeLink} />}</Show>
        <Show when={place()}>
          {(href) => (
            <ui-button size="small" appearance="basic" onClick={() => editor.openScopeLink(href())}>
              {appTexts.text("referenceShowInCode")}
            </ui-button>
          )}
        </Show>
      </Loading>
    </>
  )
}

/** How a row of the reference looks:  its icon, its words, and the muted words after them. */
type RowLook = {
  icon: string
  label: string
  which?: string
  /** A thing it holds:  the type of thing (`Deck`). */
  type?: ScopeNode
}

/**
 * How `node`'s row looks (Owen, 2026-11-16, epic `editor` T104):
 * - a property or top-level thing holding a thing (`deck`, a `Deck`;  `solitaire`):  a thing's cube, its type then its name, as the Views tree
 *   says it:  `Deck "deck"`, `Stock Pile "stock"`
 * - a test (`test a new deck`, declared at the top level):  a vial with a check
 * - any other method (`draw solitaire`, `restart the game`):  a circled play, as every action shows
 * - else its kind's icon, its name, then its detail (`score number`, `Card is a TwoSidedView`)
 * - `types`:  every type in the tree, by name (`typesIn()`).
 */
function rowLookOf(node: ScopeNode, types: ReadonlyMap<string, ScopeNode>): RowLook {
  const holds = node.kind === "property" || node.kind === "variable"
  const type = holds && node.detail ? types.get(node.detail) : undefined
  if (type) return { icon: THING_ICON, label: typeWordsOf(type.name), which: `"${node.name}"`, type }
  if (TEST.test(node.name) && (node.kind === "method" || node.kind === "function")) {
    return { icon: TEST_ICON, label: node.name }
  }
  if (node.kind === "method") return { icon: ACTION_ICON, label: node.name }
  return { icon: SCOPE_ICONS[node.kind], label: node.name, which: node.detail }
}

/** A test's name:  `test a new deck`, as the language server names one (`ScopeExplorer.methodName()`). */
const TEST = /^test\b/
/** A test's icon, Font Awesome's vial with a check. */
const TEST_ICON = "fa7-free:vial-circle-check"

/**
 * What a thing held by a property is, from its type's description, for one with no comment of its own:
 * `a Deck of playing cards named "deck"`, Deck's being `a deck of playing cards`.
 * - The type's description's first line, less its own `a deck` at its start, follows the type's words.
 * - A type with none:  `a Foundation named "clubs"`.
 */
function instanceWords(node: ScopeNode, type: ScopeNode, typeDescription = ""): string {
  const Type = typeWordsOf(type.name)
  const words = Type.split(/\s+/).map(escapeForRegExp).join("\\s+")
  const said = typeDescription
    .split("\n")[0]
    .trim()
    .replace(/[.:;]$/, "")
  const startsWithType = new RegExp(`^(?:an?|the|una?|el|la)\\s+${words}\\b`, "i").exec(said)
  const more = startsWithType ? said.slice(startsWithType[0].length) : ""
  return appTexts.text("referenceInstance", { aType: withArticle(Type), Type, more, name: node.name })
}

/** `text` safe inside a regular expression. */
function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Every type in `tree`, by its name:  what a property's type (`Deck`) is looked up in. */
function typesIn(tree: ScopeNode | undefined): Map<string, ScopeNode> {
  const types = new Map<string, ScopeNode>()
  const walk = (node: ScopeNode): void => {
    if (node.kind === "type" && !types.has(node.name)) types.set(node.name, node)
    if (node.kind === "root" || node.kind === "project" || node.kind === "file") node.children.forEach(walk)
  }
  if (tree) walk(tree)
  return types
}

/** A group of the reference:  its title, and the templates in it. */
type ReferenceGroup = { title: string; nodes: ScopeNode[] }

/**
 * The reference's groups, from the editor's scope tree:
 * - This app:  what the project's files declare, in program order (its files' order, then each one's own),
 *   its files left out
 * - Spell:  the built-ins, the root's own
 * - each project it imports, by its name, in its program order too
 * - The project is the root's last child (`LSP.ScopeExplorer`).
 */
function groupsOf(tree: ScopeNode | undefined): ReferenceGroup[] {
  if (!tree) return []
  const projects = tree.children.filter((child) => child.kind === "project")
  const app = projects.at(-1)
  const declaredIn = (project: ScopeNode) =>
    project.children.flatMap((child) => (child.kind === "file" ? child.children : [child]))
  return [
    ...(app ? [{ title: appTexts.text("thisApp"), nodes: declaredIn(app) }] : []),
    { title: appTexts.text("referenceSpell"), nodes: tree.children.filter((child) => child.kind !== "project") },
    ...projects.slice(0, -1).map((project) => ({ title: project.name, nodes: declaredIn(project) }))
  ].filter((group) => group.nodes.length)
}
