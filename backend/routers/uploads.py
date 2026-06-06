from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd
import io

router = APIRouter(prefix="/upload", tags=["upload"])

@router.post("/")
async def upload_csv(file: UploadFile = File(...)):
    
    # 1. Validate it's a CSV
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")
    
    # 2. Read the raw bytes into pandas
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))
    
    # 3. Detect columns + their types
    columns = []
    for col in df.columns:
        columns.append({
            "name": col,
            "type": str(df[col].dtype)  # int64, float64, object (string), etc.
        })
    
    # 4. Build a preview (first 10 rows)
    # fillna prevents NaN from breaking JSON serialization
    preview = df.head(10).fillna("").to_dict(orient="records")
    
    # 5. Return everything
    return {
        "filename": file.filename,
        "rows": len(df),
        "columns": columns,
        "preview": preview
    }