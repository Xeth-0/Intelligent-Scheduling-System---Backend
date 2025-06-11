import time
import asyncio
import logging
from fastapi import APIRouter
from app.services.GeneticScheduler import GeneticScheduler
from app.services.SchedulingConstraintRegistry import SchedulingConstraintRegistry
from app.models import ScheduleApiRequest

router = APIRouter(prefix="/scheduler")


@router.post("/", status_code=201)
async def generate_schedule(request: ScheduleApiRequest):
    logging.info(f"Received Schedule Request with {len(request.constraints)} constraints")

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

    logging.info("Initializing scheduler...")
    scheduler = GeneticScheduler(
        courses=request.courses,
        teachers=request.teachers,
        rooms=request.rooms,
        student_groups=request.studentGroups,
        constraints=request.constraints,
        timeslots=request.timeslots,
        days=days,
        population_size=100,
    )

    logging.info("Running scheduler...")
    start_time = time.time()
    loop = asyncio.get_running_loop()
    best_schedule, best_fitness, report = await loop.run_in_executor(None, scheduler.run)
    end_time = time.time()
    logging.info(f"Scheduler finished running in {end_time - start_time} seconds")
    if report:
        report.print_detailed_report()

    logging.info("Scheduler finished running.")
    return {
        "status": "success",
        "message": "Schedule generated successfully.",
        "data": {
            "best_schedule": best_schedule,
            "best_fitness": best_fitness,
            "report": report,
            "time_taken": end_time - start_time,
        },
    }
