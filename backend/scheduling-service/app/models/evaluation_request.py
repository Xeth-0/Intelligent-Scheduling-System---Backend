from pydantic import BaseModel
from typing import List
from .teacher import Teacher
from .classroom import Classroom
from .course import Course
from .student_group import StudentGroup
from .timeslot import Timeslot
from .constraint import Constraint
from .scheduled_item import ScheduledItem


class ScheduleEvaluationRequest(BaseModel):
    """
    Request model for evaluating an existing schedule.
    
    Contains all necessary data to perform a fitness evaluation
    including the schedule items and supporting data.
    """
    schedule: List[ScheduledItem]
    teachers: List[Teacher]
    rooms: List[Classroom]
    studentGroups: List[StudentGroup]
    courses: List[Course]
    timeslots: List[Timeslot]
    constraints: List[Constraint] 