import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from app import llm
from app.content import Extracted

FIX = Path(__file__).parent / "fixtures"


class FakeMessages:
    def __init__(self, payload: dict):
        self.payload = payload
        self.calls: list[dict] = []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(
            stop_reason="end_turn",
            content=[SimpleNamespace(type="text", text=json.dumps(self.payload, ensure_ascii=False))],
            usage=SimpleNamespace(input_tokens=1200, output_tokens=400, cache_read_input_tokens=0, cache_creation_input_tokens=800),
        )


@pytest.fixture
def fake_client(monkeypatch):
    payload = json.loads((FIX / "llm_recipe.json").read_text())
    fake = FakeMessages(payload)
    monkeypatch.setattr(llm.anthropic, "AsyncAnthropic", lambda **_: SimpleNamespace(messages=fake))
    return fake


async def test_extract_recipe_uses_structured_output(fake_client):
    ex = Extracted(platform="youtube", url="https://www.youtube.com/watch?v=x", description="2 su bardağı un ...")
    ex.frames = [b"\xff\xd8fake"]
    res = await llm.extract_recipe(ex)
    assert res.recipe["title"] == "Islak Kek"
    assert res.input_tokens == 2000 and res.output_tokens == 400
    assert res.cost_usd > 0

    call = fake_client.calls[0]
    assert call["output_config"]["format"]["type"] == "json_schema"
    assert call["output_config"]["format"]["schema"] is llm.RECIPE_SCHEMA
    # sistem istemi önbelleğe alınır
    assert call["system"][0]["cache_control"] == {"type": "ephemeral"}
    content = call["messages"][0]["content"]
    assert any(b["type"] == "image" for b in content)
    assert "2 su bardağı un" in content[0]["text"]


def test_schema_has_fixed_category_list():
    cats = llm.RECIPE_SCHEMA["properties"]["category"]["enum"]
    assert "Tatlılar" in cats and len(cats) == 11
    assert "su bardağı" in llm.UNITS


def test_estimate_cost():
    assert llm.estimate_cost("claude-opus-5-5", 1_000_000, 0) == 4.0
    assert llm.estimate_cost("claude-sonnet-5-5", 0, 1_000_000) == 10.0
