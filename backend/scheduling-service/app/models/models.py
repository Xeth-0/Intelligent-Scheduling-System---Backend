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

    
    # More than one student group can be assigned to the course.
    # The list is a list of student groups for each session type. Each list item in the list is a list of student group ids that take the course together 
    # (at the same time and place).
    # This is to account for the fact that some courses are taken by multiple student groups at the same time.
    # For example, a course that is taught to year 1 and year 2 students, and year 3 students but at a different time will have:
    #   studentGroupIds = [[SG_Y1, SG_Y2], [SG_Y3]]
    studentGroupIds: list[list[str]]


class Teacher(BaseModel):
    teacherId: str
    name: str
    email: str
    phone: str
    department: str
    needsWheelchairAccessibleRoom: bool = False


class ScheduledItem(BaseModel):
    # Course information
    courseId: str
    courseName: str
    sessionType: str

    # Assigned groups
    teacherId: str
    studentGroupIds: list[str]

    # Classroom information
    classroomId: str
    timeslot: str
    day: str

    # ! Should add more detailed validation flags for each constraint.
    # Validation flags
    is_valid_hard: bool = True
    is_valid_soft: bool = True


class StudentGroup(BaseModel):
    # Represents a student group. this can be a section, a year group, etc.
    # ! We are assuming a student group is the lowest level of grouping.
    # ! We are not considering sub-groups of a student group.
    studentGroupId: str
    name: str
    size: int
    department: str
    accessibilityRequirement: bool  # blanket requirement for all reqs # ! for now
