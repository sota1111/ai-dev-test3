from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.openai_service import parse_state_machine

router = APIRouter()


class ParseRequest(BaseModel):
    text: str


class Transition(BaseModel):
    from_state: str
    trigger: str
    to: str

    class Config:
        populate_by_name = True


class ParseResponse(BaseModel):
    initialState: str
    states: list[str]
    transitions: list[dict]


@router.post("/parse", response_model=ParseResponse)
async def parse(request: ParseRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    try:
        result = parse_state_machine(request.text)
        return ParseResponse(
            initialState=result["initialState"],
            states=result["states"],
            transitions=result["transitions"],
        )
    except KeyError as e:
        raise HTTPException(status_code=422, detail=f"Azure OpenAI returned unexpected format: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
