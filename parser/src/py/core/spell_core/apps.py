"""Apps and drawable things:  what `a game is an app`, `a card is a drawable thing` compile to.

```python
from spell_core import App, h

class Game(App):
    def draw(self):
        return h("div", {"class": "ui container"}, ...)

game = Game()
game.start()   # drawn on the page:  `core.page.body_html()` writes it
```

- The twins of the JavaScript core's `App`, `Drawable` and `DrawableList` (`classes/`).
"""

from spell_core.drawing import Element, h
from spell_core.lists import List
from spell_core.things import Thing, program_core


class App(Thing):
    """A thing that draws a whole application:  what `a game is an app` compiles to, `class Game(App)`.

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


class Drawable(Thing):
    """A thing drawn as its own element (`<solitaire-card>`):  what `a card is a drawable thing` extends.

    - Its tag:  `element_tag`, which each compiled drawable class names in its body.
    - `core.draw_thing()` draws it as that element, its own `draw()` inside;  with no tag, as any thing draws.
    """

    # our element's tag, e.g. `solitaire-card`:  the compiled class names it -- see `core.element_tag_of()`
    element_tag: str | None = None


class DrawableList(List):
    """A list drawn as its own element, its items inside:  `a pile is a drawable list of cards`.

    - Its tag:  `element_tag`, as a `Drawable`'s.
    - `core.draw_thing()` draws it as that element:  its `draw()` inside, its items' elements in the `<slot>`.
      - That's just the `<slot>` by default:  the element shows its items and nothing else.
    """

    # our element's tag, e.g. `solitaire-pile`:  the compiled class names it -- see `core.element_tag_of()`
    element_tag: str | None = None

    def draw(self) -> Element:
        """Our outside, `to draw it`:  the wrapper around our items, a `<slot>` where they show -- just the slot."""
        return h("slot")

    def draw_each_item(self, item: object) -> object:
        """`item` drawn as one of ours, `to draw each item`:  its own drawing, or its text if it can't draw."""
        drawing = program_core().draw_thing(item)
        if drawing is None and item is not None:
            return str(item)
        return drawing
