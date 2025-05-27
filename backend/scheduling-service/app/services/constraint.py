from enum import Enum

class ConstraintType(Enum):
    HARD = "hard"
    SOFT = "soft"


class ConstraintCategory(Enum):
    # Hard constraints
    TEACHER_CONFLICT = "teacher_conflict"
    STUDENT_GROUP_CONFLICT = "student_group_conflict"
    ROOM_CONFLICT = "room_conflict"
    TEACHER_WHEELCHAIR_ACCESS = "teacher_wheelchair_access"
    STUDENT_GROUP_WHEELCHAIR_ACCESS = "student_group_wheelchair_access"
    ROOM_TYPE_MISMATCH = "room_type_mismatch"
    MISSING_DATA = "missing_data"
    INVALID_SCHEDULING = "invalid_scheduling"

    # Soft constraints
    ROOM_CAPACITY_OVERFLOW = "room_capacity_overflow"
    # Future soft constraints can be added here
    # TEACHER_PREFERENCE_VIOLATION = "teacher_preference_violation"
    # ROOM_PREFERENCE_VIOLATION = "room_preference_violation"
    # SCHEDULING_EFFICIENCY = "scheduling_efficiency"

