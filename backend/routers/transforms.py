#transforms.py
#transformations on uploaded files, including null handling, aggregation, and coordinate splitting.
from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel
import numpy as np
import pandas as pd
import os
import json
 
from routers.uploads import load_df, save_df, load_meta, reset_to_original, _ensure_working_copy
router = APIRouter(prefix="/transforms", tags=["transforms"])
 
 
class ResetRequest(BaseModel):
    file_id: str
 
@router.post("/reset")
def reset_file(req: ResetRequest):
    df = reset_to_original(req.file_id)
    meta = load_meta(req.file_id)
    columns = [{"name": c, "type": str(df[c].dtype)} for c in df.columns]
    preview = df.fillna("").to_dict(orient="records")
    return {
        "file_id":  req.file_id,
        "filename": meta["filename"],
        "rows":     len(df),
        "columns":  columns,
        "preview":  preview,
    }
 
 
def _majority(x):
    m = x.mode()
    if m.empty:
        raise ValueError("No majority value found")
    return m.iloc[0]
 
 
STRING_AGGS = {
    "first":    "first",
    "last":     "last",
    "majority": _majority,
}
 
 
class NullInfoRequest(BaseModel):
    file_id: Optional[str]        = None
    data:    Optional[list[dict]] = None
 
 
 #finds out which columns have nulls and how many
@router.post("/null_info")
def null_info(req: NullInfoRequest):
    if req.file_id:
        _ensure_working_copy(req.file_id)
        df = load_df(req.file_id)
    elif req.data is not None:
        df = pd.DataFrame(req.data)
    else:
        raise HTTPException(status_code=400, detail="Provide either 'file_id' or 'data'")
 
    #tries to convert each column into numeric, to identify numeric columns 
    for col in df.columns:
        try:
            df[col] = pd.to_numeric(df[col])
        except (ValueError, TypeError):
            pass
 
    result = []
    for col in df.columns:
        null_count = int(df[col].isnull().sum())
        #reports how many nulls are in each column
        if null_count == 0:
            continue
        result.append({
            "column":     col,
            "null_count": null_count,
            "total":      len(df),
            "is_numeric": bool(pd.api.types.is_numeric_dtype(df[col])),
        })
 
    return {"nulls": result, "rows": len(df)}
 
 
class FillSpec(BaseModel):
    strategy: str
    value:    Optional[str] = None
 
class NullCleanRequest(BaseModel):
    file_id:  Optional[str]        = None
    data:     Optional[list[dict]] = None
    columns:  dict[str, FillSpec]
 
 #fill/drop logic
@router.post("/clean_nulls")
def clean_nulls(req: NullCleanRequest):
    if req.file_id:
        _ensure_working_copy(req.file_id)
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
    #each column has a strategy for how to handle nulls, which is applied here
    drop_rows_mask = pd.Series([False] * len(df), index=df.index)
 
    for col, spec in req.columns.items():
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Column '{col}' not found")
 
        if spec.strategy == "ignore":
            continue
        elif spec.strategy == "drop":
            drop_rows_mask |= df[col].isnull()
        elif spec.strategy == "mean":
            if not pd.api.types.is_numeric_dtype(df[col]):
                raise HTTPException(status_code=400, detail=f"Column '{col}' is not numeric")
            df[col] = df[col].fillna(df[col].mean())
        elif spec.strategy == "median":
            if not pd.api.types.is_numeric_dtype(df[col]):
                raise HTTPException(status_code=400, detail=f"Column '{col}' is not numeric")
            df[col] = df[col].fillna(df[col].median())
        elif spec.strategy == "mode":
            mode = df[col].mode()
            if not mode.empty:
                df[col] = df[col].fillna(mode.iloc[0])
        #if filling w number fails, keep as original instead of error
        elif spec.strategy == "fill":
            if spec.value is None:
                raise HTTPException(status_code=400, detail=f"No fill value for '{col}'")
            fill = pd.to_numeric(spec.value, errors="ignore")
            df[col] = df[col].fillna(fill)
        elif spec.strategy == "ffill":
            df[col] = df[col].ffill()
        elif spec.strategy == "bfill":
            df[col] = df[col].bfill()
        elif spec.strategy == "interpolate":
            if not pd.api.types.is_numeric_dtype(df[col]):
                raise HTTPException(status_code=400, detail=f"Column '{col}' is not numeric")
            df[col] = df[col].interpolate()
        else:
            raise HTTPException(status_code=400, detail=f"Unknown strategy '{spec.strategy}'")
 
    df = df[~drop_rows_mask].reset_index(drop=True)
 
    #save into working file
    if req.file_id:
        meta = load_meta(req.file_id)
        save_df(req.file_id, df, meta["filename"])
 
    columns = [{"name": c, "type": str(df[c].dtype)} for c in df.columns]
    preview  = df.fillna("").to_dict(orient="records")
 
    return {
        "file_id":  req.file_id,
        "rows":     len(df),
        "columns":  columns,
        "preview":  preview,
    }
 
 
class AggregateMultiRequest(BaseModel):
    file_id:      Optional[str]        = None
    data:         Optional[list[dict]] = None
    group_by:     str
    aggregations: dict[str, str]
 
 #group by and aggregation logic
@router.post("/aggregate_multi")
def aggregate_multi(req: AggregateMultiRequest):
    if req.file_id:
        _ensure_working_copy(req.file_id)
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
 
    if req.group_by not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{req.group_by}' not found")
 
    agg_map = {"mean": "mean", "sum": "sum", "count": "count",
               "median": "median", "min": "min", "max": "max"}
 
    agg_spec = {}
    for col, agg in req.aggregations.items():
        if col == req.group_by:
            continue
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Column '{col}' not found")
        if agg in STRING_AGGS:
            agg_spec[col] = STRING_AGGS[agg]
        elif agg in agg_map:
            if not pd.api.types.is_numeric_dtype(df[col]):
                raise HTTPException(status_code=400, detail=f"Column '{col}' is not numeric")
            agg_spec[col] = agg_map[agg]
        else:
            raise HTTPException(status_code=400, detail=f"Unknown aggregation '{agg}'")
 
    df["_group"] = df[req.group_by]
    result = df.groupby("_group", dropna=True).agg(agg_spec).reset_index()
    result = result.rename(columns={"_group": req.group_by})
 
    numeric_cols = result.select_dtypes(include="number").columns
    for col in numeric_cols:
        result[col] = result[col].round(2)
 
    if req.file_id:
        meta = load_meta(req.file_id)
        save_df(req.file_id, result, meta["filename"])
 
    return {
        "data":         result.to_dict(orient="records"),
        "group_by":     req.group_by,
        "aggregations": req.aggregations,
    }
 
 
class SplitCoordinatesRequest(BaseModel):
    file_id: str
    columns: list[str]
 
 #handles splitting coordinates
@router.post("/split_coordinates")
def split_coordinates(req: SplitCoordinatesRequest):
    _ensure_working_copy(req.file_id)
    df = load_df(req.file_id)
 
    existing = [col for col in req.columns if col in df.columns]
    missing  = [col for col in req.columns if col not in df.columns]
    if missing:
        print(f"Skipping already-split columns: {missing}")
 
    def parse_coord(val):
        try:
            cleaned = str(val).strip().strip("()[] ")
            parts = [float(p.strip()) for p in cleaned.split(",")]
            return parts
        except Exception:
            return []
 
    #count the number of dimensions in each coordinate column, and create new columns for each dimension
    for col in existing:
        parsed = df[col].apply(parse_coord)
        max_dims = parsed.apply(len).max()
        axis_names = ["x", "y", "z", "w", "v", "u"]
 
        for i in range(max_dims):
            axis = axis_names[i] if i < len(axis_names) else f"dim{i+1}"
            new_col = f"{col}_{axis}"
            result = parsed.apply(lambda p, i=i: p[i] if i < len(p) else None)
            df[new_col] = pd.to_numeric(result, errors="coerce")
 
        df = df.drop(columns=[col])
 
    meta = load_meta(req.file_id)
    save_df(req.file_id, df, meta["filename"])
 
    columns = [{"name": c, "type": str(df[c].dtype)} for c in df.columns]
    preview = df.fillna("").to_dict(orient="records")
 
    return {
        "file_id":  req.file_id,
        "filename": meta["filename"],
        "rows":     len(df),
        "columns":  columns,
        "preview":  preview,
    }
 
 
