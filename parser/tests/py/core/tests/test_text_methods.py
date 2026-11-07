"""Text:  `upper_case()`, `lower_case()`, `title_case()`.  Drawing's tests are in `test_drawing.py`."""

from spell_core import Core


def test_upper_and_lower_case_nothing_is_empty(core: Core) -> None:
    assert core.upper_case(core.get_item_at("queen", 0)) == "Q"
    assert core.upper_case(None) == ""
    assert core.upper_case(True) == "TRUE"
    assert core.lower_case(3.0) == "3"
    assert core.lower_case("ACE") == "ace"


def test_title_case_capitals_each_word(core: Core) -> None:
    assert core.title_case("ace of spades") == "Ace Of Spades"
    assert core.title_case("NASA rocket") == "NASA Rocket"
    assert core.title_case("jean-luc's  1st año") == "Jean-Luc's  1st Año"
    assert core.title_case(None) == ""
    assert core.title_case(3.0) == "3"


def test_unicode_is_the_character_or_empty(core: Core) -> None:
    assert core.unicode(0x1F0A0) == "🂠"
    assert core.unicode(65.0) == "A"
    assert core.unicode(1.5) == ""
    assert core.unicode(0x110000) == ""
    assert core.unicode(None) == ""
    assert core.unicode("x") == ""
