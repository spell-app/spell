"""An atmosphere account as a place, on AT Protocol (epic data P46):  a Python program's own records, over HTTP.

```python
place = AtmosphereAccount({"name": "task_sky", "kind": "personal atmosphere account", "collections": {...}})
rows = place.rows_now("sky_tasks")
place.apply([{"kind": "insert", "collection": "sky_tasks", "id": "sky-task-k3x9q2mf", "fields": {"title": "milk"}}])
```

- The twin of `spell/places`'s `AtProtoPlace`, for a program with no browser:
  it signs in as `AtProtoPasswordSignIn` does, with a handle and an app password.
  - An app password is one the person makes for one program, in their host's settings:
    their own password never reaches it, and they can take it back.
  - From two environment variables, `ATMOSPHERE_HANDLE` and `ATMOSPHERE_APP_PASSWORD`, kept in memory only:
    the same two `epic pages publish` and `spell space lexicon` read.
  - Signing in:  the handle becomes a DID, the DID's document names its host, the host hands out a session.
  - A session lasts a couple of hours:  a write that finds it over says so, and the next one signs in again.
- Reading needs no sign-in:  records are public.  A host hands out 100 at a time, newest key first.
- A row is its record's fields, its `id` (the record's key) and `owner`:
  the account it came from, which a record can't claim.
- Writing:  only the account signed in.  Whole records, each what's kept with the changed fields on top.
  - One thing:  `putRecord` or `deleteRecord`, checked by `swapRecord`.
  - Several:  `applyWrites`, all or nothing, checked by `swapCommit`.
- A number field is kept as text, `"12.50"`:  a record has no decimals, and that's what its Lexicon says.
- Smaller than the JavaScript place:
  - no live stream, no names for who's here
  - a personal account reads the person signed in and the accounts its lines name:
    it asks no relay who else holds a collection
- Standard library only.  Knows nothing of things:  `places.py` makes them.
"""

import asyncio
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from spell_core.place_kinds import (
    EVERY_FIELD,
    ID_FIELD,
    Change,
    PlaceBehind,
    PlaceError,
    Row,
    json_object_in,
    key_from,
    open_minding_limits,
)

# The two kinds, as a program's line says them.
ONE_ACCOUNT = "atmosphere account"
EACH_PERSONS_OWN = "personal atmosphere account"
ATMOSPHERE_KINDS = (ONE_ACCOUNT, EACH_PERSONS_OWN)

# The account a program signs in as:  a handle or a DID.
HANDLE_VARIABLE = "ATMOSPHERE_HANDLE"
# Its app password, from its host's settings.
APP_PASSWORD_VARIABLE = "ATMOSPHERE_APP_PASSWORD"
# A network of its own, as JSON:  a test's.  The JavaScript place's `window.SPELL_ATMOSPHERE`.
NETWORK_VARIABLE = "SPELL_ATMOSPHERE"

# What's reached for accounts and handles, by default:  the real network.
REAL_NETWORK = {"directory": "https://plc.directory", "handles": "https://public.api.bsky.app"}

# The field saying whose a row is.
OWNER_FIELD = "owner"
# Where a record says what kind it is.
TYPE_FIELD = "$type"
# The corner of each account a program's records go in, when its line names none.
DEFAULT_CORNER = "app.spell.data"
# The most a host answers with at once.
MOST_IN_A_PAGE = 100
# The most pages one account is read to:  50,000 records.
MOST_PAGES = 500
# What a record key can hold.
RECORD_KEY = re.compile(r"^[A-Za-z0-9._:~-]{1,512}$")
# Anything that can't go in a part of a collection's name.
NOT_IN_A_NAME = re.compile(r"[^A-Za-z0-9]+(.)?")
# The errors that mean the session's over.
SESSION_OVER = {"ExpiredToken", "InvalidToken", "AuthMissing", "invalid_token"}
# The errors that mean the thing isn't there.
NOT_THERE = {"RecordNotFound", "RepoNotFound", "RepoDeactivated", "RepoTakendown", "RepoSuspended"}
# What Bluesky's hosts say, as an `InvalidRequest`, for an account that's gone.
NO_SUCH_ACCOUNT = re.compile(r"^Could not find repo")
# The answers that mean "ask again later", though a server sent them.
TRY_AGAIN_STATUSES = {408, 425, 429}


@dataclass
class Session:
    """Who's signed in:  the account, what it goes by, its host, and the token that goes to that host only."""

    did: str
    handle: str
    host: str
    token: str


@dataclass
class KnownRecord:
    """One record as last seen:  whose it is, its key, its version and its fields."""

    did: str
    rkey: str
    cid: str
    value: dict[str, Any]


@dataclass
class AccountWrite:
    """One thing's changes, as one write to the account signed in."""

    collection: str
    id: str
    nsid: str
    rkey: str
    is_removed: bool
    value: dict[str, Any]
    # what this program saw it at:  what the write is checked against
    version: str | None


class AtmosphereAccount(PlaceBehind):
    """One account, or each person's own:  see the module's docs.

    - `details`:  what the program's lines say, `core.place()`'s details.
    - Nothing's asked until something's read or written.
    """

    times_held = EVERY_FIELD

    def __init__(self, details: Mapping[str, Any]) -> None:
        """The place `details` describes.  Its network from `SPELL_ATMOSPHERE`, else the real one."""
        self.kind = str(details.get("kind") or EACH_PERSONS_OWN)
        self.name = str(details.get("name", ""))
        at = details.get("at")
        self.accounts = [str(at)] if self.kind == ONE_ACCOUNT else [str(one) for one in details.get("accounts", [])]
        self.corner = str(at or DEFAULT_CORNER) if self.kind == EACH_PERSONS_OWN else DEFAULT_CORNER
        self.collections = {
            collection: str(held["at"]) for collection, held in details.get("collections", {}).items() if held.get("at")
        }
        self.network = {**REAL_NETWORK, **json.loads(os.environ.get(NETWORK_VARIABLE) or "{}")}
        # every record seen, by collection and id
        self.known: dict[tuple[str, str], KnownRecord] = {}
        # each collection's number fields, kept as text
        self.numbers: dict[str, set[str]] = {}
        # each account's host, once it's been asked for
        self._hosts: dict[str, str] = {}
        # a DID for each handle a line names
        self._dids: dict[str, str] = {}
        self._session: Session | None = None
        # why signing in failed:  said again, rather than asked again
        self._problem: PlaceError | None = None

    ################
    # ## Signing in
    ################

    def session(self) -> Session | None:
        """Who's signed in, signing in the first time:  `None` when the environment names nobody.

        - throws `PlaceError` when the host refuses, an account can't be found, or nothing answers
          - a refusal is said again each time asked;  no answer is asked again
        """
        if self._problem is not None:
            raise self._problem
        if self._session is not None:
            return self._session
        who = key_from(HANDLE_VARIABLE)
        password = key_from(APP_PASSWORD_VARIABLE)
        if not who or not password:
            return None
        try:
            self._session = self._signed_in(handle_for(who), password)
        except PlaceError as error:
            problem = PlaceError(f"couldn't sign in as {who}:  {error}", error.kind, error.why_not)
            # a host that didn't answer is tried again;  a wrong password won't get better
            if error.kind != "no answer":
                self._problem = problem
            raise problem from error
        return self._session

    def signed_in_person(self) -> tuple[str, str] | None:
        """Who's signed in, as their DID and what they go by:  `None` for nobody.

        - NEVER throws:  a sign-in that fails is said by the next read or write of this place
        """
        try:
            session = self.session()
        except PlaceError:
            return None
        return (session.did, session.handle) if session else None

    def fields_it_fills_in(self) -> Row:
        """What it says of a new row by itself:  `owner`, the account signed in."""
        who = self.signed_in_person()
        return {OWNER_FIELD: who[0]} if who else {}

    def _signed_in(self, who: str, password: str) -> Session:
        """A new session for `who`.  - throws `PlaceError`"""
        did = self._account_of(who)
        host = self._host_of(did)
        session = self._answer(
            f"{host}/xrpc/com.atproto.server.createSession", {"identifier": did, "password": password}
        )
        return Session(str(session["did"]), str(session.get("handle") or who), host, str(session["accessJwt"]))

    def _needs_sign_in(self) -> Session:
        """Who's signed in.  - throws `PlaceError` `"refused"` saying how to, for nobody"""
        session = self.session()
        if session is None:
            raise PlaceError(
                f'"{self.name}" needs someone signed in:  set {HANDLE_VARIABLE} and {APP_PASSWORD_VARIABLE}, '
                "an app password from the account's settings",
                "refused",
            )
        return session

    ################
    # ## Reading
    ################

    async def rows(self, collection: str) -> list[Row]:
        """Every row of `collection`, asked of each account off the event loop."""
        return await asyncio.to_thread(self.rows_now, collection)

    def rows_now(self, collection: str) -> list[Row]:
        """Every row of `collection`, each account's newest first, the person signed in first.

        - throws `PlaceError`:  no answer, an account nobody has, or nobody to read
        """
        nsid = self._full_name(collection)
        accounts = self._accounts_read()
        if not accounts:
            raise PlaceError(
                f"\"{self.name}\" is each person's own, and nobody's signed in:  "
                f"set {HANDLE_VARIABLE} and {APP_PASSWORD_VARIABLE}, or name the accounts under the place",
                "refused",
            )
        rows: list[Row] = []
        for did in accounts:
            for record in self._records_of(did, nsid):
                rows.append(self._row_for(collection, did, record))
        return rows

    def _accounts_read(self) -> list[str]:
        """The accounts a read goes through, as DIDs:  see the module's docs."""
        named = [self._account_of(account) for account in self.accounts]
        if self.kind == ONE_ACCOUNT:
            return named
        session = self.session()
        return list(dict.fromkeys([*([session.did] if session else []), *named]))

    def _records_of(self, did: str, nsid: str) -> list[dict[str, Any]]:
        """Every record `did` holds in `nsid`, page by page."""
        host = self._host_of(did)
        records: list[dict[str, Any]] = []
        cursor = None
        for _ in range(MOST_PAGES):
            page = {"cursor": cursor} if cursor else {}
            search = {"repo": did, "collection": nsid, "limit": MOST_IN_A_PAGE, **page}
            answer = self._answer(f"{host}/xrpc/com.atproto.repo.listRecords?{urllib.parse.urlencode(search)}")
            records.extend(answer.get("records", []))
            cursor = answer.get("cursor")
            if not cursor:
                break
        return records

    def _row_for(self, collection: str, did: str, record: Mapping[str, Any]) -> Row:
        """`record`, of `did`, as a row, and noted:  a key another account already goes by reads as `<did>/<key>`."""
        rkey = key_in(str(record["uri"]))
        holder = self.known.get((collection, rkey))
        the_id = rkey if holder is None or holder.did == did else f"{did}/{rkey}"
        value = dict(record.get("value", {}))
        self.known[(collection, the_id)] = KnownRecord(did, rkey, str(record.get("cid", "")), value)
        return row_of(the_id, did, value)

    def _full_name(self, collection: str) -> str:
        """A collection's full name:  what its lines say, or its name under the corner."""
        said = self.collections.get(collection)
        return said if said and "." in said else f"{self.corner}.{nsid_name_of(said or collection)}"

    ################
    # ## Writing
    ################

    def know_numbers(self, collection: str, fields: list[str]) -> None:
        """SIDE EFFECT:  `fields` of `collection` are numbers, kept as text."""
        self.numbers.setdefault(collection, set()).update(fields)

    def apply(self, changes: list[Change]) -> None:
        """Make `changes`, the account signed in's:  each thing's changes in one write.

        - throws `PlaceError`:  nobody signed in, someone else's, what a record can't hold, moved on since, no answer
        """
        if not changes:
            return
        session = self._needs_sign_in()
        self._know_whats_updated(changes, session)
        writes = self._writes_for(changes, session)
        if len(writes) == 1:
            self._write_one(session, writes[0])
        else:
            self._write_all(session, writes)

    def _know_whats_updated(self, changes: list[Change], session: Session) -> None:
        """Know each thing `changes` updates:  a record is written whole.  - throws `PlaceError` for one that's gone"""
        for change in changes:
            collection, the_id = change["collection"], str(change["id"])
            is_unknown = change["kind"] == "update" and (collection, the_id) not in self.known
            if is_unknown and not self._read_again(collection, the_id, session):
                raise PlaceError(f'"{collection}" {the_id} isn\'t there any more', "not found")

    def _read_again(self, collection: str, the_id: str, session: Session) -> bool:
        """SIDE EFFECT:  the record's noted, as its owner's host holds it now.  Is it there?"""
        did, rkey = self._where_is(the_id, session)
        search = {"repo": did, "collection": self._full_name(collection), "rkey": rkey}
        url = f"{self._host_of(did)}/xrpc/com.atproto.repo.getRecord?{urllib.parse.urlencode(search)}"
        try:
            record = self._answer(url)
        except PlaceError as error:
            if error.kind == "not found":
                return False
            raise
        self._row_for(collection, did, record)
        return True

    def _where_is(self, the_id: str, session: Session) -> tuple[str, str]:
        """Whose a thing not known is, and its key:  `<did>/<key>`, else this account's."""
        did, slash, rkey = the_id.partition("/")
        return (did, rkey) if slash else (session.did, the_id)

    def _writes_for(self, changes: list[Change], session: Session) -> list[AccountWrite]:
        """`changes`, as one write per thing, in the order they were made.  - throws `PlaceError` for what can't be"""
        writes: dict[tuple[str, str], AccountWrite] = {}
        for change in changes:
            collection, the_id = change["collection"], str(change["id"])
            key = (collection, the_id)
            known = self.known.get(key)
            self._refuse_if_not_theirs(collection, the_id, known, session)
            write = writes.get(key)
            if write is None:
                write = AccountWrite(
                    collection,
                    the_id,
                    self._full_name(collection),
                    known.rkey if known else checked_record_key(the_id),
                    False,
                    dict(known.value) if known else {},
                    known.cid if known else None,
                )
                writes[key] = write
            if change["kind"] == "delete":
                write.is_removed = True
            else:
                write.value.update(checked_fields(change.get("fields", {}), self.numbers.get(collection, set())))
        return list(writes.values())

    def _refuse_if_not_theirs(self, collection: str, the_id: str, known: KnownRecord | None, session: Session) -> None:
        """- throws `PlaceError` `"refused"`, `"owner"`, for what's someone else's"""
        named = self._account_of(self.accounts[0]) if self.kind == ONE_ACCOUNT else None
        owner = known.did if known else (the_id.partition("/")[0] if "/" in the_id else named)
        if owner is not None and owner != session.did:
            raise PlaceError(f'"{collection}" {the_id} is {owner}\'s, and only they can change it', "refused", "owner")

    def _write_one(self, session: Session, write: AccountWrite) -> None:
        """One thing's write, checked against its version."""
        body = {
            "repo": session.did,
            "collection": write.nsid,
            "rkey": write.rkey,
            **({"swapRecord": write.version} if write.version is not None else {}),
        }
        if write.is_removed:
            self._signed_in_answer(session, "com.atproto.repo.deleteRecord", body)
            self.known.pop((write.collection, write.id), None)
            return
        record = record_of(write)
        answer = self._signed_in_answer(session, "com.atproto.repo.putRecord", {**body, "record": record})
        self._wrote(session, write, record, str(answer.get("cid", "")))

    def _write_all(self, session: Session, writes: list[AccountWrite]) -> None:
        """Several things' writes, all or nothing:  each record checked, then that the account hasn't moved since."""
        latest = urllib.parse.urlencode({"did": session.did})
        commit_url = f"{session.host}/xrpc/com.atproto.sync.getLatestCommit?{latest}"
        swap_commit = self._answer(commit_url)["cid"]
        asked: list[dict[str, Any]] = []
        for write in writes:
            held = self._held_version(session, write)
            if write.version is not None and held != write.version:
                raise PlaceError(f'"{write.collection}" {write.id} has moved on since it was read', "out of date")
            if write.is_removed and held is None:
                continue
            asked.append(atomic_write(write, held is not None))
        body = {"repo": session.did, "writes": asked, "swapCommit": swap_commit}
        results = self._signed_in_answer(session, "com.atproto.repo.applyWrites", body).get("results", [])
        answered = iter(results)
        for write in writes:
            if write.is_removed:
                self.known.pop((write.collection, write.id), None)
                continue
            self._wrote(session, write, record_of(write), str(next(answered, {}).get("cid", "")))

    def _held_version(self, session: Session, write: AccountWrite) -> str | None:
        """The version `write`'s record is at now:  `None` when it isn't there."""
        search = {"repo": session.did, "collection": write.nsid, "rkey": write.rkey}
        url = f"{session.host}/xrpc/com.atproto.repo.getRecord?{urllib.parse.urlencode(search)}"
        try:
            return str(self._answer(url)["cid"])
        except PlaceError as error:
            if error.kind == "not found":
                return None
            raise

    def _wrote(self, session: Session, write: AccountWrite, record: dict[str, Any], cid: str) -> None:
        """`write`'s record is kept, at version `cid`."""
        self.known[(write.collection, write.id)] = KnownRecord(session.did, write.rkey, cid, record)

    ################
    # ## Asking
    ################

    def _signed_in_answer(self, session: Session, method: str, body: dict[str, Any]) -> dict[str, Any]:
        """Send `method` as the person signed in, to their own host."""
        return self._answer(f"{session.host}/xrpc/{method}", body, token=session.token)

    def _answer(self, url: str, body: Mapping[str, Any] | None = None, *, token: str | None = None) -> dict[str, Any]:
        """What `url` answers, as JSON, POSTing `body` when there is one.

        - `token`:  sent as the person signed in, so a 401 means that's over.
        - throws `PlaceError`:
          - `InvalidSwap`:  `"out of date"`
          - what isn't there:  `"not found"`
          - any other 4xx:  `"refused"`
          - no answer (5xx, 408, 425, 429), or a session that's ended:  `"no answer"`
        """
        headers = {"content-type": "application/json"} if body is not None else {}
        if token is not None:
            headers["authorization"] = f"Bearer {token}"
        data = json.dumps(body).encode("utf-8") if body is not None else None
        request = urllib.request.Request(url, data=data, headers=headers, method="POST" if body is not None else "GET")
        try:
            with open_minding_limits(request) as response:
                text = response.read().decode("utf-8")
        except urllib.error.HTTPError as error:
            raise self._refusal(error.code, json_object_in(error.read()), url, token is not None) from error
        except (urllib.error.URLError, OSError) as error:
            raise PlaceError(f"{url}:  no answer ({error})") from error
        return json.loads(text) if text.strip() else {}

    def _refusal(self, status: int, said: Mapping[str, Any], url: str, is_signed_in: bool) -> PlaceError:
        """What a host's no means."""
        error = str(said.get("error") or "")
        message = str(said.get("message") or status)
        if status >= 500 or status in TRY_AGAIN_STATUSES:
            return PlaceError(f"{url}:  {error} {message}".strip())
        if is_signed_in and (status == 401 or error in SESSION_OVER):
            self._session = None
            return PlaceError(f"the sign-in has ended, so this wasn't kept:  {message};  the next write signs in again")
        if error == "InvalidSwap":
            return PlaceError(message, "out of date")
        if error in NOT_THERE or status == 404 or NO_SUCH_ACCOUNT.search(message):
            return PlaceError(message, "not found")
        return PlaceError(message, "refused", "place")

    ################
    # ## Where each account is
    ################

    def _account_of(self, who: str) -> str:
        """Whose `who` is:  a DID as it is, a handle asked about."""
        if who.startswith("did:"):
            return who
        if who not in self._dids:
            search = urllib.parse.urlencode({"handle": who})
            answer = self._answer(f"{self.network['handles']}/xrpc/com.atproto.identity.resolveHandle?{search}")
            self._dids[who] = str(answer["did"])
        return self._dids[who]

    def _host_of(self, did: str) -> str:
        """The host holding `did`'s records.  - throws `PlaceError` `"not found"` for an account with none"""
        if did not in self._hosts:
            self._hosts[did] = host_in(did, self._answer(document_url_for(did, self.network["directory"])))
        return self._hosts[did]


################
# ## Records and rows
################


def row_of(the_id: str, did: str, record: Mapping[str, Any]) -> Row:
    """A row, from a record:  its own `id` and `owner` are the place's, whatever it says."""
    fields = {name: value for name, value in record.items() if name != TYPE_FIELD}
    return {**fields, ID_FIELD: the_id, OWNER_FIELD: did}


def record_of(write: AccountWrite) -> dict[str, Any]:
    """The record `write` keeps:  it says what kind it is."""
    return {**write.value, TYPE_FIELD: write.nsid}


def atomic_write(write: AccountWrite, is_there: bool) -> dict[str, Any]:
    """`write` as one of `applyWrites`'s:  whether its record's there says which."""
    kind = "delete" if write.is_removed else "update" if is_there else "create"
    return {
        TYPE_FIELD: f"com.atproto.repo.applyWrites#{kind}",
        "collection": write.nsid,
        "rkey": write.rkey,
        **({} if write.is_removed else {"value": record_of(write)}),
    }


def key_in(uri: str) -> str:
    """A record's key, from its address."""
    return uri[uri.rfind("/") + 1 :]


def checked_record_key(the_id: str) -> str:
    """`the_id`, as a record key.  - throws `PlaceError` `"refused"` for one that can't be"""
    if RECORD_KEY.match(the_id) and the_id not in (".", ".."):
        return the_id
    raise PlaceError(f"\"{the_id}\" can't be a record's key:  only letters, digits and . - _ : ~", "refused", "field")


def checked_fields(fields: Mapping[str, Any], numbers: set[str]) -> dict[str, Any]:
    """What a change writes, as a record can hold it:  see the module's docs.

    - Never its id or its owner, a field starting `$` (the protocol's own), nor nothing at all.
    - A number field is written as text.
    - throws `PlaceError` `"refused"`, `"field"`, for a decimal number anywhere else
    """
    written = {
        name: number_as_text(value) if name in numbers else value
        for name, value in fields.items()
        if name not in (ID_FIELD, OWNER_FIELD) and not name.startswith("$") and value is not None
    }
    for name, value in written.items():
        refuse_if_not_a_records_value(name, value)
    return written


def number_as_text(value: object) -> object:
    """A number as text, as javascript writes it:  `12.5` is `"12.5"`, `4.0` is `"4"`.  Anything else as it is."""
    if isinstance(value, bool) or not isinstance(value, int | float):
        return value
    return str(int(value)) if float(value).is_integer() else str(value)


def refuse_if_not_a_records_value(field: str, value: object) -> None:
    """- throws `PlaceError` `"refused"`, `"field"`, for a decimal anywhere in `value`:  the protocol has none"""
    if isinstance(value, float) and not value.is_integer():
        message = f"{field} is {value}, and an atmosphere account keeps whole numbers only:  round it, or use text"
        raise PlaceError(message, "refused", "field")
    if isinstance(value, Mapping):
        for inner in value.values():
            refuse_if_not_a_records_value(field, inner)
    elif isinstance(value, list):
        for inner in value:
            refuse_if_not_a_records_value(field, inner)


def handle_for(typed: str) -> str:
    """The handle someone meant:  `" @ana.bsky.social "`, `"ana@bsky.social"` are `"ana.bsky.social"`.  A DID stays."""
    who = typed.strip().removeprefix("@")
    return who if who.startswith("did:") else who.replace("@", ".")


def nsid_name_of(name: str) -> str:
    """`name` as one part of a collection's full name:  `sky_tasks` is `skyTasks`."""
    joined = NOT_IN_A_NAME.sub(lambda match: (match.group(1) or "").upper(), name)
    return re.sub(r"^\d+", "", joined)


def document_url_for(did: str, directory: str) -> str:
    """Where `did`'s document is:  the directory's, for a `did:plc`;  its own domain's, for a `did:web`.

    - throws `PlaceError` `"refused"` for an account of any other kind
    """
    if did.startswith("did:plc:"):
        return f"{directory}/{did}"
    if not did.startswith("did:web:"):
        raise PlaceError(f'"{did}" isn\'t a did:plc or a did:web', "refused", "place")
    host = urllib.parse.unquote(did[len("did:web:") :])
    return f"{'http' if host.startswith('localhost') else 'https'}://{host}/.well-known/did.json"


def host_in(did: str, document: Mapping[str, Any]) -> str:
    """The host `did`'s document names.  - throws `PlaceError` `"not found"` for one naming none"""
    for service in document.get("service", []):
        if service.get("id", "").endswith("#atproto_pds") and service.get("type") == "AtprotoPersonalDataServer":
            return str(service["serviceEndpoint"]).rstrip("/")
    raise PlaceError(f"{did} has no host:  its document names none", "not found")


__all__ = ["ATMOSPHERE_KINDS", "AtmosphereAccount"]
