from pydantic import BaseModel, Field


class Classroom(BaseModel):
    """
    Represents a classroom/room where classes can be held.
    
    Contains information about capacity, type, accessibility, and location.
    """
    classroomId: str = Field(..., description="Unique identifier for the classroom")
    name: str = Field(..., description="Name or number of the classroom")
    capacity: int = Field(..., description="Maximum number of students the room can accommodate", gt=0)
    type: str = Field(..., description="Type of classroom (e.g., 'lecture', 'lab', 'seminar')")
    buildingId: str = Field(..., description="Identifier of the building containing this classroom")
    floor: int = Field(..., description="Floor number where the classroom is located")
    isWheelchairAccessible: bool = Field(..., description="Whether the classroom is wheelchair accessible") 