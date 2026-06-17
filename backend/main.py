from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import uploads

app = FastAPI(title="WVLENGTH API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # your Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(uploads.router)  

@app.get("/")
def root():
    return {"status": "WVLENGTH API running"}