from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Optional
from pydantic import BaseModel
import numpy as np
import pandas as pd
import io
import os
import json
import hashlib
import time

router = APIRouter(prefix="/upload", tags=["upload"])

# ---------------------------------------------------------------------------
# Local storage helpers
# ---------------------------------------------------------------------------

STORAGE_DIR = os.path.join(os.path.dirname(__file__), ".csv_store")
os.makedirs(STORAGE_DIR, exist_ok=True)


def _file_id(filename: str) -> str:
    """Stable-ish ID: original name + upload timestamp."""
    ts = str(time.time())
    raw = f"{filename}:{ts}"
    return hashlib.md5(raw.encode()).hexdigest()[:12]


def _parquet_path(file_id: str) -> str:
    return os.path.join(STORAGE_DIR, f"{file_id}.parquet")


def _meta_path(file_id: str) -> str:
    return os.path.join(STORAGE_DIR, f"{file_id}.meta.json")


def save_df(file_id: str, df: pd.DataFrame, filename: str) -> None:
    """Persist the full DataFrame as Parquet + a tiny JSON metadata sidecar."""
    df.to_parquet(_parquet_path(file_id), index=False)
    meta = {
        "file_id": file_id,
        "filename": filename,
        "rows": len(df),
        "columns": [{"name": c, "type": str(df[c].dtype)} for c in df.columns],
        "uploaded_at": time.time(),
    }
    with open(_meta_path(file_id), "w") as f:
        json.dump(meta, f)


def load_df(file_id: str) -> pd.DataFrame:
    path = _parquet_path(file_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"File '{file_id}' not found in storage")
    return pd.read_parquet(path)


def load_meta(file_id: str) -> dict:
    path = _meta_path(file_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Metadata for '{file_id}' not found")
    with open(path) as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Upload endpoint — now returns a file_id so callers can reference the full data
# ---------------------------------------------------------------------------

@router.post("/")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))

    file_id = _file_id(file.filename)
    save_df(file_id, df, file.filename)

    # enforce 5-file queue — evict oldest
    all_files = []
    for name in os.listdir(STORAGE_DIR):
        if name.endswith(".meta.json"):
            with open(os.path.join(STORAGE_DIR, name)) as f:
                all_files.append(json.load(f))
    all_files.sort(key=lambda m: m["uploaded_at"])  # oldest first
    while len(all_files) > 5:
        oldest = all_files.pop(0)
        for path in [_parquet_path(oldest["file_id"]), _meta_path(oldest["file_id"])]:
            if os.path.exists(path):
                os.remove(path)

    columns = [{"name": col, "type": str(df[col].dtype)} for col in df.columns]
    preview = df.fillna("").to_dict(orient="records")
    return {"file_id": file_id, "filename": file.filename, "rows": len(df), "columns": columns, "preview": preview}


# ---------------------------------------------------------------------------
# List stored files
# ---------------------------------------------------------------------------


@router.get("/files")
def list_files():
    files = []
    for name in os.listdir(STORAGE_DIR):
        if name.endswith(".meta.json"):
            with open(os.path.join(STORAGE_DIR, name)) as f:
                files.append(json.load(f))
    files.sort(key=lambda m: m.get("uploaded_at", 0), reverse=True)
    return {"files": files}


@router.get("/files/{file_id}/preview")
def get_preview(file_id: str):
    df = load_df(file_id)
    meta = load_meta(file_id)
    preview = df.fillna("").to_dict(orient="records")
    return {
        "file_id": file_id,
        "filename": meta["filename"],
        "rows": meta["rows"],
        "columns": meta["columns"],
        "preview": preview,
    }


# ---------------------------------------------------------------------------
# Delete a stored file
# ---------------------------------------------------------------------------

@router.delete("/files/{file_id}")
def delete_file(file_id: str):
    removed = []
    for path in [_parquet_path(file_id), _meta_path(file_id)]:
        if os.path.exists(path):
            os.remove(path)
            removed.append(path)
    if not removed:
        raise HTTPException(status_code=404, detail=f"File '{file_id}' not found")
    return {"deleted": file_id}
