from pydantic import BaseModel


# class Campus(BaseModel):  # useless for now
#     campusId: str
#     name: str
#     location: str


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
    teacherId: str  # Teacher is already assigned, we're trying to schedule the course
    sessionType: str
    sessionsPerWeek: int
    studentGroupIds: list[str]

    # More than one student group can be assigned to the course.
    # The list is a list of student groups for each session type. The student groups in that list take that course together.

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


class ScheduleApiRequest(BaseModel):
    courses: list[Course]
    teachers: list[Teacher]
    studentGroups: list[StudentGroup]
    rooms: list[Classroom]

class ExamplePayload(BaseModel):
    something: list[int]