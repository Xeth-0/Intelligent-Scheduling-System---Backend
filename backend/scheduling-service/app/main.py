import sentry_sdk
from fastapi import FastAPI

from app.core.config import settings
from app.api.endpoints import healthcheck
from app.api.endpoints import scheduling

try:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        send_default_pii=True,
        enable_tracing=True,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
        profile_lifecycle="trace",
    )
except Exception as e:
    print("Sentry SDK initialization failed:", e)
    print("Proceeding without SENTRY...")

app = FastAPI(title="Scheduling Service", description="A service for scheduling events")

app.include_router(healthcheck.router, prefix="/api", tags=["healthcheck"])
app.include_router(scheduling.router, prefix="/api", tags=["scheduler"])
