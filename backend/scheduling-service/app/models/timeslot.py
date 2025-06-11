from pydantic import BaseModel, Field


class Timeslot(BaseModel):
    """
    Represents a time slot in the scheduling system.
    
    A timeslot defines a specific time period during which classes can be scheduled.
    """
    timeslotId: str = Field(..., description="Unique identifier for the timeslot")
    code: str = Field(..., description="Short code for the timeslot (e.g., 'T1', 'T2')")
    label: str = Field(..., description="Human-readable label for the timeslot")
    startTime: str = Field(..., description="Start time in HH:MM format")
    endTime: str = Field(..., description="End time in HH:MM format")
    order: int = Field(..., description="Order of the timeslot in the day", ge=0) 