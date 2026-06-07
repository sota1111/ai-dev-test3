from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.parse import router as parse_router
from app.api.modify import router as modify_router
from app.api.models import router as models_router
from app.api.auth import router as auth_router
from app.db import engine, Base
import app.models.saved_model  # noqa: F401  register ORM model


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="State Machine Simulator API", version="1.0.0", lifespan=lifespan)

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
app.include_router(models_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
