"""`core.message()`:  what the core says to the person running a program, in its language (epic spanish, P12).

```python
core.use_messages({"cant-draw": "⚠ {type} no se puede dibujar"})
core.message("cant-draw", type="Carta")  # "⚠ Carta no se puede dibujar"
```

- The twin of the JavaScript core's `messages.ts`, with the same keys and words:  `MESSAGES` is its `CORE_MESSAGES`.
  - Both read `messages.expected.json5`, with the JavaScript core's tests (`tests/core/`), so they can't drift apart.
- English is built in;  another language's words come from the program's words file, `<Project>.py.<lang>.json5`,
  its `messages`, loaded by `core.load_words()`.
- A key the words don't have, or no words at all:  English.
- ONLY what a person running the program sees:  a test's lines, a drawing's stand-in.
  What a programmer sees stays English:  errors, a property's type warnings, `draw() failed` on the console.

| Key | Where it shows | Placeholders |
| --- | --- | --- |
| `expect-passed` | a test's ✅ line, `expect` | `what`, `expected` |
| `expect-failed` | a test's ❌ line, `expect` | `what`, `expected`, `actual` |
| `expect-truthy` | what `expect x` with no value expects | |
| `test-step` | a `to test ...` method's ▶️ line, each statement | `step` |
| `test-threw` | a test that threw | `test` |
| `cant-draw` | the stand-in on the page for a thing whose drawing failed | `type` |
| `waiting` | the stand-in on the page for a value that hasn't answered yet | |
| `confirm-default` | `confirm` with no page:  the JavaScript core's only, so far | `question` |
| `drop-event` | the event a page sends as a thing is dropped on a list:  the JavaScript core's, so far | `thing` |
| `undo`, `redo` | an app's Edit menu with nothing to undo or redo:  the JavaScript core's, so far | |
| `undo-step`, `redo-step` | an app's Edit menu, naming the step (`Undo Turn Card`):  the JavaScript core's | `step` |
| `write-refused` | the notice when a place refuses a change:  the JavaScript core's, so far | `thing` |
| `write-retry`, `write-show-me` | that notice's buttons:  the JavaScript core's, so far | |
| `write-merged` | the notice when a merge kept yours:  the JavaScript core's, so far | `thing`, `field`, `theirs` |
| `write-use-theirs` | that notice's button:  the JavaScript core's, so far | |
| `write-lost`, `write-use-mine` | your long text replaced:  the JavaScript core's | `thing`, `field`, `mine` |
| `write-deleted`, `write-restore` | what you were changing deleted:  the JavaScript core's | `thing` |
"""

import re

# The core's messages in English, by key:  each `{name}` is filled in by `message()`.
MESSAGES: dict[str, str] = {
    "expect-passed": "As expected {what} is {expected}",
    "expect-failed": "Unexpected: {what} should be {expected} but is actually {actual}",
    "expect-truthy": "truthy",
    "test-step": "▶️ Executing   {step}",
    "test-threw": "Error in test {test}:",
    "cant-draw": "⚠ {type} can't draw",
    "waiting": "…",
    "confirm-default": "{question} (yes)",
    "drop-event": "{thing}-drop",
    "undo": "Undo",
    "undo-step": "Undo {step}",
    "redo": "Redo",
    "redo-step": "Redo {step}",
    "write-refused": "Couldn't save your change to {thing}",
    "write-retry": "Retry",
    "write-show-me": "Show me",
    "write-merged": "{thing}'s {field} also changed elsewhere.  Yours was kept;  theirs was:  {theirs}",
    "write-use-theirs": "Use theirs",
    "write-lost": "Someone else changed {thing}'s {field} at the same time, and theirs stands.  Yours was:  {mine}",
    "write-deleted": "Someone else deleted {thing} while you were changing it.",
    "write-use-mine": "Use mine",
    "write-restore": "Restore",
}

# A named placeholder in a message, `{type}`.
_PLACEHOLDER = re.compile(r"\{(\w+)\}")


class MessageMethods:
    """`core.use_messages()` and `core.message()`."""

    # the running program's words for the core's messages, by key:  `None` for English
    _messages: dict[str, str] | None = None

    def use_messages(self, messages: dict[str, str] | None = None) -> None:
        """Speak the program's language:  `messages` from its words file, by key.  `None`:  back to English."""
        self._messages = messages

    def message(self, key: str, **values: object) -> str:
        """Message `key` in the program's language, each `{name}` in it filled with `values[name]`.

        - English when the program's words have no such key.
        - A placeholder with no value stays as written:  `{type}`.
        """
        template = (self._messages or {}).get(key) or MESSAGES[key]
        return _PLACEHOLDER.sub(lambda match: str(values.get(match[1], match[0])), template)
