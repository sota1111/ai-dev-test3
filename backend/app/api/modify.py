from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.openai_service import modify_state_machine

router = APIRouter()


class ParentStateModel(BaseModel):
    name: str
    children: list[str]
    initialChild: str | None = None
    isInterrupt: bool = False
    stateCategory: str | None = None


class StateMachineModel(BaseModel):
    initialState: str
    states: list[str]
    stateOwners: dict[str, str] = {}
    parentStates: list[ParentStateModel] = []
    transitions: list[dict]


class ModifyRequest(BaseModel):
    currentMachine: StateMachineModel
    request: str


class ModifiedTransition(BaseModel):
    from_: str
    trigger: str
    to: str

    class Config:
        populate_by_name = True


class ModifiedParentState(BaseModel):
    name: str
    addedChildren: list[str] = []
    removedChildren: list[str] = []


class DiffModel(BaseModel):
    addedStates: list[str] = []
    removedStates: list[str] = []
    addedTransitions: list[dict] = []
    removedTransitions: list[dict] = []
    addedParentStates: list[str] = []
    removedParentStates: list[str] = []
    modifiedParentStates: list[ModifiedParentState] = []


class ModifyResponse(BaseModel):
    updatedMachine: StateMachineModel
    diff: DiffModel


@router.post("/modify", response_model=ModifyResponse)
async def modify(request: ModifyRequest):
    if not request.request.strip():
        raise HTTPException(status_code=400, detail="request is required")
    try:
        current_dict = request.currentMachine.model_dump()
        result = modify_state_machine(current_dict, request.request)
        updated = result["updatedMachine"]
        diff = result.get("diff", {})
        return ModifyResponse(
            updatedMachine=StateMachineModel(
                initialState=updated["initialState"],
                states=updated["states"],
                stateOwners=updated.get("stateOwners", {}),
                parentStates=updated.get("parentStates", []),
                transitions=updated["transitions"],
            ),
            diff=DiffModel(
                addedStates=diff.get("addedStates", []),
                removedStates=diff.get("removedStates", []),
                addedTransitions=diff.get("addedTransitions", []),
                removedTransitions=diff.get("removedTransitions", []),
                addedParentStates=diff.get("addedParentStates", []),
                removedParentStates=diff.get("removedParentStates", []),
                modifiedParentStates=diff.get("modifiedParentStates", []),
            ),
        )
    except KeyError as e:
        raise HTTPException(status_code=422, detail=f"Azure OpenAI returned unexpected format: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
