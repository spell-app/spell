"""`core` talking to the person running the program, a toast or a dialog:  the twin of the JavaScript core's `ui.ts`.

```python
core.notify("Saved!")                              # a toast, not waited for
await core.notify("Saved!", {"time": 2})           # `notify "Saved!" for 2 seconds and wait`
await core.alert("You won!", "New game")           # a dialog, until it's closed
await core.alert("You won!", {"title": "Solitaire", "size": "big"})  # `alert ... titled "Solitaire" in big text`
if await core.confirm("Deal again?"): ...          # yes or no
name = await core.prompt("Your name?", "Ann")      # the text typed, or `None` if cancelled
card = await core.choose(cards, {"thing": "a card"})  # the card picked, or `None` if cancelled
```

- What spell's `rules/UI/` compile to:  `notify`, `alert`, `warn`, `confirm`, `prompt`;
  `choose`, `choose_color`;  and `open_printing`;
  `play`, `stop` and `load_sound` (`play "card slide"`), which the page plays;
  and `show_drawn`, `hide_drawn` (`show "you won"`), which the page carries out.
  - Each takes what the JavaScript core's takes, in the same order, and answers as it does.
  - `alert`, `warn`, `confirm` and `prompt` are `async`:  the Python writer awaits them, as javascript's are.
  - `notify` isn't:  a toast is an aside, so the program carries on.
    Only `notify ... and wait` waits, and awaits what it returns.
- With a page (a Quart app, `spell_quart`):  the PAGE shows it, with Spell UI's own toast or dialog, and answers.
  - The host sets `ask_page`:  how to ask the page, and wait for its answer, e.g. a `PageAsks`'s `ask()`.
  - The page is sent `{"ui": "confirm", "args": ["Deal again?"], "asks": 3}`,
    and answers `{"answer": 3, "value": true}` (`connectPage()`, in the JavaScript core's `page.ts`).
- With no page (`spell run`):  printed on the program's console, as the JavaScript core prints them with no Spell UI.
  - A question takes its default answer:  `confirm`, yes;  `prompt`, its starting text.
  - Except in a terminal, where `confirm` and `prompt` read the answer typed (`answer_typed`).
- Imports nothing of the core's:  `Core` mixes it in.
"""

import asyncio
import re
import sys
from collections.abc import Awaitable, Callable, Generator, Iterable
from typing import TYPE_CHECKING, Any, NamedTuple

if TYPE_CHECKING:
    from spell_core.console import SpellConsole

# How a host asks its page to show one of these (`ask_page`):  the core's method, its arguments;  the page's answer
AskPage = Callable[[str, list[Any]], Awaitable[Any]]

# Yes, typed at a terminal for `confirm`:  anything else is no
YES_TYPED = ("y", "yes", "")

# A dialog's options, by the JavaScript core's names (`DialogOptions`):  `title`, `size`, `okText`, `cancelText`
DialogOptions = dict[str, Any]

# What `choose` takes after what it picks from, by the JavaScript core's names (`ChooseOptions`):
# `thing` or `things`, `prompt`, `shown`, `least`, `most`
ChooseOptions = dict[str, Any]

# Spell UI's colors, by their hue names:  what `choose a color` offers (`spell/util`'s `SPELL_COLORS`)
SPELL_COLORS = (
    "red",
    "orange",
    "yellow",
    "olive",
    "green",
    "teal",
    "blue",
    "violet",
    "purple",
    "pink",
    "brown",
    "grey",
    "black",
)

# A Python name's `_x`, which javascript writes `X`:  `ok_text` is `okText`
SNAKE_WORD = re.compile(r"_([a-z])")

# What a frame asking the page names its method by, `{"ui": "alert", ...}`;  its number by;  the page's answer by
UI_KEY = "ui"

# What a dialog answers, `the result`:  ok, and cancel (epic `language` T155)
OK = "ok"
CANCEL = "cancel"

# What `_ask_page_soon()` asked and nobody waits for, kept until it's done
_ASKED_SOON: set["asyncio.Future[None]"] = set()
ASKS_KEY = "asks"
ANSWER_KEY = "answer"


class UIMethods:
    """`core.notify()`, `alert()`, `confirm()`, `open_printing()`, `show_drawn()` and the rest:  see the module docs."""

    # where they print with no page:  `Core` sets it
    console: "SpellConsole"
    # the core's messages in the program's language:  `MessageMethods`'s
    message: Callable[..., str]

    # How to ask the page drawing the program, and wait for its answer:  a host sets it (`spell_quart`'s `Visit.ask()`).
    # - None:  no page, so each prints instead.
    ask_page: AskPage | None = None

    # What closed the last dialog, `the result` (`result()`):  `None` until one has
    _result: object = None
    # The call running now said `... without closing` (`keep_open()`)
    _kept_open: bool = False

    # the core's runtime, whose queue a modal's call may pass (`let_modal_call_run()`):  `Core`'s
    RUNTIME: Any
    # the test running now, if any:  `SpellTests`'s;  a test plays no sounds
    active_test: Any

    @property
    def _shown_by(self) -> "dict[str, asyncio.Task[Any] | None]":
        """The task waiting on each modal shown, by its id:  `show_drawn()`'s, one dict per core."""
        found = self.__dict__.get("_shown_by_tasks")
        if found is None:
            found = self.__dict__["_shown_by_tasks"] = {}
        return found

    @property
    def _shown_things(self) -> dict[str, object]:
        """What each modal was last shown with, by its id:  `show_drawn()`'s `thing`, one dict per core."""
        found = self.__dict__.get("_shown_things_by_id")
        if found is None:
            found = self.__dict__["_shown_things_by_id"] = {}
        return found

    # How a thing goes to the page in a question, `show "edit card" with the card`:  by its id, `{"$id": "3"}`.
    # - The page's session sets it (`PageSession`);  `None`:  as it is.
    refer_to_thing: Callable[[object], object] | None = None

    # Read an answer typed at a terminal, for `confirm` and `prompt` with no page:  `None` to take the default.
    # - A test sets its own.
    answer_typed: Callable[[str], str | None] | None = None

    def notify(self, message: object, options: dict[str, Any] | None = None) -> "ToastShown":
        """Show `message` for a moment, in a toast:  compiled from `notify "Saved!"`.

        - `options`, from the clauses written after the message, by the JavaScript core's names (`NotifyOptions`):
          `{"class": "success", "position": "top right", "time": 5, "units": "seconds"}`
        - Returns what `notify ... and wait` awaits:  the toast being gone.
          Not awaited, it goes on by itself.
        - No page:  printed on the console, and gone at once.
        - NEVER throws:  a toast the page can't show is said on the console.
        """
        args: list[Any] = [str(message), *([options] if options else [])]
        if self.ask_page is None or not _is_loop_running():
            self.console.info(str(message))
            return ToastShown(None)
        return ToastShown(asyncio.ensure_future(self._ask_or_say("notify", args)))

    def open_printing(self) -> None:
        """Open the browser's Print dialog for the app alone:  compiled from `open printing`.

        - With a page:  the page opens it, as the JavaScript core's `openPrinting()` does.  Not awaited.
        - No page:  nothing, as the JavaScript core does under node.
        - NEVER throws.
        """
        self._ask_page_soon("openPrinting", [])

    def play(self, sound: str | None) -> None:
        """Play `sound`, a built-in sound's name or a sound file's address:  compiled from `play "card slide"`.

        - With a page:  the page plays it, as the JavaScript core's `play()` does.  Not awaited.
        - No page, or while a test runs:  nothing, as the JavaScript core does under node and in a test.
        - NEVER throws.
        """
        if sound and not self.active_test:
            self._ask_page_soon("play", [sound])

    def stop(self, sound: str | None) -> None:
        """Stop `sound` and put it back to its start:  compiled from `stop "card slide"`.  As `play()`, but stopping."""
        if sound:
            self._ask_page_soon("stop", [sound])

    def load_sound(self, sound: str | None) -> None:
        """Have the page start loading `sound`, so a later `play` starts at once:  compiled from `load "card slide"`."""
        if sound:
            self._ask_page_soon("loadSound", [sound])

    async def alert(self, message: object, ok_text: "str | DialogOptions | None" = None) -> None:
        """Show `message` in a dialog, and wait until it's closed:  compiled from `alert "Yo!"`.

        - `ok_text`:  its button's words, `alert "You won!" with "New game"`;  none, Spell UI's own.
          Once a title or a size is written, the dialog's options instead, by the JavaScript core's names
          (`DialogOptions`):  `{"title": "Solitaire", "size": "big", "ok_text": "New game"}`,
          handed to the page by javascript's names (`okText`:  `_page_options()`).
        - No page:  printed on the console.
        """
        if self.ask_page is None:
            self.console.info(str(message))
        else:
            await self.ask_page("alert", _args(message, _page_options(ok_text)))
        self._result = OK

    async def warn(self, message: object, ok_text: "str | DialogOptions | None" = None) -> None:
        """Warn the person in a dialog, and wait until it's closed:  compiled from `warn "Careful!"`.

        - No page:  printed as a warning on the console.
        """
        if self.ask_page is None:
            self.console.warn(str(message))
        else:
            await self.ask_page("warn", _args(message, _page_options(ok_text)))
        self._result = OK

    async def confirm(
        self, message: object, ok_text: "str | DialogOptions | None" = None, cancel_text: str | None = None
    ) -> bool:
        """Ask a yes / no question in a dialog:  `True` for ok -- compiled from `confirm "Delete?"`.

        - `ok_text`, `cancel_text`:  its buttons' words;  or `ok_text` the dialog's options, as `alert`'s.
        - No page:  `True`, printed with the question;  in a terminal, yes unless `n` is typed.
        """
        if self.ask_page is None:
            typed = self._typed(f"{message} (Y/n) ")
            if typed is None:
                self.console.info(self.message("confirm-default", question=str(message)))
                yes = True
            else:
                yes = typed.strip().lower() in YES_TYPED
        else:
            yes = bool(await self.ask_page("confirm", _args(message, _page_options(ok_text), cancel_text)))
        self._result = OK if yes else CANCEL
        return yes

    async def prompt(self, message: object, value: str | None = None) -> str:
        """Ask for some text in a dialog:  what was typed, empty text if cancelled -- into a new `it`.

        - Compiled from `prompt "Name?" with "Untitled"`, `value` its starting text:  `it = await core.prompt(...)`.
        - HyperTalk's way (epic `language` P64):  `the result` is the button that closed it, `ok` or `cancel`.
        - No page:  `value`, printed with the question;  in a terminal, what's typed, `value` if nothing is.  `ok`.
        """
        if self.ask_page is None:
            typed = self._typed(f"{message} ({value or ''}) ")
            if typed is None:
                self.console.info(f"{message} ({value or ''})")
                answer = value
            else:
                answer = typed.rstrip("\n") or value
            self._result = OK
            return answer or ""
        asked = await self.ask_page("prompt", _args(message, value))
        self._result = CANCEL if asked is None else OK
        return "" if asked is None else str(asked)

    async def choose(self, items: object, options: "ChooseOptions | None" = None) -> object:
        """Ask the person to pick from `items` in a dialog:  the thing picked -- into a new `it` (epic `language` P66).

        - Compiled from `choose a card from the cards`:  `it = await core.choose(self.cards, {"thing": "a card"})`.
        - `items`:  a list, each item a row named by its title, label or name, else itself as text (`title_of_thing()`);
          or a record (a dict), its keys the rows and its values what's picked
        - `options`, by the JavaScript core's names (`ChooseOptions`):  `thing` or `things` (several, `it` a list),
          `prompt`, `shown`, `least`, `most`
        - As `prompt`:  `the result` is `ok` or `cancel`;  cancelled, it's `None` (several:  an empty list).
        - An empty list:  no dialog;  `cancel`, and nothing.
        - The page shows it, with rows this core names (`choosePositions`);  no page:  the first row, printed.
        """
        return await self._choose_from(_choices_of(items), options or {})

    async def choose_color(self, options: "ChooseOptions | None" = None) -> object:
        """Ask the person to pick one of Spell UI's colors, each drawn as a chip:  its hue name, `red`.

        - Compiled from `choose a color`.  Each row says the color's name in the program's language (`color-names`).
        - As `choose()` otherwise.
        """
        names = [name.strip() for name in self.message("color-names").split(",")]
        choices = [
            Choice(names[index] if index < len(names) and names[index] else color, color, color)
            for index, color in enumerate(SPELL_COLORS)
        ]
        return await self._choose_from(choices, options or {})

    async def _choose_from(self, choices: "list[Choice]", options: "ChooseOptions") -> object:
        """`choose()` and `choose_color()`, once their rows are made:  ask the page which rows, then what was picked."""
        several = options.get("things") is not None
        nothing: object = [] if several else None
        if not choices:
            self._result = CANCEL
            return nothing
        message = _choose_message(self.message, options)
        rows = [{"title": choice.title, **({"color": choice.color} if choice.color else {})} for choice in choices]
        counts = {key: options[key] for key in ("least", "most", "shown") if options.get(key) is not None}
        if self.ask_page is None:
            self.console.info(f"{message} ({choices[0].title})")
            picked = min(max(int(options.get("least") or 1), 1), len(choices)) if several else 1
            positions: list[int] | None = list(range(picked))
        else:
            asked = await self.ask_page("choosePositions", [message, rows, {"several": several, **counts}])
            positions = None if asked is None else [int(position) for position in asked]
        if positions is None:
            self._result = CANCEL
            return nothing
        self._result = OK
        values = [choices[position].value for position in positions if 0 <= position < len(choices)]
        return values if several else (values[0] if values else None)

    async def show_drawn(self, name: str, thing: object = None) -> object:
        """Show what the program drew and named `name`, and wait until it closes:  compiled from `show "you won"`.

        - Named by the quoted word on its tag, `<modal "you won">`:  the PAGE draws it, so the page shows it,
          as the JavaScript core's `showDrawn()` does (epic `language` P61).
        - A modal:  the page answers once it closes, with what closed it, which `the result` is then
          (epic `language` T155):
          `ok` or `cancel` from a button that says so, else that button's action's name;  `cancel` for Escape.
          Anything else the page shows answers at once, with nothing.
        - `show "you won" without waiting` doesn't wait for it:  it runs beside the program.
        - `thing`:  what it's shown with, `show "edit card" with the card` (epic `language` P64), which the modal draws
          and edits itself (`draw_shown()`):  the page is sent it by its id (`refer_to_thing`), and draws it.
        - While it waits inside an action, a modal's button's call still runs (`let_modal_call_run()`), rather than
          waiting behind it for good.
        - No page:  nothing, at once.
        - NEVER throws:  one the page can't show is said on the console.
        """
        if thing is not None:
            self._shown_things[_drawn_id(name)] = thing
        if self.ask_page is None or not _is_loop_running():
            return None
        task = asyncio.current_task()
        self._shown_by[_drawn_id(name)] = task
        shown_with = [] if thing is None else [self.refer_to_thing(thing) if self.refer_to_thing else thing]
        try:
            answer = await self._ask_or_say("showDrawn", [str(name), *shown_with])
        finally:
            if self._shown_by.get(_drawn_id(name)) is task:
                del self._shown_by[_drawn_id(name)]
        # `hide` gives no answer:  the result stays as it was
        if answer is not None:
            self._result = answer
        return answer

    def hide_drawn(self, name: str, answer: object = None) -> None:
        """Hide what the program drew and named `name`:  compiled from `hide "you won"`.  As `show_drawn()`.

        - `answer`:  what `the result` is then, a modal's button's that closed it (`PageSession`);  `hide` gives none.
        - Not waited for.
        """
        self._ask_page_soon("hideDrawn", [str(name)] if answer is None else [str(name), answer])

    def shown_in(self, name: str) -> object:
        """What modal `name` was last shown with, `show "edit card" with the card`:  `None` if it never was (P64)."""
        return self._shown_things.get(_drawn_id(name))

    def keep_open(self) -> None:
        """Leave the modal open after the call running now:  compiled from `... without closing` (epic `language` T155).

        - A modal's button closes it once its action has run, unless the action said this:  see `PageSession`.
        """
        self._kept_open = True

    def take_kept_open(self) -> bool:
        """Did the call that ran just now say `... without closing`?  Asked once:  it's forgotten after."""
        kept = self._kept_open
        self._kept_open = False
        return kept

    def result(self) -> object:
        """What closed the last dialog:  compiled from `the result` (epic `language` T155).

        - A modal's:  `ok`, `cancel`, or its button's answer;  `alert`, `warn`:  `ok`;
          `confirm`, `prompt`:  `ok` or `cancel` (`prompt`'s text is `it`, epic `language` P64).
        - What an action gives back, run as a statement (`answered()`, P64).
        - `None` before any has closed.
        """
        return self._result

    def answered(self, value: object) -> object:
        """`the result` is `value` from now on, and give it back:  an action that gives back a value, run as a statement
        on its own line (epic `language` P64, Q70):  `deal the cards` => `core.answered(await self.deal_the_cards())`.

        - Used as a value (`set x to the score of the game`), a call isn't wrapped:  `the result` stays as it was.
        """
        self._result = value
        return value

    def result_is(self, value: object) -> bool:
        """Is the last dialog's answer `value`:  compiled from `the result is ok`.  Text with no regard to case."""
        if isinstance(self._result, str) and isinstance(value, str):
            return self._result.lower() == value.lower()
        return self._result == value

    def let_modal_call_run(self, name: str) -> None:
        """SIDE EFFECT:  an action waiting on modal `name` (`show_drawn()`) goes on beside the queue, so the call a
        button of that modal sends may run now:  `PageSession` asks, for a call that `closes` it.
        """
        task = self._shown_by.get(_drawn_id(name))
        if task is not None:
            self.RUNTIME.actions.let_next_run(task)

    def _ask_page_soon(self, method: str, args: list[Any]) -> None:
        """Ask the page to run `method` with `args`, not waiting for it:  nothing with no page."""
        if self.ask_page is None or not _is_loop_running():
            return
        asked = asyncio.ensure_future(self._ask_or_say(method, args))
        # kept until it's done:  the event loop holds only a weak reference to a task
        _ASKED_SOON.add(asked)
        asked.add_done_callback(_ASKED_SOON.discard)

    async def _ask_or_say(self, method: str, args: list[Any]) -> Any:
        """Ask the page to show `method` with `args`:  its answer;  a failure said on the console.  NEVER throws."""
        try:
            return await self.ask_page(method, args)  # type: ignore[misc]
        except asyncio.CancelledError:
            raise
        except Exception as error:
            self.console.error(f"{method}:  the page can't show it", error)
            return None

    def _typed(self, question: str) -> str | None:
        """What's typed at a terminal for `question`, or `None` with none:  see `answer_typed`."""
        if self.answer_typed is not None:
            return self.answer_typed(question)
        if not sys.stdin or not sys.stdin.isatty():
            return None
        try:
            return input(question)
        except EOFError:
            return None


class PageAsks:
    """A host's questions to its page, by number:  each sent as a frame, and answered by the page's answer frame.

    ```python
    asks = PageAsks(send)              # `send`:  how to send the page a frame, `{"ui": "alert", ...}`
    core.ask_page = asks.ask
    asks.answered({"answer": 1, "value": True})   # the page's answer, read off its socket:  True if it was one
    ```

    - `spell_quart`'s `Visit` holds one, for its visitor's pages.
    """

    def __init__(self, send: Callable[[dict[str, Any]], Awaitable[None]]) -> None:
        """Questions sent through `send`."""
        self.send = send
        self._asked = 0
        self._waiting: dict[int, asyncio.Future[Any]] = {}

    async def ask(self, method: str, args: list[Any]) -> Any:
        """Ask the page to show `method` (`"confirm"`) with `args`, and wait for its answer:  `ask_page`'s shape."""
        self._asked += 1
        number = self._asked
        answer: asyncio.Future[Any] = asyncio.get_running_loop().create_future()
        self._waiting[number] = answer
        try:
            await self.send({UI_KEY: method, "args": args, ASKS_KEY: number})
            return await answer
        finally:
            self._waiting.pop(number, None)

    def answered(self, message: object) -> bool:
        """SIDE EFFECT:  `message` from the page answers a question, if it's an answer:  `True` if it was one.

        - An answer nobody waits for any more (its page closed, its action canceled) is dropped.
        """
        if not (isinstance(message, dict) and ANSWER_KEY in message):
            return False
        answer = self._waiting.get(message[ANSWER_KEY])
        if answer is not None and not answer.done():
            answer.set_result(message.get("value"))
        return True

    def give_up(self) -> None:
        """SIDE EFFECT:  every question waiting is answered `None`, as a cancel:  the page asked closed."""
        for answer in self._waiting.values():
            if not answer.done():
                answer.set_result(None)


class ToastShown:
    """What `core.notify()` returns:  awaited, the toast being gone -- `notify ... and wait`.

    - Not awaited, nothing's left waiting:  the toast goes on by itself.
    """

    def __init__(self, shown: "asyncio.Future[None] | None") -> None:
        """The toast `shown` stands for:  `None` when it's gone already (no page)."""
        self.shown = shown

    def __await__(self) -> Generator[Any, None, None]:
        """Wait until the toast has gone."""
        if self.shown is not None:
            yield from self.shown.__await__()


def _page_options(options: "str | DialogOptions | None") -> "str | DialogOptions | None":
    """A dialog's options as the page's core names them:  `ok_text` is `okText`;  a button's words as they are.

    - The Python writer writes an options object's keys as Python names them, and the page is javascript.
    - SEE:  `place_kinds.javascript_name()`, the same rule for a place's settings.
    """
    if not isinstance(options, dict):
        return options
    return {SNAKE_WORD.sub(lambda match: match.group(1).upper(), key): value for key, value in options.items()}


class Choice(NamedTuple):
    """A row of `choose`'s dialog:  its words, what picking it gives back, and its color's hue name for a color."""

    title: str
    value: object
    color: str | None = None


def _choices_of(items: object) -> list[Choice]:
    """The rows of what `choose` picks from:  a record's keys (its values picked), else each item of a list."""
    if isinstance(items, dict):
        return [Choice(str(key), value) for key, value in items.items()]
    if isinstance(items, (str, bytes)) or not isinstance(items, Iterable):
        return []
    return [Choice(title_of_thing(item), item) for item in items]


def title_of_thing(thing: object) -> str:
    """What a list's item says it's called:  its `title`, else its `label`, else its `name`, else itself as text.

    - A record (a dict) by its keys;  a thing by its properties.  As the JavaScript core's `titleOfThing()`.
    """
    for key in ("title", "label", "name"):
        named = thing.get(key) if isinstance(thing, dict) else getattr(thing, key, None)
        if isinstance(named, str):
            return named
    return str(thing)


def _choose_message(message: Callable[..., str], options: "ChooseOptions") -> str:
    """`choose`'s question:  the one written, else from the words written, in the program's language."""
    if options.get("prompt") is not None:
        return str(options["prompt"])
    things, least, most = options.get("things"), options.get("least"), options.get("most")
    if things is None:
        return message("choose-thing", thing=options.get("thing", ""))
    if least is not None and most is not None:
        return message("choose-between", least=least, most=most, things=things)
    if most is not None:
        return message("choose-up-to", most=most, things=things)
    return message("choose-things", things=things)


def _drawn_id(name: str) -> str:
    """A drawn thing's id from its name, its words joined by `-`:  `you-won`, as the page finds it."""
    return "-".join(str(name).split())


def _args(*values: object) -> list[Any]:
    """The arguments for the page:  the first as text, and the trailing ones left out that weren't given."""
    args = [str(values[0]), *values[1:]]
    while len(args) > 1 and args[-1] is None:
        args.pop()
    return args


def _is_loop_running() -> bool:
    """Is an asyncio loop running here, so a toast can go on beside the program?"""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return False
    return True
