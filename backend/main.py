from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from routers import uploads, transforms, graph, projects, auth, share
from database import engine, Base
import models  # noqa: F401 — ensures User model is registered before create_all

app = FastAPI(title="WVLENGTH API")

Base.metadata.create_all(bind=engine)

Frontend_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")   # Vite dev server

app.add_middleware(
    CORSMiddleware,
    allow_origins=[Frontend_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(uploads.router)
app.include_router(transforms.router)
app.include_router(graph.router)
app.include_router(projects.router)
app.include_router(auth.router)
app.include_router(share.router)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/")
def root():
    return {"status": "WVLENGTH API running"}