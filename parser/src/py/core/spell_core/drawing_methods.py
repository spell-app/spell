"""`core`'s drawing:  drawing a thing or a list's items, mounting an app, and the page it's drawn on (P12).

```python
class Tableau(Pile):
    def draw(self):
        return h("div", {"class": "Pile Tableau staggered"}, core.draw_items(self))

h("td", core.draw_thing(stock))   # the stock's own draw(), or nothing for None
game.start()                      # the game is drawn on `core.page`, when the page is written
```

- The twins of the JavaScript core's:
  - `drawThing()`, `drawOwn()`, `drawItems()` and `mountApp()`, in `drawing.ts`
  - `installStyles()`, in `ui.ts`
  - `appElement()`, in `classes/index.ts`
- Python has no page to draw on:  `core.page` stands in for the JavaScript run's fake one.
  - An app mounted on it is drawn each time the page is WRITTEN, not when it starts:
    so it shows its things as they are then, as a live page would.
  - `python -m spell_core.run --page` writes it when the program ends:  what the core contract compares.
- A view is its own element here too, `<solitaire-card>`, as the page shows it (epic `spanish` I5):
  - its own drawing inside, where a browser has its shadow root
  - a viewable list's items' elements in its drawing's `<slot>`
  - So the page prints what the JavaScript run's fake page prints, cards in their piles.
  - Its tag is its class's `element_tag`, which the compiled class names (`element_tag_of()`).
"""

from collections.abc import Callable, Iterator
from typing import TYPE_CHECKING

from spell_core.described import DescribedMethods
from spell_core.drawing import Element, Page, drawn_children, h

if TYPE_CHECKING:
    from spell_core.console import SpellConsole


class MountedApp:
    """An app mounted into an element, as `core.mount_app()` returns it:  `unmount()` takes it down again."""

    def __init__(self, element: Element) -> None:
        """The app drawn into `element`."""
        self.element = element

    def unmount(self) -> None:
        """SIDE EFFECT:  take the app's drawing down, emptying its element."""
        self.element.children.clear()


class DrawingMethods:
    """`core.draw_thing()`, `core.draw_items()`, `core.mount_app()`, `core.install_styles()`, and the page."""

    # DOM `id` of the element an app mounts into when the host set no `app_root`:  `<div id="spell-app-root">`
    REACT_APP_ROOT_ID = "spell-app-root"

    # where a drawing that fails says so:  `Core` sets it
    console: "SpellConsole"

    # the page this core draws on:  `reset_page()` makes it
    page: Page

    # the element an app mounts into, if the host says;  else `#spell-app-root` on the page (`app_element()`)
    app_root: Element | None = None

    def reset_page(self) -> None:
        """SIDE EFFECT:  start a new, empty page:  nothing drawn, no styles."""
        self.page = Page()

    ################
    # ## Drawing things
    ################

    def draw_thing(self, drawable: object = None) -> object:
        """`drawable` drawn -- `None` if it can't draw (no `draw()`).

        - Compiled from `draw the card`, as `h("td", core.draw_thing(stock))`.
        - Takes anything, as it checks:  the last card of an empty pile is `None`, which draws nothing.
        - A VIEW (its class has an `element_tag`) is its element, e.g. `<solitaire-card>`,
          its own drawing inside (`draw_own()`), as the page shows it:  see `element_of()`.
          - A viewable LIST's items are drawn in its drawing's `<slot>` (`draw_items()`).
        - Anything else:  its own drawing, here.
        """
        if not callable(getattr(drawable, "draw", None)):
            return None
        tag = self.element_tag_of(drawable)
        if tag is None:
            return self.draw_own(drawable)
        from spell_core.apps import ViewableList

        items = self.draw_items(drawable) if isinstance(drawable, ViewableList) else None
        return element_of(tag, self.draw_own(drawable), items or [])

    def draw_by_id(self, tag: str, attributes: dict[str, str]) -> Element | None:
        """A view tag the drawing wrote itself, `<tableau "T1"/>`:  the thing its `id` names, drawn, with `attributes`.

        - As the page's element finds it, by its `id` (`thing_called()`):  a name, a chosen id, or a place.
        - `None` when `tag` is no view's, or its id names nothing:  then it's a plain element.
        """
        from spell_core.things import things

        cls = things.class_drawn_as(tag)
        found = self.thing_called(cls, attributes["id"]) if cls is not None else None
        drawn = self.draw_thing(found) if found is not None else None
        if not isinstance(drawn, Element):
            return None
        drawn.attributes.update(attributes)
        return drawn

    def element_tag_of(self, drawable: object = None) -> str | None:
        """Tag of `drawable`'s element, e.g. `solitaire-card` -- `None` if its class has none.

        - The compiled class names it:  `element_tag = "solitaire-card"`, in its body.
        """
        tag = getattr(type(drawable), "element_tag", None)
        return tag if isinstance(tag, str) and tag else None

    def draw_own(self, drawable: object = None) -> object:
        """`drawable`'s own drawing, in its own error boundary -- `None` if it can't draw.

        - A `draw()` that throws shows a stand-in instead, and says so on the console (`drawing_failed()`):
          the rest of the page still draws.
        """
        draw = getattr(drawable, "draw", None)
        if not callable(draw):
            return None
        try:
            return draw()
        except Exception as error:  # one thing that can't draw mustn't stop the page
            return self.drawing_failed(drawable, error)

    def draw_items(self, items: object = None) -> list[object] | None:
        """Each item of spell list `items`, drawn (`draw_thing()`) -- `None` if it isn't a spell list.

        - Compiled from `draw each card in the deck`, as `h("div", ..., core.draw_items(self))`.
        - An item that can't draw shows nothing.
        - A list with its own `to draw each item` (`draw_each_item()`) draws each item with it, as the JavaScript
          core does:  a viewable list's wrapper around each item.
        """
        from spell_core.lists import List

        if not isinstance(items, List):
            return None
        draw_each_item = getattr(items, "draw_each_item", None)
        if not callable(draw_each_item):
            return [self.draw_thing(item) for item in items]
        return [self._draw_each_item_of(items, draw_each_item, item) for item in items]

    def _draw_each_item_of(self, items: object, draw_each_item: Callable[[object], object], item: object) -> object:
        """`item` drawn by its list's `draw_each_item()`, in the list's own error boundary."""
        try:
            return draw_each_item(item)
        except Exception as error:  # one item that can't draw mustn't stop the page
            return self.drawing_failed(items, error)

    def drawing_failed(self, thing: object, error: Exception) -> Element:
        """What a thing whose `draw()` threw shows:  a stand-in naming it, `⚠ Card can't draw`.

        - SIDE EFFECT:  one line on the program's console, on stderr.
        - The JavaScript core's also tells the page (a `ui-error` event):  Python's page has no events.
        """
        type_name = getattr(thing, "type", None) or type(thing).__name__
        self.console.error(f"{type_name}:  draw() failed", repr(error))
        stand_in = self.message("cant-draw", type=type_name)
        return h("span", {"class": "spell-draw-error", "title": str(error), "role": "alert"}, stand_in)

    ################
    # ## Mounting
    ################

    def app_element(self) -> Element | None:
        """The element an app mounts into:  `app_root`, else the page's `#spell-app-root` -- `None` if neither."""
        return self.app_root or self.page.body.find(self.REACT_APP_ROOT_ID)

    def start_drawing(self, view: object) -> None:
        """SIDE EFFECT:  mount `view`'s drawing on the page, into `app_element()` (see `mount_app()`).

        - What `App.start()` and `Page.start()` do:  the JavaScript core's `core.startDrawing()`.
        - Makes the page's `<div id="spell-app-root">` the first time, when the host set no `app_root`.
        - Starting again replaces what's drawn there.
        """
        element = self.app_element()
        if element is None:
            element = Element("div", {"id": self.REACT_APP_ROOT_ID})
            self.page.body.append(element)
        self.mount_app(view, element)

    def mount_app(self, app: object, element: Element) -> MountedApp:
        """Draw `app` into `element`, replacing what was there:  what `App.start()` does, into `app_element()`.

        - The app is drawn each time the page is written (a LIVE drawing), not now:
          things change after `start the game`, and the page shows them as they are.
        """
        element.children[:] = [lambda: self.draw_thing(app)]
        return MountedApp(element)

    def install_styles(self, name: str | None = None, safe_css: str = "") -> None:
        """SIDE EFFECT:  keep a project's CSS on the page, under `name`:  compiled from its `.css` files.

        - `¬` in `safe_css` is a line break, as the compiled text writes one.
        - Kept, never written:  the core contract compares only what's drawn,
          as the JavaScript run's page adds no styles either.
        """
        self.page.styles[name or "anonymous-css"] = safe_css.replace("¬", "\n")

    def use_defaults(self, file: str, defaults: dict[str, dict[str, object]]) -> None:
        """SIDE EFFECT:  keep the app's widget defaults from `file` on the page:  compiled from its `<ui-defaults>`.

        - `defaults`:  tag => attribute => value, in Spell UI's own names, `{"ui-button": {"appearance": "pill"}}`.
        - Kept, never written:  the page's drawing half calls `core.useDefaults()` itself
          (`<Project>.elements.spell.js`), and draws with them.
        """
        self.page.defaults[file] = defaults

    def draw_action(
        self, thing: object, name: str, props: dict[str, object] | None = None, *children: object
    ) -> Element:
        """A button for ONE of the program's actions, `name` (`auto_play`), on `thing` or up its chain:  `<action>`.

        - The twin of the JavaScript core's `drawAction()`, which a page draws it with, live:
          here it's drawn as the page is written, once, as every Python drawing is.
        - A `<ui-button>`:  its text the action's title, its icon, its key in its tooltip, `Auto Play (A)`,
          disabled while it isn't enabled.
        - `props`:  the tag's other attributes, each winning over what the action gives;
          `icon-only` its own, no text, its title its `aria-label`;  `title` its text, over the action's title.
        - The app's own `undo` and `redo` too:  their titles and whether they're enabled follow its history (`apps.py`).
        - An action nobody up the chain has:  a disabled button of its name.
        - `in-menu`, the core's own:  a Spell UI menu or toolbar holds it, so it's the menu's ROW, `<ui-action>`,
          its key in Spell UI's words (`meta+Z` => `mod+Z`);  the page's drawing half hands it the action, live;
          `icon-only` the row's own, its icon alone.
        """
        given = dict(props or {})
        icon_only = given.pop(ICON_ONLY, False)
        in_menu = given.pop(IN_MENU, False)
        # a `title` the tag gives is what it shows, over the action's own:
        # `<action "restart the game" title="Restart"/>`
        given_title = given.pop("title", None)
        holder = next((at for at in self._chain_of(thing) if callable(getattr(at, name, None))), None)
        if holder is not None:
            description = DescribedMethods.actions_of(self, type(holder)).get(name, {})
            live_title = getattr(holder, description.get("title_from") or "", None)
            title = live_title if isinstance(live_title, str) else description.get("title") or _words_of(name)
            if isinstance(given_title, str):
                title = given_title
            enabled_when = description.get("enabled_when")
            is_enabled = bool(getattr(holder, enabled_when)) if enabled_when else True
        else:
            shown = given_title if isinstance(given_title, str) else name
            return h(MENU_ROW_TAG if in_menu else BUTTON_TAG, {"disabled": True, **given}, *(children or (shown,)))
        shortcut = (description.get("shortcuts") or [None])[0]
        if in_menu:
            row: dict[str, object] = {"shortcut": _menu_keys_of(shortcut)} if shortcut else {}
            if icon_only:
                row[ICON_ONLY] = True
            return h(MENU_ROW_TAG, {**row, **given}, *children)
        own: dict[str, object] = {
            "icon": description.get("icon"),
            "title": f"{title} ({_keys_of(shortcut)})" if shortcut else None,
            "disabled": not is_enabled,
        }
        if icon_only:
            own["aria-label"] = title
        text = children if icon_only or children else (title,)
        return h(BUTTON_TAG, {**own, **given}, *text)

    def draw_context_menu(self, thing: object, names: list[object]) -> Element:
        """The right-click menu of the element around it, `<context-menu>`:  a hidden `<spell-context-menu>`.

        - The twin of the JavaScript core's `drawContextMenu()`:  the page draws the menu with its drawing half,
          each action run here;  printed, it's the hidden element alone, as the JavaScript run's page prints it.
        - `names`:  each an action's method, `-` a line, or an action and its tag's attributes,
          `["undo", {"icon-only": True}]`.
        """
        return h(CONTEXT_MENU_TAG, {"hidden": True})

    if TYPE_CHECKING:

        def _chain_of(self, target: object) -> Iterator[object]:
            """`SendingMethods`'s:  `target`, what holds it, up to the running app."""
            ...

        def message(self, key: str, **values: object) -> str:
            """`Messages`'s:  message `key` in the program's language."""
            ...


# What `<action>` draws:  Spell UI's button, which the page defines
BUTTON_TAG = "ui-button"

# What `<context-menu>` draws where it is:  an element that draws nothing, holding its menu on a page
CONTEXT_MENU_TAG = "spell-context-menu"

# `<action>`'s own attribute:  its button shows only its icon
ICON_ONLY = "icon-only"

# `<action>`'s mark that a Spell UI menu or toolbar holds it:  it's the menu's row
IN_MENU = "in-menu"

# What `<action>` draws in a menu:  Spell UI's menu row, which the page defines
MENU_ROW_TAG = "ui-action"


def _keys_of(shortcut: str) -> str:
    """A shortcut as a key tip shows it, as a page off a Mac does:  `meta+shift+Z` is `Ctrl+Shift+Z`, `A` is `A`.

    - The twin of the JavaScript core's `keysOf()`, with no page:  the same text as a JavaScript run with no page.
    """
    *parts, key = [part.strip() for part in shortcut.split("+")]
    names = ["Ctrl" if part.lower() in ("meta", "mod", "control") else part.lower().capitalize() for part in parts]
    return "+".join([*names, key.upper() if len(key) == 1 else key])


def _menu_keys_of(shortcut: str) -> str:
    """A shortcut in Spell UI's words, as a menu's row reads it:  `meta+shift+Z` is `mod+shift+Z`.

    - The twin of the JavaScript core's `menuKeysOf()`.
    """
    return "+".join("mod" if part.strip().lower() == "meta" else part for part in shortcut.split("+"))


def _words_of(name: str) -> str:
    """An action's name in words, in Initial Caps, for one described with no title:  `auto_play` => `Auto Play`."""
    return " ".join(word.capitalize() for word in name.split("_") if word)


################
# ## Drawing an element
################


def element_of(tag: str, drawing: object, children: list[object]) -> Element:
    """Element `<tag>` drawn as the page shows it:  `drawing`, its shadow root, in its place, `children` in its slots.

    - What the JavaScript run's fake page prints (`withShadowsInPlace()`, `runProject.ts`):
      - each `<slot>` replaced by the children it takes:
        the unnamed one those with no `slot` attribute, and text;  `<slot name="header">` those with `slot="header"`
      - a child goes in the FIRST slot that takes it, as a browser puts it;  a slot with none shows its own content,
        e.g. a view's `<slot name="front">` its front (epic `elemental-spell` P27)
    - A view inside `drawing` is already drawn so (`core.draw_thing()`):
      its slots are gone, so only `drawing`'s own are filled here.
    """
    unplaced = drawn_children([children])
    shown = drawn_children([drawing])

    def filled(nodes: list[object]) -> list[object]:
        result: list[object] = []
        for node in nodes:
            if not isinstance(node, Element):
                result.append(node)
            elif node.tag == "slot":
                name = node.attributes.get("name")
                taken = [child for child in unplaced if slot_of(child) == name]
                unplaced[:] = [child for child in unplaced if slot_of(child) != name]
                # nothing put in it:  its own content shows, as a browser shows it (a view's slot drawing itself)
                result.extend(taken if taken else filled(node.children))
            else:
                node.children[:] = filled(node.children)
                result.append(node)
        return result

    return Element(tag, children=filled(shown))


def slot_of(child: object) -> str | None:
    """The slot `child` goes in:  its `slot` attribute, `None` for the unnamed one -- text always goes there."""
    return child.attributes.get("slot") if isinstance(child, Element) else None
