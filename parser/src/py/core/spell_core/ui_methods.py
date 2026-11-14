"""`core` talking to the person running the program, a toast or a dialog:  the twin of the JavaScript core's `ui.ts`.

```python
core.notify("Saved!")                              # a toast, not waited for
await core.notify("Saved!", {"time": 2})           # `notify "Saved!" for 2 seconds and wait`
await core.alert("You won!", "New game")           # a dialog, until it's closed
if await core.confirm("Deal again?"): ...          # yes or no
name = await core.prompt("Your name?", "Ann")      # the text typed, or `None` if cancelled
```

- What spell's `rules/UI/` compile to:  `notify`, `alert`, `warn`, `confirm`, `prompt`.
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
import sys
from collections.abc import Awaitable, Callable, Generator
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from spell_core.console import SpellConsole

# How a host asks its page to show one of these (`ask_page`):  the core's method, its arguments;  the page's answer
AskPage = Callable[[str, list[Any]], Awaitable[Any]]

# Yes, typed at a terminal for `confirm`:  anything else is no
YES_TYPED = ("y", "yes", "")

# What a frame asking the page names its method by, `{"ui": "alert", ...}`;  its number by;  the page's answer by
UI_KEY = "ui"
ASKS_KEY = "asks"
ANSWER_KEY = "answer"


class UIMethods:
    """`core.notify()`, `core.alert()`, `core.warn()`, `core.confirm()` and `core.prompt()`:  see the module's docs."""

    # where they print with no page:  `Core` sets it
    console: "SpellConsole"
    # the core's messages in the program's language:  `MessageMethods`'s
    message: Callable[..., str]

    # How to ask the page drawing the program, and wait for its answer:  a host sets it (`spell_quart`'s `Visit.ask()`).
    # - None:  no page, so each prints instead.
    ask_page: AskPage | None = None

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

    async def alert(self, message: object, ok_text: str | None = None) -> None:
        """Show `message` in a dialog, and wait until it's closed:  compiled from `alert "Yo!"`.

        - `ok_text`:  its button's words, `alert "You won!" with "New game"`;  none, Spell UI's own.
        - No page:  printed on the console.
        """
        if self.ask_page is None:
            self.console.info(str(message))
            return
        await self.ask_page("alert", _args(message, ok_text))

    async def warn(self, message: object, ok_text: str | None = None) -> None:
        """Warn the person in a dialog, and wait until it's closed:  compiled from `warn "Careful!"`.

        - No page:  printed as a warning on the console.
        """
        if self.ask_page is None:
            self.console.warn(str(message))
            return
        await self.ask_page("warn", _args(message, ok_text))

    async def confirm(self, message: object, ok_text: str | None = None, cancel_text: str | None = None) -> bool:
        """Ask a yes / no question in a dialog:  `True` for ok -- compiled from `confirm "Delete?"`.

        - `ok_text`, `cancel_text`:  its buttons' words.
        - No page:  `True`, printed with the question;  in a terminal, yes unless `n` is typed.
        """
        if self.ask_page is None:
            typed = self._typed(f"{message} (Y/n) ")
            if typed is None:
                self.console.info(self.message("confirm-default", question=str(message)))
                return True
            return typed.strip().lower() in YES_TYPED
        return bool(await self.ask_page("confirm", _args(message, ok_text, cancel_text)))

    async def prompt(self, message: object, value: str | None = None) -> str | None:
        """Ask for some text in a dialog:  what was typed, or `None` if cancelled.

        - Compiled from `prompt "Name?" with "Untitled"`, `value` its starting text.
        - No page:  `value`, printed with the question;  in a terminal, what's typed, `value` if nothing is.
        """
        if self.ask_page is None:
            typed = self._typed(f"{message} ({value or ''}) ")
            if typed is None:
                self.console.info(f"{message} ({value or ''})")
                return value
            return typed.rstrip("\n") or value
        answer = await self.ask_page("prompt", _args(message, value))
        return None if answer is None else str(answer)

    async def _ask_or_say(self, method: str, args: list[Any]) -> None:
        """Ask the page to show `method` with `args`;  a failure said on the console.  NEVER throws."""
        try:
            await self.ask_page(method, args)  # type: ignore[misc]
        except asyncio.CancelledError:
            raise
        except Exception as error:
            self.console.error(f"{method}:  the page can't show it", error)

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
