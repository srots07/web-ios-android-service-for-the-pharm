from fastapi import FastAPI

app = FastAPI(title="Report Service", version="1.0.0")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "report-service"}

