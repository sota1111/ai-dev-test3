import pytest
from unittest.mock import patch

def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@patch("app.api.parse.parse_state_machine")
def test_parse_success(mock_parse, client):
    mock_parse.return_value = {
        "initialState": "赤",
        "states": ["赤", "青", "黄"],
        "transitions": [
            {"from": "赤", "trigger": "点灯", "to": "青"},
            {"from": "青", "trigger": "点灯", "to": "黄"},
            {"from": "黄", "trigger": "点灯", "to": "赤"},
        ]
    }
    
    response = client.post("/api/parse", json={"text": "信号機"})
    assert response.status_code == 200
    data = response.json()
    assert data["initialState"] == "赤"
    assert "青" in data["states"]
    assert len(data["transitions"]) == 3

@patch("app.api.parse.parse_state_machine")
def test_parse_door(mock_parse, client):
    mock_parse.return_value = {
        "initialState": "閉",
        "states": ["閉", "開"],
        "transitions": [
            {"from": "閉", "trigger": "開ける", "to": "開"},
            {"from": "開", "trigger": "閉める", "to": "閉"},
        ]
    }
    
    response = client.post("/api/parse", json={"text": "ドア"})
    assert response.status_code == 200
    data = response.json()
    assert len(data["transitions"]) > 0

def test_parse_empty_text(client):
    response = client.post("/api/parse", json={"text": ""})
    assert response.status_code == 400

def test_parse_whitespace_only(client):
    response = client.post("/api/parse", json={"text": "   "})
    assert response.status_code == 400

@patch("app.api.parse.parse_state_machine")
def test_parse_openai_exception(mock_parse, client):
    mock_parse.side_effect = Exception("API error")
    response = client.post("/api/parse", json={"text": "test"})
    assert response.status_code == 500

@patch("app.api.parse.parse_state_machine")
def test_parse_key_error(mock_parse, client):
    mock_parse.side_effect = KeyError("initialState")
    response = client.post("/api/parse", json={"text": "test"})
    assert response.status_code == 422
