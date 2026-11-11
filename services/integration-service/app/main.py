from fastapi import FastAPI

app = FastAPI(title="Integration Service", version="1.0.0")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "integration-service"}

