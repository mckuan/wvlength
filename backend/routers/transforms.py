from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel
import numpy as np
import pandas as pd
import os
import json

from routers.uploads import load_df

router = APIRouter(prefix="/transforms", tags=["transforms"])


# class AggregateRequest(BaseModel):
#     file_id:     Optional[str]        = None
#     data:        Optional[list[dict]] = None
#     group_by:    str
#     value_col:   str
#     aggregation: str
#     bin_size:    Optional[float] = None


# @router.post("/aggregate")
# def aggregate_data(req: AggregateRequest):
#     if req.file_id:
#         df = load_df(req.file_id)
#     elif req.data is not None:
#         df = pd.DataFrame(req.data)
#     else:
#         raise HTTPException(status_code=400, detail="Provide either 'file_id' or 'data'")

#     for col in df.columns:
#         try:
#             df[col] = pd.to_numeric(df[col])
#         except (ValueError, TypeError):
#             pass

#     if req.group_by not in df.columns:
#         raise HTTPException(status_code=400, detail=f"Column '{req.group_by}' not found")
#     if req.value_col not in df.columns:
#         raise HTTPException(status_code=400, detail=f"Column '{req.value_col}' not found")

#     if req.bin_size and pd.api.types.is_numeric_dtype(df[req.group_by]):
#         col_min = df[req.group_by].min()
#         col_max = df[req.group_by].max()
#         bins = np.arange(col_min, col_max + req.bin_size, req.bin_size)
#         labels = [f"{bins[i]:.4g}-{bins[i+1]:.4g}" for i in range(len(bins) - 1)]
#         df["_group"] = pd.cut(
#             df[req.group_by], bins=bins, labels=labels, right=False, include_lowest=True
#         ).astype(str)
#         group_col = "_group"
#     else:
#         group_col = req.group_by

#     agg_map = {
#         "mean":   lambda g: g.mean(),
#         "sum":    lambda g: g.sum(),
#         "count":  lambda g: g.count(),
#         "median": lambda g: g.median(),
#         "min":    lambda g: g.min(),
#         "max":    lambda g: g.max(),
#     }

#     if req.aggregation not in agg_map:
#         raise HTTPException(status_code=400, detail=f"Unknown aggregation '{req.aggregation}'")

#     grouped = df.groupby(group_col, dropna=True)[req.value_col]
#     result = agg_map[req.aggregation](grouped).reset_index()
#     result.columns = ["x", "y"]
#     result["y"] = result["y"].round(2)

#     return {
#         "data":        result.to_dict(orient="records"),
#         "group_by":    req.group_by,
#         "value_col":   req.value_col,
#         "aggregation": req.aggregation,
#         "bin_size":    req.bin_size,
#     }


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


class AggregateMultiRequest(BaseModel):
    file_id:      Optional[str]        = None
    data:         Optional[list[dict]] = None
    group_by:     str
    aggregations: dict[str, str]


@router.post("/aggregate_multi")
def aggregate_multi(req: AggregateMultiRequest):
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

    if req.group_by not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{req.group_by}' not found")

    agg_map = {"mean": "mean", "sum": "sum", "count": "count",
               "median": "median", "min": "min", "max": "max"}

    agg_spec = {}
    for col, agg in req.aggregations.items():
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

    return {
        "data":         result.to_dict(orient="records"),
        "group_by":     req.group_by,
        "aggregations": req.aggregations,
    }


class SplitCoordinatesRequest(BaseModel):
    file_id: str
    columns: list[str]


@router.post("/split_coordinates")
def split_coordinates(req: SplitCoordinatesRequest):
    df = load_df(req.file_id)

    print("ACTUAL COLUMNS:", df.columns.tolist())
    print("REQUESTED:", req.columns)

    for col in req.columns:
        if col not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"Column '{col}' not found"
            )

    def parse_coord(val):
        try:
            cleaned = str(val).strip().strip("()[] ")
            parts = [float(p.strip()) for p in cleaned.split(",")]
            return parts
        except Exception:
            return []

    for col in req.columns:
        parsed = df[col].apply(parse_coord)
        max_dims = parsed.apply(len).max()
        axis_names = ["x", "y", "z", "w", "v", "u"]

        for i in range(max_dims):
            axis = axis_names[i] if i < len(axis_names) else f"dim{i+1}"
            new_col = f"{col}_{axis}"
            df[new_col] = parsed.apply(lambda p, i=i: p[i] if i < len(p) else None)

        df = df.drop(columns=[col])

    from routers.uploads import save_df, load_meta

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