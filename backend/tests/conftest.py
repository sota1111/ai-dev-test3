import os
import tempfile

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault(
    "DATABASE_URL",
    f"sqlite:///{tempfile.gettempdir()}/ai_dev_test3_models_test_{os.getpid()}.db",
)

from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
