from fastapi import APIRouter, HTTPException
from app.services.scheduling import GeneticScheduler
from app.models.models import Course, Teacher, Classroom, StudentGroup
from app.services.sampleData import SampleData

router = APIRouter(prefix="/scheduler")


@router.get("/")
async def schedule():
    """
    Schedule a task to be executed at a specific time.

    Returns:
        dict: A dictionary containing the scheduled task details.

    ! This endpoint is not yet implemented. Right now, it'll return a schedule generated from dummy data.
    """
    # ! Dummy data
    print("Generating sample data...")
    sampleData = SampleData()
    timeslots = ["08:00-09:30", "09:40-11:10", "11:20-12:50", "13:30-15:00", "15:10-16:40"]
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]


    scheduler = GeneticScheduler(
        courses=sampleData.courses,
        teachers=sampleData.teachers,
        rooms=sampleData.rooms,
        student_groups=sampleData.student_groups,
        timeslots=timeslots,
        days=days,
        population_size=100,
    )

    print("Running scheduler...")
    best_schedule, best_fitness = scheduler.run()
    print("Scheduler finished running.")
    print("best_schedule: ", best_schedule)
    print("best_fitness: ", best_fitness)

    return {
        "status": "success",
        "message": "Scheduler finished running.",
        "data": {
            "best_schedule": best_schedule,
            "best_fitness": best_fitness,
        },
    }