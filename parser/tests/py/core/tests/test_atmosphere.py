"""An atmosphere account as a place, and what every place's requests share:  waiting out a limit, and a key from the
environment.

- The whole path, signing in and writing to a fake host, is the app folder's `pythonPlaces.test.ts`.
"""

import io
import urllib.error
import urllib.request
from typing import Any

import pytest

from spell_core import place_kinds
from spell_core.atmosphere import (
    AccountWrite,
    AtmosphereAccount,
    atomic_write,
    checked_fields,
    checked_record_key,
    document_url_for,
    handle_for,
    host_in,
    nsid_name_of,
    number_as_text,
    row_of,
)
from spell_core.place_kinds import PlaceError, key_from, place_behind, post_json, wait_after


def http_error(status: int, headers: dict[str, str] | None = None) -> urllib.error.HTTPError:
    """What `urlopen()` raises for an answer of `status`."""
    return urllib.error.HTTPError("http://x/y", status, "no", headers or {}, io.BytesIO(b'{"error": "said no"}'))  # type: ignore[arg-type]


class Answer:
    """A successful answer, as `urlopen()` hands it back."""

    def __enter__(self) -> "Answer":
        return self

    def __exit__(self, *_: object) -> None:
        pass

    def read(self) -> bytes:
        return b'{"ok": true}'


def answered_by(monkeypatch: pytest.MonkeyPatch, *answers: Any) -> dict[str, list[Any]]:
    """`urlopen()` answers `answers` in turn, raising the exceptions;  `sleep()` only notes each wait."""
    asked: list[Any] = []
    slept: list[float] = []
    remaining = list(answers)

    def urlopen(request: urllib.request.Request, timeout: float) -> Answer:
        asked.append(request)
        answer = remaining.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer

    monkeypatch.setattr(place_kinds.urllib.request, "urlopen", urlopen)
    monkeypatch.setattr(place_kinds.time, "sleep", slept.append)
    return {"asked": asked, "slept": slept}


################
# ## Waiting out a limit
################


@pytest.mark.parametrize(
    ("status", "headers", "wait"),
    [
        (429, {"retry-after": "3"}, 3),
        (503, {"retry-after": "3"}, 3),
        (429, {}, 0),
        (403, {"x-ratelimit-remaining": "0", "x-ratelimit-reset": "40"}, 40),
        (403, {"x-ratelimit-remaining": "9"}, None),
        (404, {}, None),
        (401, {}, None),
    ],
)
def test_wait_after(status: int, headers: dict[str, str], wait: float | None) -> None:
    assert wait_after(status, headers) == wait


def test_a_retry_after_as_a_date_counts_from_now() -> None:
    assert wait_after(429, {"retry-after": "Mon, 01 Jan 2024 00:00:00 GMT"}) == 0


def test_a_short_wait_is_waited_out_and_asked_again(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = answered_by(monkeypatch, http_error(429, {"retry-after": "2"}), Answer())
    assert post_json("http://x/y", {}, {}) == {"ok": True}
    assert calls["slept"] == [2]
    assert len(calls["asked"]) == 2


def test_told_nothing_it_waits_a_second_then_two(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = answered_by(monkeypatch, http_error(503), http_error(503), Answer())
    assert post_json("http://x/y", {}, {}) == {"ok": True}
    assert calls["slept"] == [1, 2]


def test_a_long_wait_says_when_and_sends_nothing_more(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = answered_by(monkeypatch, http_error(429, {"retry-after": "600"}))
    with pytest.raises(PlaceError, match="the server asks to wait:  ask it again after"):
        post_json("http://x/y", {}, {})
    assert calls["slept"] == []
    assert len(calls["asked"]) == 1


def test_still_saying_to_wait_after_three_tries_is_an_answer(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = answered_by(monkeypatch, http_error(503), http_error(503), http_error(503))
    with pytest.raises(PlaceError, match="said no"):
        post_json("http://x/y", {}, {})
    assert len(calls["asked"]) == 3


def test_any_other_answer_is_not_waited_for(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = answered_by(monkeypatch, http_error(404))
    with pytest.raises(PlaceError, match="said no"):
        post_json("http://x/y", {}, {})
    assert calls["slept"] == []


################
# ## Keys
################


def test_a_key_comes_from_the_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SPELL_TEST_KEY", "shh")
    monkeypatch.setenv("SPELL_TEST_EMPTY", "")
    assert key_from("SPELL_TEST_KEY") == "shh"
    assert key_from("SPELL_TEST_EMPTY") is None
    assert key_from("SPELL_TEST_MISSING") is None


################
# ## The place
################


def test_an_atmosphere_account_is_what_its_kind_makes() -> None:
    behind = place_behind({"name": "sky", "kind": "personal atmosphere account"}, None)
    assert isinstance(behind, AtmosphereAccount)
    assert behind.times_held == place_kinds.EVERY_FIELD


def test_nobody_signed_in_reads_and_writes_say_how(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ATMOSPHERE_HANDLE", raising=False)
    monkeypatch.delenv("ATMOSPHERE_APP_PASSWORD", raising=False)
    place = AtmosphereAccount({"name": "sky", "kind": "personal atmosphere account"})
    with pytest.raises(PlaceError, match="ATMOSPHERE_HANDLE and ATMOSPHERE_APP_PASSWORD"):
        place.rows_now("tasks")
    with pytest.raises(PlaceError, match="ATMOSPHERE_HANDLE and ATMOSPHERE_APP_PASSWORD"):
        place.apply([{"kind": "insert", "collection": "tasks", "id": "x", "fields": {}}])
    assert place.signed_in_person() is None


def test_a_collection_goes_by_its_line_or_under_the_corner() -> None:
    place = AtmosphereAccount(
        {
            "kind": "personal atmosphere account",
            "at": "com.example.cookbook",
            "collections": {"recipes": {"at": "com.example.recipe"}, "shared_lists": {"at": "shared lists"}},
        }
    )
    assert place._full_name("recipes") == "com.example.recipe"
    assert place._full_name("shared_lists") == "com.example.cookbook.sharedLists"
    assert place._full_name("notes") == "com.example.cookbook.notes"
    assert AtmosphereAccount({"kind": "personal atmosphere account"})._full_name("notes") == "app.spell.data.notes"


@pytest.mark.parametrize(
    ("typed", "handle"),
    [
        (" @ana.bsky.social ", "ana.bsky.social"),
        ("ana@bsky.social", "ana.bsky.social"),
        ("did:plc:abc", "did:plc:abc"),
    ],
)
def test_handle_for(typed: str, handle: str) -> None:
    assert handle_for(typed) == handle


def test_nsid_name_of() -> None:
    assert nsid_name_of("sky_tasks") == "skyTasks"
    assert nsid_name_of("shared lists") == "sharedLists"
    assert nsid_name_of("2fast") == "fast"


def test_a_number_field_is_kept_as_text() -> None:
    assert number_as_text(12.5) == "12.5"
    assert number_as_text(4) == "4"
    assert number_as_text(4.0) == "4"
    assert number_as_text("x") == "x"
    assert number_as_text(True) is True


def test_checked_fields_keep_only_what_a_record_can_hold() -> None:
    fields = {"id": "x", "owner": "y", "$type": "z", "gone": None, "title": "a", "cost": 12.5, "count": 3}
    assert checked_fields(fields, {"cost"}) == {"title": "a", "cost": "12.5", "count": 3}


def test_a_decimal_anywhere_but_a_number_field_is_refused() -> None:
    with pytest.raises(PlaceError, match="keeps whole numbers only") as caught:
        checked_fields({"tags": [{"weight": 0.5}]}, set())
    assert caught.value.why_not == "field"


def test_a_key_a_record_cannot_have_is_refused() -> None:
    assert checked_record_key("task-1:x") == "task-1:x"
    for bad in ("a/b", "..", ""):
        with pytest.raises(PlaceError, match="can't be a record's key"):
            checked_record_key(bad)


def test_a_row_is_its_record_with_the_place_saying_whose() -> None:
    record = {"$type": "x.y", "title": "a", "id": "fake", "owner": "someone else"}
    assert row_of("k1", "did:plc:ana", record) == {"title": "a", "id": "k1", "owner": "did:plc:ana"}


def test_atomic_write_says_create_update_or_delete() -> None:
    write = AccountWrite("tasks", "k", "x.y", "k", False, {"title": "a"}, None)
    assert atomic_write(write, False)["$type"] == "com.atproto.repo.applyWrites#create"
    assert atomic_write(write, True)["$type"] == "com.atproto.repo.applyWrites#update"
    assert atomic_write(write, True)["value"] == {"title": "a", "$type": "x.y"}
    write.is_removed = True
    gone = atomic_write(write, True)
    assert gone["$type"] == "com.atproto.repo.applyWrites#delete"
    assert "value" not in gone


def test_where_an_account_is() -> None:
    assert document_url_for("did:plc:abc", "https://dir") == "https://dir/did:plc:abc"
    assert document_url_for("did:web:ana.example", "x") == "https://ana.example/.well-known/did.json"
    with pytest.raises(PlaceError):
        document_url_for("nobody", "x")
    document = {
        "service": [{"id": "#atproto_pds", "type": "AtprotoPersonalDataServer", "serviceEndpoint": "https://h/"}]
    }
    assert host_in("did:plc:abc", document) == "https://h"
    with pytest.raises(PlaceError, match="no host"):
        host_in("did:plc:abc", {"service": []})
