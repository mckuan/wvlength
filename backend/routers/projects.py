# routers/projects.py
from fastapi import APIRouter, Depends, HTTPException
from typing import Literal, Optional, Union
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import time

from database import get_db
from models import Project, User
from routers.auth import get_current_user
from routers.uploads import load_meta

router = APIRouter(prefix="/projects", tags=["projects"])


# --- block schemas -----------------------------------------------------
# mirrors frontend/src/types/blocks.ts — keep these in sync by hand for now.
# discriminated on `type` so a mixed list in the request body parses into
# the right shape automatically.

class ChartConfig(BaseModel):
    chart_type:     str
    group_by:       Optional[str] = None
    heatmap_col_by: Optional[str] = None
    aggregation:    Optional[str] = None
    y_columns:      list[str]     = []
    axis_config:    dict          = {}
    color_config:   dict          = {}


class TextBlock(BaseModel):
    id:      str
    type:    Literal["text"]
    content: str = ""


class GraphBlock(BaseModel):
    id:                str
    type:              Literal["graph"]
    file_id:            Optional[str]         = None
    filename:            Optional[str]         = None
    chart_config:        Optional[ChartConfig] = None
    source_project_id:   Optional[int]         = None


Block = Union[TextBlock, GraphBlock]


class SaveProjectRequest(BaseModel):
    name:   str
    blocks: list[Block] = []


class BlocksUpdateRequest(BaseModel):
    blocks: list[Block]


class RenameProjectRequest(BaseModel):
    name: str


# --- helpers -------------------------------------------------------------

def _validate_graph_blocks(blocks: list[Block]) -> None:
    # every graph block that claims a file must point at a file that still
    # exists — same guard the old single-file_id version had, just applied
    # per-block instead of once
    for b in blocks:
        if isinstance(b, GraphBlock) and b.file_id:
            try:
                load_meta(b.file_id)
            except HTTPException:
                raise HTTPException(
                    status_code=400,
                    detail=f"File '{b.file_id}' not found — can't attach a graph block to missing data",
                )


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


# --- endpoints -------------------------------------------------------------

@router.post("/")
def save_project(
    req: SaveProjectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _validate_graph_blocks(req.blocks)
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
    source_project_id on a new block, without duplicating chart_config."""
    projects = (
        db.query(Project)
        .filter(Project.user_id == current_user.id)
        .order_by(Project.updated_at.desc())
        .all()
    )
    graphs = []
    for project in projects:
        for block in project.blocks or []:
            if block.get("type") == "graph" and block.get("chart_config"):
                graphs.append({
                    "project_id":   project.id,
                    "project_name": project.name,
                    "block_id":     block["id"],
                    "file_id":      block.get("file_id"),
                    "filename":     block.get("filename"),
                    "chart_config": block.get("chart_config"),
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
    _validate_graph_blocks(req.blocks)
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
    _validate_graph_blocks(req.blocks)
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
    db.delete(project)
    db.commit()
    return {"deleted": project_id}