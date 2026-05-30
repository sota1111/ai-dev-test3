from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.parse import router as parse_router
from app.api.modify import router as modify_router

app = FastAPI(title="State Machine Simulator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(parse_router, prefix="/api")
app.include_router(modify_router, prefix="/api")
