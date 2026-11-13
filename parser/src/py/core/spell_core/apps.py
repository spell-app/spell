"""Apps and views:  what `a game is an app`, `a card is a view` compile to.

```python
from spell_core import App, h

class Game(App):
    def draw(self):
        return h("div", {"class": "ui container"}, ...)

game = Game()
game.start()   # drawn on the page:  `core.page.body_html()` writes it
```

- The twins of the JavaScript core's `App`, `View`, `Page` and `ViewableList` (`classes/`).
- `TwoSidedView` is a built-in template written in spell:  generated, in `two_sided_view.py`.
"""

from typing import Any

from spell_core.described import describe_action
from spell_core.drawing import h
from spell_core.lists import List
from spell_core.things import Thing, program_core, prop


class View(Thing):
    """A thing drawn as its own element (`<solitaire-card>`):  what `a card is a view` extends.

    - Its tag:  `element_tag`, which each compiled view class names in its body.
    - `core.draw_thing()` draws it as that element, its own `draw()` inside;  with no tag, as any thing draws.
    """

    # a picture of it, a file of its project:  drawn while it has no drawing of its own (`to draw it`, in the page)
    thumbnail = prop()
    # our element's tag, e.g. `solitaire-card`:  the compiled class names it -- see `core.element_tag_of()`
    element_tag: str | None = None
    # may a page let people drag our things?  `- it is draggable` says yes -- the JavaScript core's `draggable`;
    # `- draggable when ...` adds a getter, `draggable_when`
    draggable: bool = False
    # may a page let people click our things?  `- it is clickable` says yes, or its `- on click:` -- `clickable`
    clickable: bool = False
    # may a page let people select our things?  `- it is selectable` says yes -- `selectable`
    selectable: bool = False


class App(View):
    """A view that draws a whole application:  what `a game is an app` compiles to, `class Game(App)`.

    - Its element is named for its project and `app`, not its class:  `<solitaire-app>` (epic `elemental-spell` Q62);
      the compiled class names it, `element_tag = "solitaire-app"`.
    - Its `draw()` is compiled from `to draw (a game)`;  `start()` from `start the game`.
    """

    def __init__(self, *args: Any, **props: Any) -> None:
        """SIDE EFFECT:  the running program's first app is its app, `core.RUNTIME.app`:  see `core.send()`."""
        super().__init__(*args, **props)
        runtime = program_core().RUNTIME
        if runtime.app is None:
            runtime.app = self

    def start(self) -> None:
        """SIDE EFFECT:  mount our drawing on the page, into `core.app_element()`:  see `start_drawing()`."""
        start_drawing(self)

    ################
    # ## Undo and redo
    ################

    def undo(self) -> bool:
        """Undo the newest step:  what the program's last undoable action changed, put back.

        - False with nothing to undo, or while an undoable action still runs.
        - The run's history, `core.RUNTIME.history`:  see `undoing.py`.
        """
        return program_core().RUNTIME.history.undo()

    def redo(self) -> bool:
        """Redo the step undone last;  false with none."""
        return program_core().RUNTIME.history.redo()

    @property
    def can_undo(self) -> bool:
        """Is there a step to undo?  A page drawing us hears of each change (`"$history"`, `state.py`)."""
        return program_core().RUNTIME.history.can_undo

    @property
    def can_redo(self) -> bool:
        """Is there a step to redo?"""
        return program_core().RUNTIME.history.can_redo

    @property
    def undo_title(self) -> str:
        """The Edit menu's undo item, in the program's language:  `Undo Turn Card`, or `Undo` with nothing to undo."""
        return program_core().RUNTIME.history.undo_title

    @property
    def redo_title(self) -> str:
        """The Edit menu's redo item:  `Redo Turn Card`, or `Redo`."""
        return program_core().RUNTIME.history.redo_title


# `undo` and `redo` are the app's own ACTIONS, as the JavaScript core's `App` describes them:  a menu or `<action>`
# names them, and draws them with their live titles, greyed out with nothing to undo
describe_action(
    App,
    "undo",
    {
        "title": "undo",
        "title_from": "undo_title",
        "icon": "undo",
        "shortcuts": ["meta+Z"],
        "enabled_when": "can_undo",
        "refused_while_busy": True,
    },
)
describe_action(
    App,
    "redo",
    {
        "title": "redo",
        "title_from": "redo_title",
        "icon": "redo",
        "shortcuts": ["meta+shift+Z"],
        "enabled_when": "can_redo",
        "refused_while_busy": True,
    },
)


class Page(View):
    """A view people reach by its own address:  what `a home is a page` extends.

    - NOTE:  its address, and moving from page to page, aren't built yet:  for now it's drawn as any view is.
    - It hears what the program triggers by its own handler, as its app does:  see `core.trigger()`.
    - Its `lock`:  whether what's changed on the page is saved (epic `notebook` P1, Q8).
    """

    # what its `lock` may be:  `unlocked` (the default) or `locked`
    LOCKS = ("unlocked", "locked")
    # whether the page may be changed:  in a locked page every edit is a try-out, saved for nobody
    lock = prop(one_of=LOCKS)

    def __init__(self, *args: Any, **props: Any) -> None:
        """SIDE EFFECT:  the running program's pages are listed as they're made, `core.RUNTIME.pages`."""
        super().__init__(*args, **props)
        program_core().RUNTIME.pages.append(self)

    def start(self) -> None:
        """SIDE EFFECT:  draw this page as the program's page, as an app starts:  see `start_drawing()`.

        - Compiles from `start the counter notebook`, which a `.spell` page that draws its body says by itself
          (epic `elemental-spell` P16).
        """
        start_drawing(self)


def start_drawing(view: View) -> None:
    """SIDE EFFECT:  mount `view`'s drawing on the page:  `core.start_drawing()`.

    - What `App.start()` and `Page.start()` do.
    """
    program_core().start_drawing(view)


class ViewableList(List):
    """A list drawn as its own element, its items inside:  `a pile is a viewable list of cards`.

    - Its tag:  `element_tag`, as a `View`'s.
    - `core.draw_thing()` draws it as that element:  its `draw()` inside, its items' elements in the `<slot>`.
      - That's just the `<slot>` by default:  the element shows its items and nothing else,
        or its placeholder while it's empty (`draw_its_placeholder()`).
    """

    # our element's tag, e.g. `solitaire-pile`:  the compiled class names it -- see `core.element_tag_of()`
    element_tag: str | None = None
    # may a page let people drop a thing on our lists?  `- it is droppable` says yes -- `droppable`
    droppable: bool = False
    # may a page let people drag, click or select our lists themselves?  `- it is draggable` ...
    draggable: bool = False
    clickable: bool = False
    selectable: bool = False
    # do our items drag by our own rule?  `- its cards are draggable when ...` says yes -- `itemsDraggable`
    items_draggable: bool = False
    # how many seconds a page waits before dragged items move into place, if people may reorder our items:
    # `- its items can be reordered` says 2 -- `reorderItemsAfter`;  `None`:  they may not
    reorder_items_after: float | None = None

    @property
    def selection(self) -> list[object]:
        """Our items people selected on the page:  `the selection of the tasks` -- see the JavaScript core's.

        - The page's alone:  a program running in Python never hears of it, so here it's always empty.
        """
        return []

    def draw(self) -> object:
        """Our outside, `to draw it`:  the wrapper around our items, a `<slot>` where they show.

        - By default the slot, after our placeholder while we're empty (`draw_its_placeholder()`).
        """
        placeholder = self.draw_its_placeholder() if self.is_empty else None
        return [placeholder, h("slot")] if placeholder is not None else h("slot")

    def draw_its_placeholder(self) -> object:
        """What we show while we're empty, `to draw its placeholder` -- nothing, unless a sub-class says.

        - e.g. a stock pile's face-down card:  the JavaScript core's `List.drawItsPlaceholder()`.
        """
        return None

    def draw_each_item(self, item: object) -> object:
        """`item` drawn as one of ours, `to draw each item`:  its own drawing, or its text if it can't draw."""
        drawing = program_core().draw_thing(item)
        if drawing is None and item is not None:
            return str(item)
        return drawing
