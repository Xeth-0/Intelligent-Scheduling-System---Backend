from pydantic import BaseModel, Field, EmailStr


class Teacher(BaseModel):
    """
    Represents a teacher in the scheduling system.
    
    Contains personal information and accessibility requirements.
    """
    teacherId: str = Field(..., description="Unique identifier for the teacher")
    name: str = Field(..., description="Full name of the teacher")
    email: EmailStr = Field(..., description="Email address of the teacher")
    phone: str = Field(..., description="Phone number of the teacher")
    department: str = Field(..., description="Department the teacher belongs to")
    needsWheelchairAccessibleRoom: bool = Field(
        default=False, 
        description="Whether the teacher requires wheelchair accessible rooms"
    ) 