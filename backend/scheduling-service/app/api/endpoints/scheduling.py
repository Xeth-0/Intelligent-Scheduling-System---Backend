import time
from fastapi import APIRouter
from app.services.GeneticScheduler import GeneticScheduler
from app.models.models import ScheduleApiRequest

router = APIRouter(prefix="/scheduler")


@router.post("/", status_code=201)
async def generate_schedule(request: ScheduleApiRequest):
    print(f"Received Schedule Request:\n{request.model_dump_json(indent=2)}")

    timeslots = request.timeslots
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

    constraints = request.constraints
    # print("Constraints: ", constraints)

    print("Initializing scheduler...")
    scheduler = GeneticScheduler(
        courses=request.courses,
        teachers=request.teachers,
        rooms=request.rooms,
        student_groups=request.studentGroups,
        timeslots=timeslots,
        days=days,
        population_size=100,
        constraints=constraints,
    )

    print("Running scheduler...")
    start_time = time.time()
    best_schedule, best_fitness, report = scheduler.run()
    end_time = time.time()
    print(f"Scheduler finished running in {end_time - start_time} seconds")
    if report:
        report.print_detailed_report()

    print("Scheduler finished running.")
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
