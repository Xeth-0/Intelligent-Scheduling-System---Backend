from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/healthcheck")
async def healthcheck():
    return {"status": "success", "message": "ok"}
