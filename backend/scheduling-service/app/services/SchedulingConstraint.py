from enum import Enum
from typing import Dict, Any, List


class SchedulingConstraintType(Enum):
    HARD = "hard"
    SOFT = "soft"


class SchedulingConstraintScope(Enum):
    COURSE = "course"
    TEACHER = "teacher"
    STUDENT_GROUP = "student_group"
    ROOM = "room"
    TIMESLOT = "timeslot"
    DAY = "day"
    SESSION_TYPE = "session_type"


class SchedulingConstraintCategory(Enum):
    # Hard constraints - These are automatically detected and enforced
    TEACHER_CONFLICT = "teacher_conflict"
    STUDENT_GROUP_CONFLICT = "student_group_conflict"
    ROOM_CONFLICT = "room_conflict"
    TEACHER_WHEELCHAIR_ACCESS = "teacher_wheelchair_access"
    STUDENT_GROUP_WHEELCHAIR_ACCESS = "student_group_wheelchair_access"
    MISSING_DATA = "missing_data"
    INVALID_SCHEDULING = "invalid_scheduling"
    ROOM_TYPE_MISMATCH = "room_type_mismatch"
    UNASSIGNED_ROOM = "unassigned_room"

    # Soft constraints - These come from user preferences and campus policies
    ROOM_CAPACITY_OVERFLOW = "room_capacity_overflow"
    TEACHER_SCHEDULE_COMPACTNESS = "teacher_schedule_compactness"
    TEACHER_TIME_PREFERENCE = "teacher_time_preference"
    TEACHER_ROOM_PREFERENCE = "teacher_room_preference"
    TEACHER_CONSECUTIVE_MOVEMENT = "teacher_consecutive_movement"
    ECTS_PRIORITY_VIOLATION = "ects_priority_violation"

    @property
    def constraint_type(self) -> SchedulingConstraintType:
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

        return (
            SchedulingConstraintType.HARD
            if self in hard_constraints
            else SchedulingConstraintType.SOFT
        )

    @property
    def is_hard_constraint(self) -> bool:
        """Returns True if the constraint category is a hard constraint."""
        return self.constraint_type == SchedulingConstraintType.HARD

    @classmethod
    def get_hard_constraints(cls):
        """Returns all hard constraint categories."""
        return [
            constraint
            for constraint in cls
            if constraint.constraint_type == SchedulingConstraintType.HARD
        ]

    @classmethod
    def get_soft_constraints(cls):
        """Returns all soft constraint categories."""
        return [
            constraint
            for constraint in cls
            if constraint.constraint_type == SchedulingConstraintType.SOFT
        ]


class ConstraintTypeMapper:
    """Maps TypeScript constraint type names to Python constraint categories."""

    # Map TypeScript constraint names (from frontend) to Python categories
    TYPESCRIPT_TO_PYTHON_MAPPING = {
        "Teacher Time Preference": SchedulingConstraintCategory.TEACHER_TIME_PREFERENCE,
        "Teacher Room Preference": SchedulingConstraintCategory.TEACHER_ROOM_PREFERENCE,
        "Teacher Schedule Compactness": SchedulingConstraintCategory.TEACHER_SCHEDULE_COMPACTNESS,
        "ECTS Course Priority": SchedulingConstraintCategory.ECTS_PRIORITY_VIOLATION,
        "Minimize Consecutive Room Movement": SchedulingConstraintCategory.TEACHER_CONSECUTIVE_MOVEMENT,
        "Efficient Room Utilization": SchedulingConstraintCategory.ROOM_CAPACITY_OVERFLOW,
    }

    @classmethod
    def map_constraint_type(cls, typescript_name: str) -> SchedulingConstraintCategory:
        """Map TypeScript constraint name to Python category."""
        category = cls.TYPESCRIPT_TO_PYTHON_MAPPING.get(typescript_name)
        if not category:
            raise ValueError(f"Unknown constraint type: {typescript_name}")
        return category

    @classmethod
    def get_supported_types(cls) -> List[str]:
        """Get list of supported TypeScript constraint type names."""
        return list(cls.TYPESCRIPT_TO_PYTHON_MAPPING.keys())


class ConstraintValidator:
    """Validates constraint values based on their category."""

    @classmethod
    def validate_constraint_value(
        cls, category: SchedulingConstraintCategory, value: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate constraint value based on category."""

        if category == SchedulingConstraintCategory.TEACHER_TIME_PREFERENCE:
            return cls._validate_time_preference(value)
        elif category == SchedulingConstraintCategory.TEACHER_ROOM_PREFERENCE:
            return cls._validate_room_preference(value)
        elif category == SchedulingConstraintCategory.TEACHER_SCHEDULE_COMPACTNESS:
            return cls._validate_schedule_compactness(value)

        # For categories without specific validation, return as-is
        return value

    @classmethod
    def _validate_time_preference(cls, value: Dict[str, Any]) -> Dict[str, Any]:
        """Validate time preference constraint value."""
        required_fields = ["preference", "days", "timeslotCodes"]
        for field in required_fields:
            if field not in value:
                raise ValueError(
                    f"Time preference constraint missing required field: {field}"
                )

        if value["preference"] not in ["PREFER", "AVOID", "NEUTRAL"]:
            raise ValueError("Time preference must be PREFER, AVOID, or NEUTRAL")

        if not isinstance(value["days"], list) or len(value["days"]) == 0:
            raise ValueError("Time preference must include at least one day")

        if (
            not isinstance(value["timeslotCodes"], list)
            or len(value["timeslotCodes"]) == 0
        ):
            raise ValueError("Time preference must include at least one timeslot")

        return value

    @classmethod
    def _validate_room_preference(cls, value: Dict[str, Any]) -> Dict[str, Any]:
        """Validate room preference constraint value."""
        if "preference" not in value:
            raise ValueError(
                "Room preference constraint missing required field: preference"
            )

        if value["preference"] not in ["PREFER", "AVOID"]:
            raise ValueError("Room preference must be PREFER or AVOID")

        # Must have either roomIds or buildingIds
        if not value.get("roomIds") and not value.get("buildingIds"):
            raise ValueError(
                "Room preference must specify either roomIds or buildingIds"
            )

        return value

    @classmethod
    def _validate_schedule_compactness(cls, value: Dict[str, Any]) -> Dict[str, Any]:
        """Validate schedule compactness constraint value."""
        required_fields = [
            "enabled",
            "maxGapsPerDay",
            "maxActiveDays",
            "maxConsecutiveSessions",
        ]
        for field in required_fields:
            if field not in value:
                raise ValueError(
                    f"Schedule compactness constraint missing required field: {field}"
                )

        if not isinstance(value["enabled"], bool):
            raise ValueError("Schedule compactness 'enabled' must be boolean")

        for field in ["maxGapsPerDay", "maxActiveDays", "maxConsecutiveSessions"]:
            if not isinstance(value[field], int) or value[field] < 0:
                raise ValueError(
                    f"Schedule compactness '{field}' must be non-negative integer"
                )

        return value
