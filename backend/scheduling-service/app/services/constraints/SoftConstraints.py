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
        course = context.courses.get(item.courseId)

        if not room or not course:
            return violations

        # Calculate total student count
        total_student_count = 0
        student_group_names = []
        for sg_id in item.studentGroupIds:
            student_group = context.student_groups.get(sg_id)
            if student_group:
                total_student_count += student_group.size
                student_group_names.append(student_group.name)

        # Check capacity overflow
        if room.capacity < total_student_count:
            overflow = total_student_count - room.capacity
            penalty = self.penalty_manager.get_penalty(
                self.category, violation_count=overflow
            )
            violations.append(
                self._create_violation(
                    context,
                    f"Course '{course.name}' ({course.courseId}) assigned to {room.name} (capacity: {room.capacity}) "
                    f"but needs {total_student_count} seats for groups: {', '.join(student_group_names)}. "
                    f"Overcapacity by {overflow} students. Penalty: {penalty:.2f}",
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
            severity_factor = delay_penalty
            penalty = self.penalty_manager.get_penalty(
                self.category, severity_factor=severity_factor
            )
            violations.append(
                self._create_violation(
                    context,
                    f"High-ECTS course '{course.name}' ({course.ectsCredits} ECTS, ID: {course.courseId}) "
                    f"scheduled late at {item.day} {item.timeslot} (position {timeslot_order}). "
                    f"Should be scheduled earlier (position ≤ {early_timeslot_threshold}). "
                    f"Penalty: {penalty:.2f}",
                    severity_factor=severity_factor,
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
        course = context.courses.get(item.courseId)

        if not teacher or not course or item.teacherId != self.constraint.teacherId:
            return violations

        constraint_value = self.constraint.value
        preference = constraint_value.get("preference", "NEUTRAL")
        days = constraint_value.get("days", [])
        timeslot_codes = constraint_value.get("timeslotCodes", [])

        # Check preference violations
        if item.day in days and item.timeslot in timeslot_codes:
            if preference == "AVOID":
                severity_factor = self.constraint.priority / 10.0
                penalty = self.penalty_manager.get_penalty(
                    self.category, severity_factor=severity_factor
                )
                violations.append(
                    self._create_violation(
                        context,
                        f"Course '{course.name}' ({course.courseId}) assigned to teacher {teacher.name} "
                        f"at {item.day} {item.timeslot}, but teacher prefers to AVOID this time. "
                        f"Priority: {self.constraint.priority}/10. Penalty: {penalty:.2f}",
                        severity_factor=severity_factor,
                    )
                )
        elif preference == "PREFER" and timeslot_codes and days:
            # Light penalty for not being in preferred time
            severity_factor = (self.constraint.priority / 10.0) * 0.5
            penalty = self.penalty_manager.get_penalty(
                self.category, severity_factor=severity_factor
            )
            preferred_slots = [f"{d} {ts}" for d in days for ts in timeslot_codes]
            violations.append(
                self._create_violation(
                    context,
                    f"Course '{course.name}' ({course.courseId}) assigned to teacher {teacher.name} "
                    f"at {item.day} {item.timeslot}, but teacher PREFERS: {', '.join(preferred_slots)}. "
                    f"Priority: {self.constraint.priority}/10. Penalty: {penalty:.2f}",
                    severity_factor=severity_factor,
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
        course = context.courses.get(item.courseId)

        if not teacher or not room or not course or item.teacherId != self.constraint.teacherId:
            return violations

        constraint_value = self.constraint.value
        preference = constraint_value.get("preference", "PREFER")
        room_ids = constraint_value.get("roomIds", [])
        building_ids = constraint_value.get("buildingIds", [])

        # Get preferred room/building names for better descriptions
        preferred_rooms = []
        preferred_buildings = []
        
        if room_ids:
            for room_id in room_ids:
                if room_id in context.rooms:
                    preferred_rooms.append(context.rooms[room_id].name)
        
        if building_ids:
            # Note: We don't have building lookup, so we'll use IDs
            preferred_buildings = building_ids

        if preference == "AVOID":
            if room.classroomId in room_ids or room.buildingId in building_ids:
                severity_factor = self.constraint.priority / 10.0
                penalty = self.penalty_manager.get_penalty(
                    self.category, severity_factor=severity_factor
                )
                violations.append(
                    self._create_violation(
                        context,
                        f"Course '{course.name}' ({course.courseId}) assigned to teacher {teacher.name} "
                        f"in room {room.name} (Building: {room.buildingId}), but teacher prefers to AVOID this room. "
                        f"Priority: {self.constraint.priority}/10. Penalty: {penalty:.2f}",
                        severity_factor=severity_factor,
                    )
                )
        elif preference == "PREFER":
            room_not_preferred = room_ids and room.classroomId not in room_ids
            building_not_preferred = (
                building_ids and room.buildingId not in building_ids
            )

            if room_not_preferred or building_not_preferred:
                severity_factor = (self.constraint.priority / 10.0) * 0.5
                penalty = self.penalty_manager.get_penalty(
                    self.category, severity_factor=severity_factor
                )
                
                preferred_text = []
                if preferred_rooms:
                    preferred_text.append(f"rooms: {', '.join(preferred_rooms)}")
                if preferred_buildings:
                    preferred_text.append(f"buildings: {', '.join(preferred_buildings)}")
                
                violations.append(
                    self._create_violation(
                        context,
                        f"Course '{course.name}' ({course.courseId}) assigned to teacher {teacher.name} "
                        f"in room {room.name} (Building: {room.buildingId}), but teacher PREFERS: {' or '.join(preferred_text)}. "
                        f"Priority: {self.constraint.priority}/10. Penalty: {penalty:.2f}",
                        severity_factor=severity_factor,
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
            teacher = context.teachers.get(teacher_id)
            teacher_name = teacher.name if teacher else teacher_id
            
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
                        current_room = context.rooms.get(current.classroomId)
                        next_room = context.rooms.get(next_item.classroomId)
                        current_course = context.courses.get(current.courseId)
                        next_course = context.courses.get(next_item.courseId)
                        
                        penalty = self.penalty_manager.get_penalty(self.category)
                        
                        violations.append(
                            self._create_schedule_violation(
                                context,
                                next_item,
                                f"Teacher {teacher_name} must move between consecutive classes on {day}: "
                                f"'{current_course.name if current_course else current.courseId}' in {current_room.name if current_room else current.classroomId} "
                                f"at {current.timeslot} → '{next_course.name if next_course else next_item.courseId}' in {next_room.name if next_room else next_item.classroomId} "
                                f"at {next_item.timeslot}. Penalty: {penalty:.2f}",
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
