"""What the core says to the person running a program, in the program's language (epic spanish, P12).

- English is built in:  the same as the JavaScript core's, both read `messages.expected.json5`.
- A Spanish program's words file brings Spanish, `cartas.py.es.json5`'s `messages`.
"""

import json
from pathlib import Path

import pytest

from spell_core import Core
from spell_core.messages import MESSAGES

# The core's messages in English:  shared with the JavaScript core's tests.
EXPECTED: dict[str, str] = json.loads(
    (Path(__file__).parents[3] / "core" / "messages.expected.json5").read_text(encoding="utf-8")
)["messages"]

# A Spanish words file's `messages`, as `cartas.py.es.json5` holds them.
SPANISH = {
    "expect-passed": "Como se esperaba, {what} es {expected}",
    "expect-failed": "Inesperado: {what} debería ser {expected} pero en realidad es {actual}",
    "expect-truthy": "verdadero",
}


def test_english_is_built_in_and_the_same_as_the_javascript_cores() -> None:
    assert MESSAGES == EXPECTED


def test_a_message_fills_in_its_placeholders(core: Core) -> None:
    assert core.message("cant-draw", type="Card") == "⚠ Card can't draw"
    assert core.message("cant-draw") == "⚠ {type} can't draw"


def test_a_words_files_messages_by_key_and_english_for_the_rest(core: Core) -> None:
    core.use_messages(SPANISH)
    assert core.message("expect-truthy") == "verdadero"
    assert core.message("cant-draw", type="Carta") == "⚠ Carta can't draw"
    core.use_messages(None)
    assert core.message("expect-truthy") == "truthy"


def test_a_spanish_programs_failing_test_says_so_in_spanish(core: Core, capsys: pytest.CaptureFixture[str]) -> None:
    core.use_messages(SPANISH)

    def suma() -> None:
        core.expect(4, "2 + 2", 5, "5")
        core.expect(True, "funciona")

    core.test("probar la suma", suma)
    assert capsys.readouterr().out == (
        "❌ probar la suma\n"
        "  ❌ Inesperado: `2 + 2` debería ser `5` pero en realidad es `4`\n"
        "  ✅ Como se esperaba, `funciona` es verdadero\n"
    )


def test_load_words_brings_the_programs_messages(core: Core, tmp_path: Path) -> None:
    words = tmp_path / "cartas.py.es.json5"
    words.write_text(json.dumps({"lang": "es", "types": {}, "messages": SPANISH}), encoding="utf-8")
    core.load_words(words)
    assert core.message("expect-truthy") == "verdadero"
