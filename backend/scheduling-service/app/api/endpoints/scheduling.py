import time
import asyncio
import logging
from fastapi import APIRouter
from app.services.GeneticScheduler import GeneticScheduler
from app.services.AdaptiveGeneticScheduler import AdaptiveGeneticScheduler
from app.services.SchedulingConstraintRegistry import SchedulingConstraintRegistry
from app.services.Fitness import ScheduleFitnessEvaluator
from app.models import ScheduleApiRequest, ScheduledItem
from typing import List, Dict, Any

router = APIRouter(prefix="/scheduler")


@router.post("/", status_code=201)
async def generate_schedule(request: ScheduleApiRequest):
    logging.info(f"Received Schedule Request with {len(request.constraints)} constraints")

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

    logging.info("Initializing scheduler...")
    # scheduler = GeneticScheduler(
    #     courses=request.courses,
    #     teachers=request.teachers,
    #     rooms=request.rooms,
    #     student_groups=request.studentGroups,
    #     constraints=request.constraints,
    #     timeslots=request.timeslots,
    #     days=days,
    #     population_size=100,
    # )
    scheduler = AdaptiveGeneticScheduler(
        courses=request.courses,
        teachers=request.teachers,
        rooms=request.rooms,
        student_groups=request.studentGroups,
        constraints=request.constraints,
        timeslots=request.timeslots,
        days=days,
        enable_adaptive_optimization=True,
        penalty_optimization_interval=50,
        max_restarts=3,
    )

    logging.info("Running scheduler...")
    start_time = time.time()
    loop = asyncio.get_running_loop()
    best_schedule, best_fitness, report, metrics = await loop.run_in_executor(
        None, scheduler.run_adaptive
    )
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


@router.post("/evaluate", status_code=200)
async def evaluate_schedule(request: Dict[str, Any]):
    """
    Evaluate an existing schedule and return detailed fitness report.
    """
    logging.info(
        f"Received evaluation request for schedule with {len(request.get('schedule', []))} sessions"
    )

    try:
        # Extract data from request
        schedule_data = request.get("schedule", [])
        teachers = request.get("teachers", [])
        rooms = request.get("rooms", [])
        student_groups = request.get("studentGroups", [])
        courses = request.get("courses", [])
        constraints = request.get("constraints", [])
        timeslots = request.get("timeslots", [])

        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

        # Convert schedule data to ScheduledItem objects
        scheduled_items = []
        for item in schedule_data:
            scheduled_item = ScheduledItem(
                courseId=item["courseId"],
                courseName=item["courseName"],
                teacherId=item["teacherId"],
                classroomId=item["classroomId"],
                studentGroupIds=item["studentGroupIds"],
                day=item["day"],
                timeslot=item["timeslot"],
                sessionType=item.get("sessionType", "LECTURE"),
            )
            scheduled_items.append(scheduled_item)

        # Set up constraint registry
        constraint_registry = SchedulingConstraintRegistry(constraints)

        # Create fitness evaluator
        evaluator = ScheduleFitnessEvaluator(
            teachers=teachers,
            rooms=rooms,
            student_groups=student_groups,
            courses=courses,
            timeslots=timeslots,
            days=days,
            constraint_registry=constraint_registry,
        )

        # Evaluate the schedule
        start_time = time.time()
        fitness_report = evaluator.evaluate(scheduled_items)
        end_time = time.time()

        # Format violations as simple strings for frontend
        violation_descriptions = []
        for violation in fitness_report.violations:
            violation_descriptions.append(violation.description)

        # Create summary by category
        category_summaries = {}
        for category, violations in fitness_report.violation_summary.items():
            if violations:
                category_summaries[category.value] = {
                    "count": len(violations),
                    "total_penalty": fitness_report.soft_constraint_scores.get(category, 0)
                    or fitness_report.hard_constraint_scores.get(category, 0),
                    "violations": [
                        v.description for v in violations[:5]
                    ],  # Limit to 5 per category
                }

        return {
            "status": "success",
            "message": "Schedule evaluated successfully.",
            "data": {
                "summary": {
                    "is_feasible": fitness_report.is_feasible,
                    "total_hard_violations": fitness_report.total_hard_violations,
                    "total_soft_penalty": fitness_report.total_soft_penalty,
                    "total_violations": len(fitness_report.violations),
                    "evaluation_time": end_time - start_time,
                },
                "violations": violation_descriptions,
                "categories": category_summaries,
                "fitness_vector": fitness_report.fitness_vector,
            },
        }

    except Exception as e:
        logging.error(f"Error evaluating schedule: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to evaluate schedule: {str(e)}",
            "data": None,
        }
