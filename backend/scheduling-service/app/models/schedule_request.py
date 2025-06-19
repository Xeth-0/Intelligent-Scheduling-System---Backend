from pydantic import BaseModel, Field
from typing import List, Optional

from .course import Course
from .teacher import Teacher
from .student_group import StudentGroup
from .classroom import Classroom
from .timeslot import Timeslot
from .constraint import Constraint


class ScheduleApiRequest(BaseModel):
    """
    Request model for the scheduling API.
    
    Contains all the necessary data to generate a schedule:
    courses, teachers, student groups, rooms, timeslots, and constraints.
    """
    courses: List[Course] = Field(..., description="List of courses to be scheduled")
    teachers: List[Teacher] = Field(..., description="List of available teachers")
    studentGroups: List[StudentGroup] = Field(..., description="List of student groups")
    rooms: List[Classroom] = Field(..., description="List of available classrooms")
    timeslots: List[Timeslot] = Field(..., description="List of available timeslots")
    constraints: List[Constraint] = Field(..., description="List of scheduling constraints")
    timeLimit: Optional[int] = Field(None, description="Time limit in seconds for schedule generation (max 300)") 