from fastapi import FastAPI

app = FastAPI(title="File Service", version="1.0.0")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "file-service"}

