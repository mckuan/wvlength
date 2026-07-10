# graph.py
from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel
import pandas as pd

from routers.uploads import load_df

router = APIRouter(prefix="/graph", tags=["graph"])


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

NUMERIC_AGGS = {
    "mean": "mean", "sum": "sum", "count": "count",
    "median": "median", "min": "min", "max": "max",
}


class AggregateMultiRequest(BaseModel):
    file_id:      Optional[str]        = None
    data:         Optional[list[dict]] = None
    group_by:     str
    aggregations: dict[str, str]
    bin_size:     Optional[float]      = None


@router.post("/aggregate_multi")
def aggregate_multi(req: AggregateMultiRequest):
    # read-only: chart rendering must never mutate stored data
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

    agg_spec = {}
    for col, agg in req.aggregations.items():
        if col == req.group_by:
            continue
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Column '{col}' not found")
        if agg in STRING_AGGS:
            agg_spec[col] = STRING_AGGS[agg]
        elif agg in NUMERIC_AGGS:
            if not pd.api.types.is_numeric_dtype(df[col]):
                raise HTTPException(status_code=400, detail=f"Column '{col}' is not numeric")
            agg_spec[col] = NUMERIC_AGGS[agg]
        else:
            raise HTTPException(status_code=400, detail=f"Unknown aggregation '{agg}'")

    group_key = df[req.group_by]
    if req.bin_size and pd.api.types.is_numeric_dtype(group_key):
        group_key = (group_key // req.bin_size) * req.bin_size

    df["_group"] = group_key
    result = df.groupby("_group", dropna=True).agg(agg_spec).reset_index()
    result = result.rename(columns={"_group": req.group_by})

    numeric_cols = result.select_dtypes(include="number").columns
    for col in numeric_cols:
        result[col] = result[col].round(2)

    # NOTE: no save_df here — this endpoint is read-only by design.
    # persisting a collapsed/grouped result as the working copy would corrupt
    # the dataset the next time it's loaded for another chart or transform.

    return {
        "data":         result.to_dict(orient="records"),
        "group_by":     req.group_by,
        "aggregations": req.aggregations,
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