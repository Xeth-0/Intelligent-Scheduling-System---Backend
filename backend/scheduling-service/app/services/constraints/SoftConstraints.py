from typing import List, Dict

from .BaseConstraint import (
    StatelessConstraintValidator,
    UserPreferenceConstraintValidator,
    WholeScheduleConstraintValidator,
    ConstraintContext,
)
from app.services.FitnessReport import ConstraintViolation
from app.services.SchedulingConstraint import SchedulingConstraintCategory
from app.models import Constraint, ScheduledItem


class RoomCapacityConstraint(StatelessConstraintValidator):
    """Validates room capacity against student count."""

    def __init__(self, penalty_manager):
        super().__init__(
            SchedulingConstraintCategory.ROOM_CAPACITY_OVERFLOW, penalty_manager
        )

    def validate(self, context: ConstraintContext) -> List[ConstraintViolation]:
        violations = []
        item = context.scheduled_item

        if item is None:
            return violations

        room = context.rooms.get(item.classroomId)

        if not room:
            return violations

        # Calculate total student count
        total_student_count = 0
        for sg_id in item.studentGroupIds:
            student_group = context.student_groups.get(sg_id)
            if student_group:
                total_student_count += student_group.size

        # Check capacity overflow
        if room.capacity < total_student_count:
            overflow = total_student_count - room.capacity
            violations.append(
                self._create_violation(
                    context,
                    f"Room capacity: {room.capacity} - exceeded by {overflow} students (total students: {total_student_count})",
                    violation_count=overflow,
                )
            )

        return violations


class EctsPriorityConstraint(StatelessConstraintValidator):
    """Validates ECTS priority scheduling."""

    def __init__(self, penalty_manager, ects_threshold: float):
        super().__init__(
            SchedulingConstraintCategory.ECTS_PRIORITY_VIOLATION, penalty_manager
        )
        self.ects_threshold = ects_threshold

    def validate(self, context: ConstraintContext) -> List[ConstraintViolation]:
        violations = []
        item = context.scheduled_item

        if item is None:
            return violations

        course = context.courses.get(item.courseId)
        if not course or course.ectsCredits < self.ects_threshold:
            return violations

        # Check if scheduled late in the day
        timeslot_order = context.timeslot_order.get(item.timeslot, 0)
        early_timeslot_threshold = 3

        if timeslot_order > early_timeslot_threshold:
            delay_penalty = (timeslot_order - early_timeslot_threshold) * 0.5
            violations.append(
                self._create_violation(
                    context,
                    f"High-ECTS course {course.name} ({course.ectsCredits} ECTS) scheduled late in the day",
                    severity_factor=delay_penalty,
                )
            )

        return violations


class TeacherTimePreferenceConstraint(UserPreferenceConstraintValidator):
    """Validates teacher time preferences from user constraints."""

    def __init__(self, penalty_manager, constraint: Constraint):
        super().__init__(
            SchedulingConstraintCategory.TEACHER_TIME_PREFERENCE,
            penalty_manager,
            constraint,
        )

    def validate(self, context: ConstraintContext) -> List[ConstraintViolation]:
        violations = []
        item = context.scheduled_item

        if item is None:
            return violations

        teacher = context.teachers.get(item.teacherId)

        if not teacher or item.teacherId != self.constraint.teacherId:
            return violations

        constraint_value = self.constraint.value
        preference = constraint_value.get("preference", "NEUTRAL")
        days = constraint_value.get("days", [])
        timeslot_codes = constraint_value.get("timeslotCodes", [])

        # Check preference violations
        if item.day in days and item.timeslot in timeslot_codes:
            if preference == "AVOID":
                violations.append(
                    self._create_violation(
                        context,
                        f"Teacher {teacher.name} prefers to avoid {item.day} {item.timeslot}",
                        severity_factor=self.constraint.priority / 10.0,
                    )
                )
        elif preference == "PREFER" and timeslot_codes and days:
            # Light penalty for not being in preferred time
            violations.append(
                self._create_violation(
                    context,
                    f"Teacher {teacher.name} prefers different time slots",
                    severity_factor=(self.constraint.priority / 10.0) * 0.5,
                )
            )

        return violations


class TeacherRoomPreferenceConstraint(UserPreferenceConstraintValidator):
    """Validates teacher room preferences from user constraints."""

    def __init__(self, penalty_manager, constraint: Constraint):
        super().__init__(
            SchedulingConstraintCategory.TEACHER_ROOM_PREFERENCE,
            penalty_manager,
            constraint,
        )

    def validate(self, context: ConstraintContext) -> List[ConstraintViolation]:
        violations = []
        item = context.scheduled_item

        if item is None:
            return violations

        teacher = context.teachers.get(item.teacherId)
        room = context.rooms.get(item.classroomId)

        if not teacher or not room or item.teacherId != self.constraint.teacherId:
            return violations

        constraint_value = self.constraint.value
        preference = constraint_value.get("preference", "PREFER")
        room_ids = constraint_value.get("roomIds", [])
        building_ids = constraint_value.get("buildingIds", [])

        if preference == "AVOID":
            if room.classroomId in room_ids or room.buildingId in building_ids:
                violations.append(
                    self._create_violation(
                        context,
                        f"Teacher {teacher.name} prefers to avoid room {room.name}",
                        severity_factor=self.constraint.priority / 10.0,
                    )
                )
        elif preference == "PREFER":
            room_not_preferred = room_ids and room.classroomId not in room_ids
            building_not_preferred = (
                building_ids and room.buildingId not in building_ids
            )

            if room_not_preferred or building_not_preferred:
                violations.append(
                    self._create_violation(
                        context,
                        f"Teacher {teacher.name} prefers different rooms",
                        severity_factor=(self.constraint.priority / 10.0) * 0.5,
                    )
                )

        return violations


class TeacherScheduleCompactnessConstraint(UserPreferenceConstraintValidator):
    """Validates teacher schedule compactness preferences."""

    def __init__(self, penalty_manager, constraint: Constraint):
        super().__init__(
            SchedulingConstraintCategory.TEACHER_SCHEDULE_COMPACTNESS,
            penalty_manager,
            constraint,
        )

    def validate(self, context: ConstraintContext) -> List[ConstraintViolation]:
        violations = []
        item = context.scheduled_item

        if item is None:
            return violations

        # This constraint requires full chromosome analysis, not single gene
        # For now, return empty - would need to be handled differently
        # or moved to a post-processing step
        return violations


class TeacherConsecutiveMovementConstraint(WholeScheduleConstraintValidator):
    """
    Validates consecutive classroom movement for teachers.
    This operates on the entire chromosome to detect consecutive movement patterns.
    """

    def __init__(self, penalty_manager):
        super().__init__(
            SchedulingConstraintCategory.TEACHER_CONSECUTIVE_MOVEMENT, penalty_manager
        )

    def validate_schedule(
        self, context: ConstraintContext
    ) -> List[ConstraintViolation]:
        """Evaluate consecutive classroom movement for teachers across the entire schedule."""
        violations: List[ConstraintViolation] = []

        # Group schedule by teacher and day
        teacher_daily_schedules = self._group_by_entity_and_day(
            context.chromosome, "teacher"
        )

        for teacher_id, daily_schedule in teacher_daily_schedules.items():
            for day, day_items in daily_schedule.items():
                sorted_items = sorted(
                    day_items, key=lambda x: context.timeslot_order.get(x.timeslot, 0)
                )

                # Check consecutive pairs
                for i in range(len(sorted_items) - 1):
                    current = sorted_items[i]
                    next_item = sorted_items[i + 1]

                    # Only check if truly consecutive (no gap) and different rooms
                    are_consecutive = self._are_consecutive_timeslots(
                        current.timeslot, next_item.timeslot, context.timeslot_order
                    )
                    are_different_rooms = current.classroomId != next_item.classroomId

                    if are_consecutive and are_different_rooms:
                        violations.append(
                            self._create_schedule_violation(
                                context,
                                next_item,
                                f"Teacher {teacher_id} moves from {current.classroomId} to {next_item.classroomId}",
                                conflicting_item=current,
                            )
                        )

        return violations

    def _group_by_entity_and_day(
        self, schedule: List[ScheduledItem], entity_type: str
    ) -> Dict[str, Dict[str, List[ScheduledItem]]]:
        """Group schedule items by entity (teacher/student_group) and day."""
        grouped: Dict[str, Dict[str, List[ScheduledItem]]] = {}

        for item in schedule:
            entities = []
            if entity_type == "teacher":
                entities = [item.teacherId]
            elif entity_type == "student_group":
                entities = item.studentGroupIds

            for entity_id in entities:
                if entity_id not in grouped:
                    grouped[entity_id] = {}
                if item.day not in grouped[entity_id]:
                    grouped[entity_id][item.day] = []
                grouped[entity_id][item.day].append(item)

        return grouped

    def _are_consecutive_timeslots(
        self, timeslot1: str, timeslot2: str, timeslot_order: Dict[str, int]
    ) -> bool:
        """Check if two timeslots are consecutive."""
        order1 = timeslot_order.get(timeslot1, 0)
        order2 = timeslot_order.get(timeslot2, 0)
        return order2 == order1 + 1
