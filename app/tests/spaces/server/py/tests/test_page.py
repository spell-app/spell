"""Where a spell app finds its files:  the build folder (epic people-and-orgs J33)."""

import os
from pathlib import Path
from typing import Any

import pytest
from quart import Quart

import spell_quart
from spell_quart import built_folder, send_built


def test_built_folder_is_in_the_checkouts_build(monkeypatch: pytest.MonkeyPatch) -> None:
    """With no `$SPELL_BUILD_DIR`:  the `build/` of the checkout spell_quart is in, beside its `spaces/`."""
    monkeypatch.delenv("SPELL_BUILD_DIR", raising=False)
    folder = built_folder("spaces/@spell/examples/Solitaire")
    checkout = Path(spell_quart.__file__).resolve().parents[5]
    assert folder == checkout / "build" / "spaces" / "@spell" / "examples" / "Solitaire"
    assert (checkout / "spaces").is_dir()


def test_built_folder_follows_spell_build_dir(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """`$SPELL_BUILD_DIR`, the variable the node side reads too, points it elsewhere."""
    monkeypatch.setenv("SPELL_BUILD_DIR", str(tmp_path))
    assert built_folder("spaces/x") == tmp_path / "spaces" / "x"


def _built_app(folder: Path) -> Any:
    """A Quart app serving `folder`'s built files as a compiled program's app does (`send_built()`)."""
    app = Quart(__name__)

    @app.get("/spell/<path:path>")
    async def assets(path: str) -> Any:
        return await send_built(folder, path)

    return app


async def test_send_built_sends_the_brotli_copy_to_a_browser_that_takes_it(tmp_path: Path) -> None:
    """A built file's brotli copy, no older than it, goes as it is, with its own type (epic solid-2-final P2)."""
    (tmp_path / "spell-page.js").write_text("export const page = 1\n" * 200)
    (tmp_path / "spell-page.js.br").write_bytes(b"brotli bytes")
    client = _built_app(tmp_path).test_client()
    answer = await client.get("/spell/spell-page.js", headers={"Accept-Encoding": "gzip, br"})
    assert answer.status_code == 200
    assert answer.headers["Content-Encoding"] == "br"
    assert answer.headers["Content-Type"].startswith("text/javascript")
    assert "Accept-Encoding" in answer.headers["Vary"]
    assert "no-cache" in answer.headers["Cache-Control"]
    assert await answer.get_data() == b"brotli bytes"


async def test_send_built_sends_the_file_itself_otherwise(tmp_path: Path) -> None:
    """No brotli in the request, or a copy older than the file:  the file as it is."""
    (tmp_path / "spell-page.js").write_text("export const page = 1\n")
    (tmp_path / "spell-page.js.br").write_bytes(b"old")
    old = (tmp_path / "spell-page.js").stat().st_mtime - 60
    os.utime(tmp_path / "spell-page.js.br", (old, old))
    client = _built_app(tmp_path).test_client()
    for encodings in ["gzip", "gzip, br"]:
        answer = await client.get("/spell/spell-page.js", headers={"Accept-Encoding": encodings})
        assert "Content-Encoding" not in answer.headers
        assert await answer.get_data() == b"export const page = 1\n"


async def test_send_built_answers_not_modified_while_the_copy_matches(tmp_path: Path) -> None:
    """Checked each time:  "not modified" (304) for the ETag the browser holds;  outside the folder, 404."""
    (tmp_path / "spell-page.js").write_text("export const page = 1\n")
    client = _built_app(tmp_path).test_client()
    first = await client.get("/spell/spell-page.js")
    again = await client.get("/spell/spell-page.js", headers={"If-None-Match": first.headers["ETag"]})
    assert again.status_code == 304
    assert (await client.get("/spell/../secret.txt")).status_code == 404
