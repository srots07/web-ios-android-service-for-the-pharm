from fastapi import FastAPI

app = FastAPI(title="Notification Service", version="1.0.0")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "notification-service"}

