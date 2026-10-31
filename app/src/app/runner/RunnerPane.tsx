import { For, Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import "./RunnerPane.css"

/****************
 * ### `<RunnerPane>`
 * One of a runner's panes:  a toolbar of `tabs`, then `children`, what tab `pane` shows.
 * - It's a `<ui-panel appearance="pane">`:  ONE bar, the same as every header's in the editor.
 * - Its header:  the toolbar, then `tools`, if any, in the toolbar's `right` slot:
 *   plain `<ui-icon link>`s, each with a `title`, e.g. the editor's Restart
 *   (an item there wouldn't take the menu's look).
 * - A single tab just says what it is.
 * - Tabs are `<ui-item>`s in a `<ui-toolbar appearance="segmented header">`:  the theme's segmented tabs, no track, the chosen one raised.  In a narrow pane they scroll sideways, with `‹` / `›` buttons,
 *   never wrapping, and `tools` stay at the right, on the same bar.
 *   Whoever mounts a runner defines the `<ui-*>` tags,
 *   with `spell/app/app/solid/loadUI`, or a root around it (`<spell-viewer>`),
 *   and gives it Fomantic's icon names (`<ui-root icons="fomantic">`, `<spell-viewer>`'s default `icons`).
 * - HACK: each tab's icon is a slotted `<ui-icon>`, not the item's `icon`:
 *   `<ui-menu>` draws that at 0 x 0 (epic page I1, as `spell/app/app/solid`'s `<Action>`).
 * - SEE:  its App UI components page, `app/docs/RunnerPane.html` (`/components/app/RunnerPane.html`).
 ****************/
export function RunnerPane<Id extends string>(props: RunnerPaneProps<Id>) {
  // what a screen reader calls the pane:  the tab it shows
  const showing = () => props.tabs.find((tab) => tab.id === props.pane)?.title
  return (
    <ui-panel appearance="pane" class={["RunnerPane", props.class]} label={showing()}>
      <ui-toolbar
        slot="actions"
        appearance="segmented header"
        tabs=""
        shrinkable=""
        scroll-first=""
        class="RunnerPaneToolbar"
        label={showing()}
      >
        <For each={props.tabs}>
          {(tab) => (
            <ui-item
              appearance={props.onPane ? "link" : undefined}
              selected={props.pane === tab.id}
              data-tab={tab.id}
              onClick={() => props.onPane?.(tab.id)}
            >
              <ui-icon name={tab.icon} />
              {tab.title}
            </ui-item>
          )}
        </For>
        <Show when={props.tools}>
          <span slot="right" class="RunnerPaneTools">
            {props.tools}
          </span>
        </Show>
      </ui-toolbar>
      {props.children}
    </ui-panel>
  )
}

/** Props for `<RunnerPane>`. */
export type RunnerPaneProps<Id extends string> = {
  /** Tabs in its toolbar, in order. */
  tabs: RunnerTab<Id>[]
  /** Id of the tab showing. */
  pane: Id
  /** Tab clicked -- none if there's nothing to switch to. */
  onPane?: (pane: Id) => void
  /** What `pane` shows. */
  children?: JSX.Element
  /** Plain `<ui-icon link>`s at the header's right, beside the toolbar, whatever tab shows, e.g. Restart. */
  tools?: JSX.Element
  /** Class of the pane, beside `RunnerPane`. */
  class?: string
}

/** One tab of a `<RunnerPane>`'s toolbar. */
export type RunnerTab<Id extends string> = {
  /** Which it is, e.g. `"types"`. */
  id: Id
  /** Icon, by Fomantic's name, e.g. `sitemap`. */
  icon: string
  /** What it says, e.g. `Type Explorer`. */
  title: string
}
