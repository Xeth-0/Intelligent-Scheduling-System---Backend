import os
from fastapi import FastAPI
from app.api.endpoints import healthcheck
from app.api.endpoints import scheduling
import sentry_sdk

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    send_default_pii=True,
    enable_tracing=True,
    traces_sample_rate=1.0,
    profiles_sample_rate=1.0,
    profile_lifecycle="trace",
)

app = FastAPI(title="Scheduling Service", description="A service for scheduling events")

app.include_router(healthcheck.router, prefix="/api", tags=["healthcheck"])
app.include_router(scheduling.router, prefix="/api", tags=["scheduler"])
