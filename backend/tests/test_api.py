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
        "parentStates": [],
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
    assert data["parentStates"] == []

@patch("app.api.parse.parse_state_machine")
def test_parse_door(mock_parse, client):
    mock_parse.return_value = {
        "initialState": "閉",
        "states": ["閉", "開"],
        "parentStates": [],
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

@patch("app.api.parse.parse_state_machine")
def test_parse_hierarchical_response(mock_parse, client):
    mock_parse.return_value = {
        "initialState": "受付中",
        "states": ["受付中", "担当者確認中", "回答作成中", "回答済み"],
        "parentStates": [
            {"name": "問い合わせ対応", "children": ["受付中", "担当者確認中", "回答作成中", "回答済み"]}
        ],
        "transitions": [
            {"from": "受付中", "trigger": "担当者割り当て", "to": "担当者確認中"},
            {"from": "担当者確認中", "trigger": "回答開始", "to": "回答作成中"},
            {"from": "回答作成中", "trigger": "回答送信", "to": "回答済み"},
        ]
    }
    
    response = client.post("/api/parse", json={"text": "問い合わせ対応フロー"})
    assert response.status_code == 200
    data = response.json()
    assert data["initialState"] == "受付中"
    assert len(data["parentStates"]) == 1
    assert data["parentStates"][0]["name"] == "問い合わせ対応"
    assert "受付中" in data["parentStates"][0]["children"]
    assert len(data["transitions"]) == 3

@patch("app.api.parse.parse_state_machine")
def test_parse_no_parent_states_key(mock_parse, client):
    # When OpenAI response omits parentStates key, should default to empty list
    mock_parse.return_value = {
        "initialState": "A",
        "states": ["A", "B"],
        "transitions": [{"from": "A", "trigger": "go", "to": "B"}]
    }
    
    response = client.post("/api/parse", json={"text": "simple"})
    assert response.status_code == 200
    data = response.json()
    assert data["parentStates"] == []
