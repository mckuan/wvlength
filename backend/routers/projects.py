# projects.py
from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel
import os
import json
import hashlib
import time

from routers.uploads import load_meta

router = APIRouter(prefix="/projects", tags=["projects"])

STORAGE_DIR = os.path.join(os.path.dirname(__file__), ".projects_store")
os.makedirs(STORAGE_DIR, exist_ok=True)


def _project_id(name: str) -> str:
    ts = str(time.time())
    raw = f"{name}:{ts}"
    return hashlib.md5(raw.encode()).hexdigest()[:12]


def _project_path(project_id: str) -> str:
    return os.path.join(STORAGE_DIR, f"{project_id}.json")


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


def _write_project(record: dict) -> None:
    with open(_project_path(record["project_id"]), "w") as f:
        json.dump(record, f)


def _read_project(project_id: str) -> dict:
    path = _project_path(project_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
    with open(path) as f:
        return json.load(f)


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


@router.post("/")
def save_project(req: SaveProjectRequest):
    filename = _lookup_filename(req.file_id)
    project_id = _project_id(req.name)
    now = time.time()
    record = {
        "project_id":   project_id,
        "name":         req.name,
        "file_id":      req.file_id,
        "filename":     filename,
        "chart_config": req.chart_config.dict(),
        "created_at":   now,
        "updated_at":   now,
    }
    _write_project(record)
    return record


@router.get("/")
def list_projects():
    projects = []
    for name in os.listdir(STORAGE_DIR):
        if name.endswith(".json"):
            with open(os.path.join(STORAGE_DIR, name)) as f:
                projects.append(json.load(f))
    projects.sort(key=lambda p: p.get("updated_at", 0), reverse=True)
    return {"projects": projects}


@router.get("/{project_id}")
def get_project(project_id: str):
    return _read_project(project_id)


@router.put("/{project_id}")
def update_project(project_id: str, req: SaveProjectRequest):
    existing = _read_project(project_id)
    filename = _lookup_filename(req.file_id)
    record = {
        **existing,
        "name":         req.name,
        "file_id":      req.file_id,
        "filename":     filename,
        "chart_config": req.chart_config.dict(),
        "updated_at":   time.time(),
    }
    _write_project(record)
    return record


@router.patch("/{project_id}/rename")
def rename_project(project_id: str, req: RenameProjectRequest):
    existing = _read_project(project_id)
    existing["name"] = req.name
    existing["updated_at"] = time.time()
    _write_project(existing)
    return existing


@router.delete("/{project_id}")
def delete_project(project_id: str):
    path = _project_path(project_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
    os.remove(path)
    return {"deleted": project_id}