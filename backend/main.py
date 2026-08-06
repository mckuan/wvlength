from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import uploads, transforms, graph, projects, auth, share
from database import engine, Base
import models  # noqa: F401 — ensures User model is registered before create_all

app = FastAPI(title="WVLENGTH API")

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # your Vite dev server
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

@app.get("/")
def root():
    return {"status": "WVLENGTH API running"}