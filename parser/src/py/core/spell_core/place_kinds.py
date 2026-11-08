"""The kinds of place a Python program keeps things in (epic data P40):  what's behind each, from what its lines say.

```python
behind = place_behind({"name": "this_device", "kind": "database on this device"}, program=Path("Notes.spell.py"))
rows = await behind.rows("device_notes")
behind.apply([{"kind": "insert", "collection": "device_notes", "id": "device-note-k3x9q2mf", "fields": {...}}])
```

- The twin of the JavaScript core's `placeKinds.ts`, for the three kinds Python has:
  - `database on this device`:  ONE JSON file beside the compiled program, `<Program>.device.json` (`DeviceFile`)
    - a browser keeps it in its own storage;  a Python program has none, so it's a file you can open and delete
    - written whole on each change, through a temporary file and a rename
  - `data folder`, `sheet` and `excel file`:  through the page server's place routes (`ServerPlace`),
    the same requests a browser's `RemotePlace` sends, with the page server's write token
    - the server finds the folder, reads the CSV file or the workbook, and checks who writes what
- Any other kind is refused, naming it:  the Atmosphere, a web server, GraphQL, Airtable, a Google sheet, a room,
  the cloud.  The compiler refuses them first (spell's `SP.TARGETS`, `PY.PLACE_KINDS`):  this is for a program
  compiled by hand.
- Standard library only:  HTTP through `urllib`, its waiting off the event loop (`asyncio.to_thread()`).
- Knows nothing of things:  rows are plain JSON, by the JavaScript names of their fields.  `places.py` makes things.
"""

import asyncio
import json
import os
import urllib.error
import urllib.request
from collections.abc import Callable, Mapping
from pathlib import Path
from typing import Any

# A row, as a place keeps it:  plain JSON, by the JavaScript names of its fields.
Row = dict[str, Any]
# One change to one thing:  `{"kind": "insert" | "update" | "delete", "collection", "id", "fields"}`,
# the JavaScript `PlaceChange`.
Change = dict[str, Any]

# A row's id, in a place that isn't told otherwise.
ID_FIELD = "id"
# The page server's address, `http://127.0.0.1:4747`:  `spell run --target py` sets it.
SERVER_URL_VARIABLE = "SPELL_SERVER_URL"
# The page server's write token, sent with each request:  `spell run --target py` sets it.
SERVER_TOKEN_VARIABLE = "SPELL_SERVER_TOKEN"
# The header the page server's guard reads it from.
TOKEN_HEADER = "x-server-token"
# Where the page server serves every place:  an address under it reaches a server side.
PLACES_PREFIX = "/api/places/"
# How long a request to the page server may take, in seconds.
REQUEST_SECONDS = 30
# The end of a compiled program's file name, before which its name is:  `Notes.spell.py`.
PROGRAM_SUFFIX = ".spell.py"
# The end of its device file's name, beside it:  `Notes.device.json`.
DEVICE_SUFFIX = ".device.json"


class PlaceError(Exception):
    """A place said no, or couldn't be reached:  the JavaScript `PlaceError`.

    - `kind`:  why, as the JavaScript names it:  `"refused"`, `"not found"`, `"out of date"`, `"no answer"` ...
    - `why_not`:  for a refusal, what the place said:  `"owner"`, `"role"` ...
    """

    def __init__(self, message: str, kind: str = "no answer", why_not: str | None = None) -> None:
        """A place's failure, `message` saying what it was and what to do."""
        super().__init__(message)
        self.kind = kind
        self.why_not = why_not


class PlaceBehind:
    """What's behind one place:  its rows, by collection, and the changes it takes.

    - `rows()` waits, as any read does;  `apply()` doesn't, so a write is sent as it's made.
    """

    # the kind's word, as the program's line says it:  `data folder`
    kind = ""

    async def rows(self, collection: str) -> list[Row]:
        """Every row of `collection`.  - throws `PlaceError`"""
        raise NotImplementedError

    def rows_now(self, collection: str) -> list[Row]:
        """As `rows()`, answered now, where nothing can wait:  a drawing.  - throws `PlaceError`"""
        raise NotImplementedError

    def apply(self, changes: list[Change]) -> None:
        """Make `changes`, in order, all or none where the place can.  - throws `PlaceError`"""
        raise NotImplementedError

    def call(self, name: str, input: object) -> object:
        """Run the place's operation `name` with `input`:  its answer.  - throws `PlaceError`"""
        raise PlaceError(f'a {self.kind} takes no named operations, so "{name}" can\'t reach it', kind="not found")


class DeviceFile(PlaceBehind):
    """A database on this device:  one JSON file beside the compiled program, `<Program>.device.json`.

    ```json
    {"device_notes": {"device-note-k3x9q2mf": {"id": "device-note-k3x9q2mf", "text": "milk"}}}
    ```

    - Each collection its rows by id, each row with its id inside it, as a browser's `DevicePlace` keeps whole rows.
    - Read whole when a read asks;  written whole on each change, through a temporary file and a rename,
      so a run stopped halfway leaves the file as it was.
    - Every place on this device shares the file:  each keeps its own collections.
    """

    kind = "database on this device"

    def __init__(self, file: Path) -> None:
        """The database kept in `file`, which needn't exist yet."""
        self.file = file

    async def rows(self, collection: str) -> list[Row]:
        """Every row of `collection`, from the file:  none while there's no file."""
        return self.rows_now(collection)

    def rows_now(self, collection: str) -> list[Row]:
        """As `rows()`:  the file's read at once anyway."""
        return [dict(row) for row in self._read().get(collection, {}).values()]

    def apply(self, changes: list[Change]) -> None:
        """Make `changes`, then write the file whole."""
        data = self._read()
        for change in changes:
            rows = data.setdefault(change["collection"], {})
            the_id = change["id"]
            if change["kind"] == "delete":
                rows.pop(the_id, None)
            elif change["kind"] == "insert":
                rows[the_id] = {ID_FIELD: the_id, **change.get("fields", {})}
            else:
                rows[the_id] = {**rows.get(the_id, {ID_FIELD: the_id}), **change.get("fields", {})}
        written = self.file.with_name(f"{self.file.name}.writing")
        written.write_text(f"{json.dumps(data, ensure_ascii=False, indent=2)}\n", encoding="utf-8")
        written.replace(self.file)

    def _read(self) -> dict[str, dict[str, Row]]:
        """The file's collections:  empty while there's no file.  - throws `PlaceError` for one that isn't JSON"""
        if not self.file.exists():
            return {}
        try:
            return json.loads(self.file.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            message = f"{self.file.name} isn't JSON any more ({error}):  fix it, or delete it"
            raise PlaceError(message, "refused") from error


class ServerPlace(PlaceBehind):
    """A data folder or a sheet on the page server:  its place routes, as a browser's `RemotePlace` asks them.

    - `POST <address>/list` `{collection, query}`, `POST <address>/apply` `{changes}`, `POST <address>/call`.
    - With the page server's write token (`x-server-token`), on reads too:  its guard asks it of every request.
    - A program's lines go with each request (`lines`):  a CSV file's id column.
    - Who's asking:  this machine's person, as the page server takes anyone with its token.
    - `post`:  sends a request, for a test to stand in for the server;  `urllib`'s by default.
    """

    def __init__(
        self,
        kind: str,
        address: str,
        token: str | None,
        lines: Mapping[str, object] | None = None,
        post: Callable[[str, dict[str, object], dict[str, str]], object] | None = None,
    ) -> None:
        """The place at `address`, its whole URL, written with `token`."""
        self.kind = kind
        self.address = address
        self.token = token
        self.lines = dict(lines or {})
        self.post = post or post_json

    async def rows(self, collection: str) -> list[Row]:
        """Every row of `collection`, asked of the server off the event loop."""
        return await asyncio.to_thread(self.rows_now, collection)

    def rows_now(self, collection: str) -> list[Row]:
        """As `rows()`, waiting here for the answer."""
        answer = self.ask("list", {"collection": collection, "query": {}})
        return list(answer.get("rows", [])) if isinstance(answer, dict) else []

    def apply(self, changes: list[Change]) -> None:
        """Send `changes`, waiting for the server's answer:  what it refused, it says."""
        self.ask("apply", {"changes": changes})

    def call(self, name: str, input: object) -> object:
        """Run the server side's operation `name`:  its result."""
        answer = self.ask("call", {"name": name, "input": input})
        return answer.get("result") if isinstance(answer, dict) else None

    def ask(self, what: str, body: dict[str, object]) -> Any:
        """The server side's answer to `what`.  - throws `PlaceError`:  no token, refused, or no answer"""
        if self.token is None:
            raise PlaceError(
                f"this {self.kind} is on the page server, which a program reaches with its write token:  "
                f"run it with `spell run --target py`, or set {SERVER_URL_VARIABLE} and {SERVER_TOKEN_VARIABLE}",
                "refused",
            )
        headers = {"content-type": "application/json", TOKEN_HEADER: self.token}
        return self.post(f"{self.address}/{what}", {**body, **({"lines": self.lines} if self.lines else {})}, headers)


def post_json(url: str, body: dict[str, object], headers: dict[str, str]) -> object:
    """`body` posted to `url` as JSON:  the answer's JSON.  - throws `PlaceError`, saying what the server said"""
    data = json.dumps(body).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_SECONDS) as response:
            return json.loads(response.read().decode("utf-8") or "null")
    except urllib.error.HTTPError as error:
        said = _json_of(error.read())
        message = said.get("error") or f"the server answered {error.code}"
        kind = said.get("kind") or ("refused" if error.code in (401, 403) else "no answer")
        raise PlaceError(f"{url}:  {message}", kind, said.get("whyNot")) from error
    except (urllib.error.URLError, OSError) as error:
        raise PlaceError(f"{url}:  no answer ({error}):  is the page server running?  `spell server start`") from error


def _json_of(text: bytes) -> dict[str, Any]:
    """`text` as a JSON object:  empty when it isn't one."""
    try:
        said = json.loads(text.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return {}
    return said if isinstance(said, dict) else {}


def place_behind(details: Mapping[str, Any], program: Path | None) -> PlaceBehind:
    """What's behind the place `details` describes, as a program's line says it (`core.place()`'s details).

    - `program`:  the compiled program's file, beside which a device file goes;  `None`, the folder it runs in.
    - throws `PlaceError` `"not found"` for a kind Python doesn't keep things in yet, naming it,
      and for a sheet or a data folder that isn't on a server
    """
    kind = details.get("kind") or ""
    name = details.get("name", "")
    if kind == DeviceFile.kind:
        return DeviceFile(device_file_for(program))
    if kind in ("data folder", "sheet", "excel file"):
        at = str(details.get("at", ""))
        if not (at.startswith("http:") or at.startswith("https:") or PLACES_PREFIX in at):
            raise PlaceError(
                f'"{name}" is a {kind} at "{at}", which Python reads only through a server:  '
                "a project's own (a name alone), or a place server's address",
                "not found",
            )
        lines = {"idColumn": details["id_column"]} if "id_column" in details else {}
        return ServerPlace(kind, server_address(at), os.environ.get(SERVER_TOKEN_VARIABLE) or None, lines)
    raise PlaceError(f'"{name}" is a {kind or "place of its own kind"}:  not in Python yet', "not found")


def device_file_for(program: Path | None) -> Path:
    """The device file beside `program`:  `Notes.spell.py` keeps `Notes.device.json`.

    - No program known:  `spell.device.json`, in the folder it runs in.
    """
    if program is None:
        return Path.cwd() / f"spell{DEVICE_SUFFIX}"
    name = program.name
    stem = name[: -len(PROGRAM_SUFFIX)] if name.endswith(PROGRAM_SUFFIX) else program.stem
    return program.with_name(f"{stem}{DEVICE_SUFFIX}")


def server_address(at: str) -> str:
    """`at`, a place's address, as a whole URL:  from the top of the page server (`SPELL_SERVER_URL`) unless it's one.

    - throws `PlaceError` when it's from the top of a server, and nothing says which
    """
    if at.startswith("http:") or at.startswith("https:"):
        return at
    server = os.environ.get(SERVER_URL_VARIABLE)
    if not server:
        raise PlaceError(
            f'"{at}" is on the page server, and nothing says where that is:  '
            f"run it with `spell run --target py`, or set {SERVER_URL_VARIABLE} and {SERVER_TOKEN_VARIABLE}",
            "refused",
        )
    return f"{server.rstrip('/')}{at}"
