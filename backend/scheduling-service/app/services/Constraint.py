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
    MISSING_DATA = "missing_data"
    INVALID_SCHEDULING = "invalid_scheduling"
    ROOM_TYPE_MISMATCH = "room_type_mismatch"
    UNASSIGNED_ROOM = "unassigned_room"

    # Soft constraints
    ROOM_CAPACITY_OVERFLOW = "room_capacity_overflow"
    # SCHEDULING_EFFICIENCY = "scheduling_efficiency" # resource utilization for timeslots
    TEACHER_SCHEDULE_COMPACTNESS = "teacher_schedule_compactness"
    TEACHER_TIME_PREFERENCE = "teacher_time_preference"
    TEACHER_ROOM_PREFERENCE = "teacher_room_preference"
    TEACHER_CONSECUTIVE_MOVEMENT = "teacher_consecutive_movement"
    STUDENT_CONSECUTIVE_MOVEMENT = "student_consecutive_movement"
    ECTS_PRIORITY_VIOLATION = "ects_priority_violation"

    @property
    def constraint_type(self) -> ConstraintType:
        """Returns the constraint type (HARD or SOFT) for this constraint category."""
        hard_constraints = {
            self.TEACHER_CONFLICT,
            self.STUDENT_GROUP_CONFLICT,
            self.ROOM_CONFLICT,
            self.TEACHER_WHEELCHAIR_ACCESS,
            self.STUDENT_GROUP_WHEELCHAIR_ACCESS,
            self.MISSING_DATA,
            self.INVALID_SCHEDULING,
            self.ROOM_TYPE_MISMATCH,
            self.UNASSIGNED_ROOM,
        }
        
        return ConstraintType.HARD if self in hard_constraints else ConstraintType.SOFT
    
    @property
    def is_hard_constraint(self) -> bool:
        """Returns True if the constraint category is a hard constraint."""
        return self.constraint_type == ConstraintType.HARD

    @classmethod
    def get_hard_constraints(cls):
        """Returns all hard constraint categories."""
        return [constraint for constraint in cls if constraint.constraint_type == ConstraintType.HARD]

    @classmethod
    def get_soft_constraints(cls):
        """Returns all soft constraint categories."""
        return [constraint for constraint in cls if constraint.constraint_type == ConstraintType.SOFT]

