# routers/share.py
#
# Public, unauthenticated access to a project via its share_token.
# Kept as its own router (separate from routers/projects.py) so it's
# obvious at a glance which endpoints require login and which don't.
import os
import time
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Project
from routers.projects import Block, _dump_blocks, _image_path

router = APIRouter(prefix="/shared", tags=["shared"])


def _get_shared_project(token: str, db: Session) -> Project:
    project = db.query(Project).filter(Project.share_token == token).first()
    if not project:
        # same message whether the token never existed or was revoked —
        # don't leak which
        raise HTTPException(status_code=404, detail="This link isn't active")
    return project


def _require_edit(project: Project):
    if project.share_permission != "edit":
        raise HTTPException(status_code=403, detail="This link is view-only")


class SharedSaveRequest(BaseModel):
    name: str
    blocks: list[Block]


class SharedBlocksUpdateRequest(BaseModel):
    blocks: list[Block]


@router.get("/{token}")
def get_shared_project(token: str, db: Session = Depends(get_db)):
    project = _get_shared_project(token, db)
    return {
        "id": project.id,
        "name": project.name,
        "blocks": project.blocks,
        "permission": project.share_permission,  # frontend uses this to lock the UI
        "updated_at": project.updated_at,
    }


@router.put("/{token}")
def save_shared_project(token: str, req: SharedSaveRequest, db: Session = Depends(get_db)):
    project = _get_shared_project(token, db)
    _require_edit(project)
    project.name = req.name
    project.blocks = _dump_blocks(req.blocks)
    project.updated_at = time.time()
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{token}/blocks")
def update_shared_blocks(token: str, req: SharedBlocksUpdateRequest, db: Session = Depends(get_db)):
    project = _get_shared_project(token, db)
    _require_edit(project)
    project.blocks = _dump_blocks(req.blocks)
    project.updated_at = time.time()
    db.commit()
    db.refresh(project)
    return project


@router.post("/{token}/blocks/{block_id}/image")
async def upload_shared_block_image(
    token: str, block_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)
):
    project = _get_shared_project(token, db)
    _require_edit(project)
    contents = await file.read()
    with open(_image_path(project.id, block_id), "wb") as f:
        f.write(contents)
    return {"image_url": f"/shared/{token}/blocks/{block_id}/image"}


@router.get("/{token}/blocks/{block_id}/image")
def get_shared_block_image(token: str, block_id: str, db: Session = Depends(get_db)):
    project = _get_shared_project(token, db)  # no _require_edit — view links can still see images
    path = _image_path(project.id, block_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path, media_type="image/png")