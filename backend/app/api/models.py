import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.saved_model import SavedModel

router = APIRouter()


class StateMachineModel(BaseModel):
    initialState: str
    states: list[str]
    parentStates: list[dict] = []
    transitions: list[dict]


class SaveModelRequest(BaseModel):
    name: str
    description: str
    machine: StateMachineModel


class UpdateModelRequest(BaseModel):
    name: str
    description: str
    machine: StateMachineModel


class ModelSummary(BaseModel):
    id: str
    name: str
    state_count: int
    transition_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ModelListResponse(BaseModel):
    models: list[ModelSummary]


class ModelDetail(BaseModel):
    id: str
    name: str
    description: str
    machine: StateMachineModel
    state_count: int
    transition_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def _to_detail(m: SavedModel) -> ModelDetail:
    return ModelDetail(
        id=m.id,
        name=m.name,
        description=m.description,
        machine=StateMachineModel(**json.loads(m.machine_json)),
        state_count=m.state_count,
        transition_count=m.transition_count,
        created_at=m.created_at,
        updated_at=m.updated_at,
    )


@router.get("/models", response_model=ModelListResponse)
def list_models(db: Session = Depends(get_db)):
    models = db.query(SavedModel).order_by(SavedModel.updated_at.desc()).all()
    return ModelListResponse(
        models=[
            ModelSummary(
                id=m.id,
                name=m.name,
                state_count=m.state_count,
                transition_count=m.transition_count,
                created_at=m.created_at,
                updated_at=m.updated_at,
            )
            for m in models
        ]
    )


@router.post("/models", response_model=ModelDetail, status_code=201)
def create_model(req: SaveModelRequest, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    m = SavedModel(
        id=str(uuid.uuid4()),
        name=req.name,
        description=req.description,
        machine_json=json.dumps(req.machine.model_dump()),
        state_count=len(req.machine.states),
        transition_count=len(req.machine.transitions),
        created_at=now,
        updated_at=now,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return _to_detail(m)


@router.get("/models/{model_id}", response_model=ModelDetail)
def get_model(model_id: str, db: Session = Depends(get_db)):
    m = db.query(SavedModel).filter(SavedModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")
    return _to_detail(m)


@router.put("/models/{model_id}", response_model=ModelDetail)
def update_model(model_id: str, req: UpdateModelRequest, db: Session = Depends(get_db)):
    m = db.query(SavedModel).filter(SavedModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")
    m.name = req.name
    m.description = req.description
    m.machine_json = json.dumps(req.machine.model_dump())
    m.state_count = len(req.machine.states)
    m.transition_count = len(req.machine.transitions)
    m.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(m)
    return _to_detail(m)


@router.post("/models/{model_id}/duplicate", response_model=ModelDetail, status_code=201)
def duplicate_model(model_id: str, db: Session = Depends(get_db)):
    original = db.query(SavedModel).filter(SavedModel.id == model_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Model not found")
    now = datetime.now(timezone.utc)
    copy = SavedModel(
        id=str(uuid.uuid4()),
        name=original.name + " (コピー)",
        description=original.description,
        machine_json=original.machine_json,
        state_count=original.state_count,
        transition_count=original.transition_count,
        created_at=now,
        updated_at=now,
    )
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return _to_detail(copy)


@router.delete("/models/{model_id}", status_code=204)
def delete_model(model_id: str, db: Session = Depends(get_db)):
    m = db.query(SavedModel).filter(SavedModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")
    db.delete(m)
    db.commit()
