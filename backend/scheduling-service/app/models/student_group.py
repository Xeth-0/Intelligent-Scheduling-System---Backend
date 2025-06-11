from pydantic import BaseModel, Field


class StudentGroup(BaseModel):
    """
    Represents a student group in the scheduling system.
    
    A student group is the lowest level of grouping (e.g., section, year group).
    All students in a group attend classes together.
    """
    studentGroupId: str = Field(..., description="Unique identifier for the student group")
    name: str = Field(..., description="Name of the student group")
    size: int = Field(..., description="Number of students in the group", gt=0)
    department: str = Field(..., description="Department the student group belongs to")
    accessibilityRequirement: bool = Field(
        default=False,
        description="Whether the group has accessibility requirements (wheelchair access, etc.)"
    ) 