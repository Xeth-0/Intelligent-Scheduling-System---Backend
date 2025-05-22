from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/healthcheck")
async def healthcheck():
    return {"status": "success", "message": "ok"}


@router.get("/healthcheck/sentry-debug")
async def sentry_debug():
    division_by_zero = 1 / 0
    return {"status": "success", "message": "ok"}
