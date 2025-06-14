"""
Models package for the scheduling service.

This package contains all the Pydantic models used throughout the scheduling system.
Each model is defined in its own file for better organization and maintainability.
"""

from .timeslot import Timeslot
from .classroom import Classroom
from .course import Course
from .teacher import Teacher
from .student_group import StudentGroup
from .scheduled_item import ScheduledItem
from .constraint import Constraint
from .schedule_request import ScheduleApiRequest
from .evaluation_request import ScheduleEvaluationRequest

__all__ = [
    "Timeslot",
    "Classroom", 
    "Course",
    "Teacher",
    "StudentGroup",
    "ScheduledItem",
    "Constraint",
    "ScheduleApiRequest",
    "ScheduleEvaluationRequest",
]
