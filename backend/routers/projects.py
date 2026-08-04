# routers/projects.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from typing import Literal, Optional, Union
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os
import time

from database import get_db
from models import Project, User
from routers.auth import get_current_user

router = APIRouter(prefix="/projects", tags=["projects"])

IMAGE_DIR = os.path.join(os.path.dirname(__file__), ".chart_images")
os.makedirs(IMAGE_DIR, exist_ok=True)


# --- block schemas -----------------------------------------------------
# mirrors frontend/src/types/blocks.ts — keep these in sync by hand for now.
# Graph blocks are snapshots (captured PNG + stats), not live chart_config —
# there's no in-place "edit," a user who wants a different chart makes a
# new block. This also means a block no longer depends on its source file
# continuing to exist in the upload queue.

class ColumnStats(BaseModel):
    min:    float
    max:    float
    mean:   float
    median: float
    sd:     float
    count:  int


class TextBlock(BaseModel):
    id:      str
    type:    Literal["text"]
    content: str = ""


class GraphBlock(BaseModel):
    id:                str
    type:              Literal["graph"]
    chart_type:        Optional[str]                    = None
    image_url:         Optional[str]                    = None
    stats:             Optional[dict[str, ColumnStats]] = None
    source_project_id: Optional[int]                    = None
    source_block_id:   Optional[str]                    = None


Block = Union[TextBlock, GraphBlock]


class SaveProjectRequest(BaseModel):
    name:   str
    blocks: list[Block] = []


class BlocksUpdateRequest(BaseModel):
    blocks: list[Block]


class RenameProjectRequest(BaseModel):
    name: str


# --- helpers -------------------------------------------------------------

def _get_owned_project(project_id: int, current_user: User, db: Session) -> Project:
    # scoping by user_id here is what makes this "your" project and not
    # just any project — a user can never fetch/edit/delete another
    # user's project, even if they guess a valid project_id
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
    return project


def _dump_blocks(blocks: list[Block]) -> list[dict]:
    return [b.dict() for b in blocks]


def _image_path(project_id: int, block_id: str) -> str:
    return os.path.join(IMAGE_DIR, f"{project_id}_{block_id}.png")


# --- endpoints -------------------------------------------------------------

@router.post("/")
def save_project(
    req: SaveProjectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = time.time()
    project = Project(
        user_id=current_user.id,
        name=req.name,
        blocks=_dump_blocks(req.blocks),
        created_at=now,
        updated_at=now,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/")
def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    projects = (
        db.query(Project)
        .filter(Project.user_id == current_user.id)
        .order_by(Project.updated_at.desc())
        .all()
    )
    return {"projects": projects}


@router.get("/graphs")
def list_all_graph_blocks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Flattens every configured graph block across all of the user's projects.
    Backs the 'past graph' picker — each entry can be reused by setting
    source_project_id/source_block_id on a new block, pointing at the same
    stored image instead of capturing a new one."""
    projects = (
        db.query(Project)
        .filter(Project.user_id == current_user.id)
        .order_by(Project.updated_at.desc())
        .all()
    )
    graphs = []
    for project in projects:
        for block in project.blocks or []:
            if block.get("type") == "graph" and block.get("image_url"):
                graphs.append({
                    "project_id":   project.id,
                    "project_name": project.name,
                    "block_id":     block["id"],
                    "chart_type":   block.get("chart_type"),
                    "image_url":    block.get("image_url"),
                    "stats":        block.get("stats"),
                })
    return {"graphs": graphs}


@router.get("/{project_id}")
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_owned_project(project_id, current_user, db)


@router.put("/{project_id}")
def update_project(
    project_id: int,
    req: SaveProjectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _get_owned_project(project_id, current_user, db)
    project.name = req.name
    project.blocks = _dump_blocks(req.blocks)
    project.updated_at = time.time()
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}/blocks")
def update_blocks(
    project_id: int,
    req: BlocksUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Overwrites the full blocks array. Simplest correct option for
    autosave — the frontend always sends its current in-memory list."""
    project = _get_owned_project(project_id, current_user, db)
    project.blocks = _dump_blocks(req.blocks)
    project.updated_at = time.time()
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}/rename")
def rename_project(
    project_id: int,
    req: RenameProjectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _get_owned_project(project_id, current_user, db)
    project.name = req.name
    project.updated_at = time.time()
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _get_owned_project(project_id, current_user, db)
    # clean up any captured chart images so they don't pile up on disk
    for block in project.blocks or []:
        if block.get("type") == "graph" and block.get("image_url"):
            path = _image_path(project_id, block["id"])
            if os.path.exists(path):
                os.remove(path)
    db.delete(project)
    db.commit()
    return {"deleted": project_id}


@router.post("/{project_id}/blocks/{block_id}/image")
async def upload_block_image(
    project_id: int,
    block_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stores a captured chart PNG for one block. Called right before the
    PATCH that saves the block's chart_type/stats — the frontend uploads
    the image first, gets back a URL, then includes that URL in the block."""
    _get_owned_project(project_id, current_user, db)  # ownership check only
    contents = await file.read()
    with open(_image_path(project_id, block_id), "wb") as f:
        f.write(contents)
    return {"image_url": f"/projects/{project_id}/blocks/{block_id}/image"}


@router.get("/{project_id}/blocks/{block_id}/image")
def get_block_image(
    project_id: int,
    block_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_project(project_id, current_user, db)  # ownership check only
    path = _image_path(project_id, block_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path, media_type="image/png")