from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel
import numpy as np
import pandas as pd
import os
import json

from routers.uploads import load_df

router = APIRouter(prefix="/transforms", tags=["transforms"])


class AggregateRequest(BaseModel):
    file_id:     Optional[str]        = None
    data:        Optional[list[dict]] = None
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

    for col in df.columns:
        try:
            df[col] = pd.to_numeric(df[col])
        except (ValueError, TypeError):
            pass

    if req.group_by not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{req.group_by}' not found")
    if req.aggregation != "count" and req.value_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{req.value_col}' not found")

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

    grouped = df.groupby(group_col, dropna=True)[req.value_col]
    result = agg_map[req.aggregation](grouped).reset_index()
    result.columns = ["x", "y"]
    result["y"] = result["y"].round(2)

    return {
        "data":        result.to_dict(orient="records"),
        "group_by":    req.group_by,
        "value_col":   req.value_col,
        "aggregation": req.aggregation,
        "bin_size":    req.bin_size,
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