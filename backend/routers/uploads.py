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

    columns = [{"name": col, "type": str(df[col].dtype)} for col in df.columns]
    preview = df.fillna("").to_dict(orient="records") 
    return {
        "file_id": file_id,          # ← callers pass this to /aggregate and /summary
        "filename": file.filename,
        "rows": len(df),
        "columns": columns,
        "preview": preview,
    }


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


# ---------------------------------------------------------------------------
# Aggregate — accepts either inline `data` or a `file_id`
# ---------------------------------------------------------------------------

class AggregateRequest(BaseModel):
    file_id:     Optional[str]        = None   # preferred: reference stored file
    data:        Optional[list[dict]] = None   # fallback: inline rows
    group_by:    str
    value_col:   str
    aggregation: str
    bin_size:    Optional[float] = None


@router.post("/aggregate")
def aggregate_data(req: AggregateRequest):
    if req.file_id:
        df = load_df(req.file_id)
    elif req.data is not None:
        df = pd.DataFrame(req.data)
    else:
        raise HTTPException(status_code=400, detail="Provide either 'file_id' or 'data'")

    # coerce numerics
    for col in df.columns:
        try:
            df[col] = pd.to_numeric(df[col])
        except (ValueError, TypeError):
            pass

    if req.group_by not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{req.group_by}' not found")
    if req.aggregation != "count" and req.value_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{req.value_col}' not found")

    # bin numeric X if bin_size provided
    if req.bin_size and pd.api.types.is_numeric_dtype(df[req.group_by]):
        col_min = df[req.group_by].min()
        col_max = df[req.group_by].max()
        bins   = np.arange(col_min, col_max + req.bin_size, req.bin_size)
        labels = [f"{int(bins[i])}-{int(bins[i+1])}" for i in range(len(bins) - 1)]
        df["_group"] = pd.cut(
            df[req.group_by], bins=bins, labels=labels, right=False, include_lowest=True
        ).astype(str)
        group_col = "_group"
    else:
        group_col = req.group_by

    agg_map = {
        "mean":   lambda g: g[req.value_col].mean(),
        "sum":    lambda g: g[req.value_col].sum(),
        "count":  lambda g: g[req.value_col].count(),
        "median": lambda g: g[req.value_col].median(),
        "min":    lambda g: g[req.value_col].min(),
        "max":    lambda g: g[req.value_col].max(),
    }

    if req.aggregation not in agg_map:
        raise HTTPException(status_code=400, detail=f"Unknown aggregation '{req.aggregation}'")

    grouped = df.groupby(group_col, dropna=True)
    result  = agg_map[req.aggregation](grouped).reset_index()
    result.columns = ["x", "y"]
    result["y"] = result["y"].round(2)

    return {
        "data":        result.to_dict(orient="records"),
        "group_by":    req.group_by,
        "value_col":   req.value_col,
        "aggregation": req.aggregation,
        "bin_size":    req.bin_size,
    }


# ---------------------------------------------------------------------------
# Summary — accepts either inline `data` or a `file_id`
# ---------------------------------------------------------------------------

class SummaryRequest(BaseModel):
    file_id:  Optional[str]        = None
    data:     Optional[list[dict]] = None
    columns:  list[str]


@router.post("/summary")
def get_summary(req: SummaryRequest):
    if req.file_id:
        df = load_df(req.file_id)
    elif req.data is not None:
        df = pd.DataFrame(req.data)
    else:
        raise HTTPException(status_code=400, detail="Provide either 'file_id' or 'data'")

    for col in df.columns:
        try:
            df[col] = pd.to_numeric(df[col])
        except (ValueError, TypeError):
            pass

    result = {}
    for col in req.columns:
        if col not in df.columns:
            continue
        if not pd.api.types.is_numeric_dtype(df[col]):
            continue
        result[col] = {
            "min":    round(float(df[col].min()),    2),
            "max":    round(float(df[col].max()),    2),
            "mean":   round(float(df[col].mean()),   2),
            "median": round(float(df[col].median()), 2),
            "sd":     round(float(df[col].std()),    2),
            "count":  int(df[col].count()),
        }

    return {"summary": result}