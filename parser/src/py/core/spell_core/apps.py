"""Apps and views:  what `a game is an app`, `a card is a view` compile to.

```python
from spell_core import App, h

class Game(App):
    def draw(self):
        return h("div", {"class": "ui container"}, ...)

game = Game()
game.start()   # drawn on the page:  `core.page.body_html()` writes it
```

- The twins of the JavaScript core's `App`, `View`, `Page`, `TwoSidedView` and `ViewableList` (`classes/`).
"""

from spell_core.drawing import Element, h
from spell_core.lists import List
from spell_core.things import Thing, program_core


class View(Thing):
    """A thing drawn as its own element (`<solitaire-card>`):  what `a card is a view` extends.

    - Its tag:  `element_tag`, which each compiled view class names in its body.
    - `core.draw_thing()` draws it as that element, its own `draw()` inside;  with no tag, as any thing draws.
    """

    # our element's tag, e.g. `solitaire-card`:  the compiled class names it -- see `core.element_tag_of()`
    element_tag: str | None = None
    # may a page let people drag our things?  `a card can be dragged` says yes -- the JavaScript core's `canBeDragged`
    can_be_dragged: bool = False
    # may a page let people select our things?  `a task can be selected` says yes -- `canBeSelected`
    can_be_selected: bool = False


class App(View):
    """A view that draws a whole application:  what `a game is an app` compiles to, `class Game(App)`.

    - Its element is named for its project and `app`, not its class:  `<solitaire-app>` (epic `elemental-spell` Q62);
      the compiled class names it, `element_tag = "solitaire-app"`.
    - Its `draw()` is compiled from `to draw (a game)`;  `start()` from `start the game`.
    """

    def start(self) -> None:
        """SIDE EFFECT:  mount our drawing on the page, into `core.app_element()` (see `core.mount_app()`).

        - Makes the page's `<div id="spell-app-root">` the first time, when the host set no `core.app_root`.
        - Starting again replaces the app drawn there.
        - Drawn when the page is written, not now:  the page shows the app as it is then.
        """
        core = program_core()
        element = core.app_element()
        if element is None:
            element = Element("div", {"id": core.REACT_APP_ROOT_ID})
            core.page.body.append(element)
        core.mount_app(self, element)


class Page(View):
    """A view people reach by its own address:  what `a home is a page` extends.

    - NOTE:  its address, and moving from page to page, aren't built yet:  for now it's drawn as any view is.
    """


class TwoSidedView(View):
    """A view with a front and a back, face up or face down:  what `a card is a two sided view` extends.

    - NOTE:  empty for now, as the JavaScript core's:  its own words and its front and back come with parts.
    """


class ViewableList(List):
    """A list drawn as its own element, its items inside:  `a pile is a viewable list of cards`.

    - Its tag:  `element_tag`, as a `View`'s.
    - `core.draw_thing()` draws it as that element:  its `draw()` inside, its items' elements in the `<slot>`.
      - That's just the `<slot>` by default:  the element shows its items and nothing else,
        or its placeholder while it's empty (`draw_its_placeholder()`).
    """

    # our element's tag, e.g. `solitaire-pile`:  the compiled class names it -- see `core.element_tag_of()`
    element_tag: str | None = None
    # may a page let people drop a thing on our lists?  `a pile can be dropped on` says yes -- `canBeDroppedOn`
    can_be_dropped_on: bool = False
    # may a page let people drag our lists themselves?  `a pile can be dragged`
    can_be_dragged: bool = False
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
