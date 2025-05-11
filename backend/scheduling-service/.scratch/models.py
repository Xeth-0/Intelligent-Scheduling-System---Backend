from pydantic import BaseModel

# Defining the core models to run the GA scheduling algorithm
# ! These are not the final models. They will not be used for the API, only for the algorithm during the development phase.


class Campus(BaseModel):  # useless for now
    campusId: str
    name: str
    location: str


class Classroom(BaseModel):
    classroomId: str
    name: str
    capacity: int
    type: str
    buildingId: str
    floor: int
    isWheelchairAccessible: bool


class Course(BaseModel):
    courseId: str
    name: str
    description: str
    ectsCredits: int
    department: str
    teacherId: str  # Teacher is assigned, we're trying to schedule the course
    sessionTypes: list[str]
    sessionsPerWeek: list[int]


class Teacher(BaseModel):
    teacherId: str
    name: str
    email: str
    phone: str
    department: str
    needsWheelchairAccessibleRoom: bool


class ScheduledItem(BaseModel):
    # Course information
    courseId: str
    courseName: str
    sessionType: str

    # Assigned groups
    teacherId: str
    studentGroupId: str

    # Classroom information
    classroomId: str
    timeslot: str
    day: str  # !

    # Validation flags
    is_valid_hard: bool = True
    is_valid_soft: bool = True


class StudentGroup(BaseModel):
    studentGroupId: str
    name: str
    size: int
    department: str
    accessibilityRequirement: bool  # blanket requirement for all reqs # ! for now
