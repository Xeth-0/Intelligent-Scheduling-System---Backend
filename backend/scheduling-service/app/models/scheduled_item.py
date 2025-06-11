from pydantic import BaseModel, Field
from typing import List


class ScheduledItem(BaseModel):
    """
    Represents a scheduled class session.
    
    This is the output of the scheduling algorithm - a specific course session
    assigned to a teacher, student groups, classroom, and timeslot.
    """
    # Course information
    courseId: str = Field(..., description="ID of the scheduled course")
    courseName: str = Field(..., description="Name of the scheduled course")
    sessionType: str = Field(..., description="Type of session (lecture, lab, seminar)")

    # Assignment information
    teacherId: str = Field(..., description="ID of the assigned teacher")
    studentGroupIds: List[str] = Field(..., description="IDs of student groups attending this session")

    # Scheduling information
    classroomId: str = Field(..., description="ID of the assigned classroom")
    timeslot: str = Field(..., description="Timeslot identifier")
    day: str = Field(..., description="Day of the week")

    # Validation flags
    is_valid_hard: bool = Field(
        default=True, 
        description="Whether this scheduling satisfies all hard constraints"
    )
    is_valid_soft: bool = Field(
        default=True, 
        description="Whether this scheduling satisfies all soft constraints"
    ) 