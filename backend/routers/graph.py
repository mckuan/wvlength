# graph.py
from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel
import pandas as pd

from routers.uploads import load_df

router = APIRouter(prefix="/graph", tags=["graph"])


class AggregateMultiRequest(BaseModel):
    file_id:      Optional[str]        = None
    data:         Optional[list[dict]] = None
    group_by:     str
    aggregations: dict[str, str]


@router.post("/aggregate_multi")
def aggregate_multi(req: AggregateMultiRequest):
    if req.file_id:
        df = load_df(req.file_id)          # read-only, no _ensure_working_copy needed
    elif req.data is not None:
        df = pd.DataFrame(req.data)
    else:
        raise HTTPException(status_code=400, detail="Provide either 'file_id' or 'data'")

    # ... same numeric coercion + agg_spec logic as transform.py's aggregate_multi ...

    result = df.groupby(df[req.group_by], dropna=True).agg(agg_spec).reset_index()
    # NOTE: no save_df call here — this endpoint never mutates storage
    return {"data": result.to_dict(orient="records"), "group_by": req.group_by, "aggregations": req.aggregations}


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
 