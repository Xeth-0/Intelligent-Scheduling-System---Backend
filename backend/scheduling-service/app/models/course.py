from pydantic import BaseModel, Field
from typing import List


class Course(BaseModel):
    """
    Represents a course that needs to be scheduled.
    
    A course has an assigned teacher and can have multiple student groups.
    The scheduling system needs to find appropriate timeslots and rooms for the course.
    """
    courseId: str = Field(..., description="Unique identifier for the course")
    name: str = Field(..., description="Name of the course")
    description: str = Field(..., description="Detailed description of the course")
    ectsCredits: int = Field(..., description="ECTS credits for the course", ge=0)
    department: str = Field(..., description="Department offering the course")
    teacherId: str = Field(..., description="ID of the assigned teacher")
    sessionType: str = Field(..., description="Type of session (e.g., 'lecture', 'lab', 'seminar')")
    sessionsPerWeek: int = Field(..., description="Number of sessions per week", gt=0)
    studentGroupIds: List[str] = Field(..., description="List of student group IDs assigned to this course") 