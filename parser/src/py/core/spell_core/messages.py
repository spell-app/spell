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
| `write-refused-role` | the same, refused as your role can't write:  the JavaScript core's, so far | `thing` |
| `write-refused-taken-down` | the same, refused as Spell took it down:  the JavaScript core's, so far | `thing` |
| `write-refused-editor` | the same, as it takes an editor:  JS core's | `thing` |
| `write-refused-manager` | the same, as it takes a manager:  JS core's | `thing` |
| `write-refused-owner` | the same, as it's someone else's:  JS core's | `thing` |
| `write-refused-full` | the same, as a sign-up sheet's place is taken:  JS core's | `thing` |
| `write-refused-not-listed` | the same, as a sign-up sheet's list doesn't name you:  JS core's | `thing` |
| `write-refused-used-up` | the same, as you've asked for every invitation you have:  JS core's | `thing` |
| `write-retry`, `write-show-me` | that notice's buttons:  the JavaScript core's, so far | |
| `write-merged` | the notice when a merge kept yours:  the JavaScript core's, so far | `thing`, `field`, `theirs` |
| `write-use-theirs` | that notice's button:  the JavaScript core's, so far | |
| `write-lost`, `write-use-mine` | your long text replaced:  the JavaScript core's | `thing`, `field`, `mine` |
| `write-deleted`, `write-restore` | what you were changing deleted:  the JavaScript core's | `thing` |
| `write-changed-under-draft` | someone else changed what a draft is a copy of:  the JavaScript core's | `thing` |
| `guest-person` | what someone with no name is called:  the JavaScript core's | `number` |
| `sign-in-signed-out`, `sign-in-signing`, `sign-in-as` | signing in to a place:  the JavaScript core's | `place` |
| `sign-in-ended`, `sign-in-failed`, `sign-in-who` | the same | `name`, `why` |
| `sign-in`, `sign-out` | its buttons | |
| `page-previous`, `page-next`, `page-number` | a list read a page at a time:  the JavaScript core's | `page` |
| `sign-in-as-spell`, `sign-in-spell-signed-out` | a Spell account's:  the JavaScript core's | `place`, `name` |
| `sign-in-cloud-signed-out` | the cloud's, nobody signed in:  the JavaScript core's | `place` |
| `sign-in-check-email` | the same, waiting for its link or code | `email` |
| `sign-in-email`, `sign-in-email-me`, `sign-in-code` | its fields and button | |
| `sign-in-abuse` | where to report abuse, on a Spell account's bar:  the JavaScript core's | `contact` |
| `sign-in-bluesky`, `sign-in-link-bluesky` | a Spell account's Bluesky buttons:  the JavaScript core's | |
| `sign-in-linked` | a Spell account linked to Bluesky:  the JavaScript core's | `handle` |
| `sign-in-not-linked`, `sign-in-taken-down`, `sign-in-linked-elsewhere` | why Bluesky didn't sign in:  JS core's | |
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
    "write-refused-role": "Couldn't save your change to {thing}:  your role can't write here",
    "write-refused-taken-down": "Couldn't save your change to {thing}:  Spell took it down",
    "write-refused-editor": "Couldn't save your change to {thing}:  it takes an editor of this space",
    "write-refused-manager": "Couldn't save your change to {thing}:  it takes a manager of this space",
    "write-refused-owner": "Couldn't save your change to {thing}:  it's someone else's, and only they change it",
    "write-refused-full": "Couldn't save your change to {thing}:  someone got the last place first",
    "write-refused-not-listed": "Couldn't save your change to {thing}:  only the people its list names sign up here",
    "write-refused-used-up": "Couldn't save your change to {thing}:  you've asked for every invitation you have",
    "language": "en",
    "write-retry": "Retry",
    "read-failed": "Can't read this right now:  {why}",
    "saved-added": "Add",
    "saved-removed": "Remove",
    "write-show-me": "Show me",
    "write-merged": "{thing}'s {field} also changed elsewhere.  Yours was kept;  theirs was:  {theirs}",
    "write-use-theirs": "Use theirs",
    "write-lost": "Someone else changed {thing}'s {field} at the same time, and theirs stands.  Yours was:  {mine}",
    "write-deleted": "Someone else deleted {thing} while you were changing it.",
    "write-use-mine": "Use mine",
    "write-restore": "Restore",
    "write-changed-under-draft": (
        "Someone else changed {thing} while you were editing it.  What you're editing doesn't show that yet."
    ),
    "guest-person": "Guest {number}",
    "sign-in-signed-out": (
        "You aren't signed in to {place}, so you can read it, and what you change waits here until you do."
    ),
    "sign-in-signing": "Signing in to {place}…",
    "sign-in-as": "Signed in to {place} as {name}, with an atmosphere account.",
    "sign-in-ended": (
        "Your sign-in to {place} has ended:  they last two weeks at most.  "
        "Sign in again, and what you changed goes through."
    ),
    "sign-in-failed": "That didn't sign you in:  {why}",
    "sign-in-abuse": "To report abuse on Spell:  {contact}",
    "sign-in-who": "Your handle, e.g. alice.bsky.social",
    "sign-in-as-spell": "Signed in to {place} with your Spell account, {name}.",
    "sign-in-spell-signed-out": (
        "You aren't signed in to {place} with a Spell account:  "
        "until you are, it takes you to be this computer's person."
    ),
    "sign-in-cloud-signed-out": (
        "{place} is kept in this browser only, until you sign in with a Spell account:  "
        "then it's saved in the cloud, on every device you sign in on."
    ),
    "sign-in-check-email": (
        "Check your email:  {email} has a link and a code.  Open the link on any device, or type the code here."
    ),
    "sign-in-email": "Your email, e.g. ana@example.com",
    "sign-in-email-me": "Email me a link",
    "sign-in-code": "The six-digit code",
    "sign-in": "Sign in",
    "sign-out": "Sign out",
    "sign-in-bluesky": "Sign in with Bluesky",
    "sign-in-link-bluesky": "Link a Bluesky account",
    "sign-in-linked": "You can sign in with Bluesky too, as {handle}.",
    "sign-in-not-linked": (
        "That Bluesky account isn't linked to a Spell account here.  "
        "Spell is by invite only:  ask for an invite, sign in by email, then link it."
    ),
    "sign-in-taken-down": "The Spell account that Bluesky account is linked to was taken down by Spell.",
    "sign-in-linked-elsewhere": "That Bluesky account is linked to another Spell account already.",
    "page-previous": "Previous",
    "page-next": "Next",
    "page-number": "Page {page}",
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
