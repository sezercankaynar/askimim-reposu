from pathlib import Path

from app.sources.website import parse_html

FIX = Path(__file__).parent / "fixtures"


def test_jsonld_recipe_in_graph():
    ex = parse_html((FIX / "recipe_site.html").read_text(), "https://example.com/banana-bread")
    assert ex.json_ld is not None
    assert ex.json_ld["name"] == "Best Banana Bread"
    assert "1 stick butter" in ex.json_ld["ingredients"]
    assert ex.json_ld["steps"][0].startswith("Preheat")
    assert ex.json_ld["yield"] == "8 servings"
    assert ex.author == "Jane Baker"
    assert ex.author_url == "https://example.com/jane"
    assert ex.thumbnail_url == "https://example.com/banana-large.jpg"
    assert ex.meta["source_kind"] == "json-ld"


def test_readability_fallback():
    ex = parse_html((FIX / "plain_site.html").read_text(), "https://example.com/corba")
    assert ex.json_ld is None
    assert "mercimek" in (ex.description or "").lower()
    assert ex.thumbnail_url == "https://example.com/corba.jpg"
    assert ex.meta["source_kind"] == "readability"
    assert ex.has_text()
