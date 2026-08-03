# routers/projects.py
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
import time

from database import get_db
from models import Project, User
from routers.auth import get_current_user
from routers.uploads import load_meta

router = APIRouter(prefix="/projects", tags=["projects"])


class ChartConfig(BaseModel):
    chart_type:     str
    group_by:       Optional[str] = None
    heatmap_col_by: Optional[str] = None
    aggregation:    Optional[str] = None
    y_columns:      list[str]     = []
    axis_config:    dict          = {}
    color_config:   dict          = {}


class SaveProjectRequest(BaseModel):
    name:         str
    file_id:      str
    chart_config: ChartConfig


class RenameProjectRequest(BaseModel):
    name: str


def _lookup_filename(file_id: str) -> str:
    # confirms the source dataset still exists so a project can't silently
    # point at deleted data, and grabs its filename for display
    try:
        meta = load_meta(file_id)
    except HTTPException:
        raise HTTPException(
            status_code=400,
            detail=f"File '{file_id}' not found — can't attach a project to a missing dataset",
        )
    return meta["filename"]


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


@router.post("/")
def save_project(
    req: SaveProjectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    filename = _lookup_filename(req.file_id)
    now = time.time()
    project = Project(
        user_id=current_user.id,
        name=req.name,
        file_id=req.file_id,
        filename=filename,
        chart_config=req.chart_config.dict(),
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
    project.file_id = req.file_id
    project.filename = _lookup_filename(req.file_id)
    project.chart_config = req.chart_config.dict()
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