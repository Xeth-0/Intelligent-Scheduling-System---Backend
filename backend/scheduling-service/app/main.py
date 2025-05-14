from fastapi import FastAPI
from app.api.endpoints import healthcheck
from app.api.endpoints import scheduling

app = FastAPI(title="Scheduling Service", description="A service for scheduling events")

app.include_router(healthcheck.router, prefix="/api", tags=["healthcheck"])
app.include_router(scheduling.router, prefix="/api", tags=["scheduler"])