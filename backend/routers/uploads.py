from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import pandas as pd
import io

router = APIRouter(prefix="/upload", tags=["upload"])

@router.post("/")
async def upload_csv(file: UploadFile = File(...)):

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))

    columns = []
    for col in df.columns:
        columns.append({
            "name": col,
            "type": str(df[col].dtype)
        })

    preview = df.head(10).fillna("").to_dict(orient="records")

    return {
        "filename": file.filename,
        "rows": len(df),
        "columns": columns,
        "preview": preview
    }


class AggregateRequest(BaseModel):
    data: list[dict]
    group_by: str
    value_col: str
    aggregation: str

@router.post("/aggregate")
def aggregate_data(req: AggregateRequest):

    df = pd.DataFrame(req.data)

    if req.group_by not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{req.group_by}' not found")
    if req.aggregation != "count" and req.value_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{req.value_col}' not found")

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

    grouped = df.groupby(req.group_by)
    result = agg_map[req.aggregation](grouped).reset_index()
    result.columns = ["x", "y"]
    result["y"] = result["y"].round(2)

    return {
        "data": result.to_dict(orient="records"),
        "group_by": req.group_by,
        "value_col": req.value_col,
        "aggregation": req.aggregation,
    }