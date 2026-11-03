import { For, Loading, Show, createMemo, createSignal } from "solid-js"
import type { JSX } from "@solidjs/web"

// Import directly, NOT through the `spell/app/lsp` barrel, which would pull the language service into the bundle.
import { firstLine, type ScopeNode } from "spell/app/lsp/lsp.types"
import { editor } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { Markdown } from "./Markdown"
import { SCOPE_ICONS } from "./ScopeDetailsPane"
import { chooseRow, treeChoosesRows } from "./treeRows"

import "./SpellReference.css"

/****************
 * ### `<SpellReference>`
 * What you can use, the Program panel's Reference tab:  your app's templates and Spell's, with what each holds.
 * - ONE tree (`<ui-tree>`):  This app first, your own templates by name;  then Spell's built-ins;
 *   then each project the app imports, by its name.
 * - A template's rows are its members, a property's type or a method's words beside each.
 * - `filter`, the panel header's search, finds any row, closed ones too.
 * - A click shows what it is beside the tree:  its description, and for your own, Show in Code.
 * - Reads the scope tree the editor works out after each compile (`editor.scopeTree`),
 *   and each one's details as it's shown (`editor.scopeDetails()`).
 * - The runners keep `<TypeExplorer>`:  this is the editor's.
 ****************/
export function SpellReference(props: {
  /** Only the rows holding these words. */
  filter?: string
}): JSX.Element {
  const [selected, setSelected] = createSignal<ScopeNode>()
  const groups = createMemo(() => groupsOf(editor.scopeTree))
  return (
    <Show when={editor.scopeTree} fallback={<p class="InspectorTip">{appTexts.text("runToSeeScopes")}</p>}>
      <div class="SpellReference">
        <ui-tree label={appTexts.text("referenceTab")} filter={props.filter ?? ""} ref={treeChoosesRows}>
          <For each={groups()}>
            {(group) => (
              <ui-tree-item group="" label={group.title} which={String(group.nodes.length)} open="">
                <For each={group.nodes} keyed={(node) => node.path}>
                  {(node) => <ReferenceRow node={node()} selected={selected()} onSelect={setSelected} />}
                </For>
              </ui-tree-item>
            )}
          </For>
        </ui-tree>
        <div class="ReferenceDetails">
          <Show when={selected()} keyed fallback={<p class="InspectorTip">{appTexts.text("referenceNothing")}</p>}>
            {(node) => <ReferenceDetails node={node} />}
          </Show>
        </div>
      </div>
    </Show>
  )
}

/** One template or member, with its own members inside it, closed. */
function ReferenceRow(props: {
  node: ScopeNode
  selected: ScopeNode | undefined
  onSelect: (node: ScopeNode) => void
}): JSX.Element {
  return (
    <ui-tree-item
      icon={SCOPE_ICONS[props.node.kind]}
      label={props.node.name}
      which={props.node.detail}
      selected={props.selected?.path === props.node.path}
      ref={chooseRow(() => props.onSelect(props.node))}
    >
      <For each={props.node.children} keyed={(child) => child.path}>
        {(child) => <ReferenceRow node={child()} selected={props.selected} onSelect={props.onSelect} />}
      </For>
    </ui-tree-item>
  )
}

/** What `node` is:  its name and kind, its description, and where it's written, for your own. */
function ReferenceDetails(props: { node: ScopeNode }): JSX.Element {
  const details = createMemo(async () => editor.scopeDetails(props.node.path))
  const place = () => {
    const at = details()?.line
    const uri = details()?.uri ?? props.node.uri
    return uri && at !== undefined && uri.startsWith("spell:") ? `${uri}#L${firstLine(at)}` : undefined
  }
  return (
    <>
      <h4>
        <ui-icon name={SCOPE_ICONS[props.node.kind]} /> {props.node.name}
        <Show when={props.node.detail}>
          <span class="which">{props.node.detail}</span>
        </Show>
      </h4>
      <Loading>
        <Show when={details()?.description}>{(text) => <Markdown text={text()} onOpen={editor.openScopeLink} />}</Show>
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

/** A group of the reference:  its title, and the templates in it. */
type ReferenceGroup = { title: string; nodes: ScopeNode[] }

/**
 * The reference's groups, from the editor's scope tree:
 * - This app:  what the project's files declare, each by name, its files left out
 * - Spell:  the built-ins, the root's own
 * - each project it imports, by its name
 * - The project is the root's last child (`LSP.ScopeExplorer`).
 */
function groupsOf(tree: ScopeNode | undefined): ReferenceGroup[] {
  if (!tree) return []
  const projects = tree.children.filter((child) => child.kind === "project")
  const app = projects.at(-1)
  const declaredIn = (project: ScopeNode) =>
    project.children.flatMap((child) => (child.kind === "file" ? child.children : [child]))
  return [
    ...(app ? [{ title: appTexts.text("thisApp"), nodes: byName(declaredIn(app)) }] : []),
    { title: appTexts.text("referenceSpell"), nodes: tree.children.filter((child) => child.kind !== "project") },
    ...projects.slice(0, -1).map((project) => ({ title: project.name, nodes: byName(declaredIn(project)) }))
  ].filter((group) => group.nodes.length)
}

/** `nodes` by name, ignoring case. */
function byName(nodes: ScopeNode[]): ScopeNode[] {
  return [...nodes].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
}
