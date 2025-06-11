# For profiling the fitness evaluator
import time  # TODO: Remove

from app.services.FitnessReport import FitnessReport, ConstraintViolation
from app.services.PenaltyManager import PenaltyManager
from app.services.SchedulingConstraintRegistry import SchedulingConstraintRegistry
from app.models import (
    Classroom,
    Course,
    ScheduledItem,
    StudentGroup,
    Teacher,
    Constraint,
    Timeslot,
)
from app.services.SchedulingConstraint import (
    SchedulingConstraintCategory,
    SchedulingConstraintType,
)

from typing import Dict, List, Tuple, Optional, Set
import numpy as np


class ScheduleFitnessEvaluator:
    """
    Standalone fitness evaluator for schedules that provides multi-objective
    assessment with detailed constraint violation tracking.
    """

    def __init__(
        self,
        teachers: List[Teacher],
        rooms: List[Classroom],
        student_groups: List[StudentGroup],
        courses: List[Course],
        timeslots: List[Timeslot],
        days: List[str],
        constraint_registry: SchedulingConstraintRegistry,
        penalty_manager: Optional[PenaltyManager] = None,
    ):
        self.teachers = teachers
        self.rooms = rooms
        self.student_groups = student_groups
        self.courses = courses
        self.timeslots = timeslots
        self.days = days
        self.constraint_registry = constraint_registry

        # Initialize penalty manager with constraints from registry
        constraints = constraint_registry.constraints
        self.penalty_manager = penalty_manager or PenaltyManager(
            num_courses=len(courses),
            num_teachers=len(teachers),
            constraints=constraints,
        )

        # Create lookup maps for efficient access
        self.teacher_map = {teacher.teacherId: teacher for teacher in teachers}
        self.room_map = {room.classroomId: room for room in rooms}
        self.student_group_map = {sg.studentGroupId: sg for sg in student_groups}
        self.course_map = {course.courseId: course for course in courses}
        self.timeslot_map = {ts.code: ts for ts in timeslots}

        # Create timeslot ordering for consecutive time calculations
        self.timeslot_order = {
            ts.code: ts.order for ts in sorted(timeslots, key=lambda x: x.order)
        }

        # Calculate dynamic ECTS threshold for priority scheduling
        self.ects_threshold = self._calculate_ects_threshold()

    def _calculate_ects_threshold(self) -> float:
        """Calculate dynamic ECTS threshold based on course distribution (top 20%)."""
        ects_values = [
            course.ectsCredits for course in self.courses if course.ectsCredits > 0
        ]
        if not ects_values:
            return 0.0
        return float(np.percentile(ects_values, 80))  # Top 20% of courses

    def evaluate(self, schedule: List[ScheduledItem]) -> FitnessReport:
        """
        Evaluate a complete schedule and return comprehensive fitness report.
        """
        start_time = time.time()

        violations: List[ConstraintViolation] = []

        # Tracking structures for conflict detection
        room_schedule_tracker: Dict[Tuple[str, str, str], ScheduledItem] = {}
        teacher_schedule_tracker: Dict[Tuple[str, str, str], ScheduledItem] = {}
        student_group_schedule_tracker: Dict[Tuple[str, str, str], ScheduledItem] = {}

        # Evaluate each scheduled item
        for scheduled_item in schedule:
            item_violations = self._evaluate_scheduled_item(
                scheduled_item,
                room_schedule_tracker,
                teacher_schedule_tracker,
                student_group_schedule_tracker,
            )
            violations.extend(item_violations)

        # Evaluate schedule-wide constraints (consecutive movement)
        movement_violations = self.evaluate_consecutive_movement(schedule)
        violations.extend(movement_violations)

        # Compile results
        evaluation_time = time.time() - start_time
        return self._compile_fitness_report(violations, evaluation_time)

    def _evaluate_scheduled_item(
        self,
        scheduled_item: ScheduledItem,
        room_tracker: Dict[Tuple[str, str, str], ScheduledItem],
        teacher_tracker: Dict[Tuple[str, str, str], ScheduledItem],
        student_group_tracker: Dict[Tuple[str, str, str], ScheduledItem],
    ) -> List[ConstraintViolation]:
        """Evaluate a single scheduled item for constraint violations."""
        violations: List[ConstraintViolation] = []

        # Get related objects
        course = self.course_map.get(scheduled_item.courseId)
        room = self.room_map.get(scheduled_item.classroomId)
        teacher = self.teacher_map.get(scheduled_item.teacherId)

        # Check for missing data (hard constraint)
        if not course:
            violations.append(
                ConstraintViolation(
                    SchedulingConstraintCategory.MISSING_DATA,
                    SchedulingConstraintType.HARD,
                    1.0,
                    scheduled_item,
                    f"Course {scheduled_item.courseId} not found",
                )
            )
        if not room:
            violations.append(
                ConstraintViolation(
                    SchedulingConstraintCategory.MISSING_DATA,
                    SchedulingConstraintType.HARD,
                    1.0,
                    scheduled_item,
                    f"Room {scheduled_item.classroomId} not found",
                )
            )
        if not teacher:
            violations.append(
                ConstraintViolation(
                    SchedulingConstraintCategory.MISSING_DATA,
                    SchedulingConstraintType.HARD,
                    1.0,
                    scheduled_item,
                    f"Teacher {scheduled_item.teacherId} not found",
                )
            )

        # If missing critical data, skip further evaluation
        if not (course and room and teacher):
            return violations

        hard_violations = self._evaluate_hard_constraints(
            scheduled_item,
            room_tracker,
            teacher_tracker,
            student_group_tracker,
        )
        violations.extend(hard_violations)

        soft_violations = self._evaluate_soft_constraints(scheduled_item)
        violations.extend(soft_violations)

        return violations

    def _evaluate_hard_constraints(
        self,
        scheduled_item: ScheduledItem,
        room_tracker: Dict[Tuple[str, str, str], ScheduledItem],
        teacher_tracker: Dict[Tuple[str, str, str], ScheduledItem],
        student_group_tracker: Dict[Tuple[str, str, str], ScheduledItem],
    ) -> List[ConstraintViolation]:
        violations: List[ConstraintViolation] = []

        course = self.course_map.get(scheduled_item.courseId)
        room = self.room_map.get(scheduled_item.classroomId)
        teacher = self.teacher_map.get(scheduled_item.teacherId)

        if not course or not teacher:
            # Critical information. we are not going to decide the course or teacher, these need to be there.
            return violations

        if not room:  # Unscheduled. Large penalty and early return
            penalty = self.penalty_manager.get_penalty(
                SchedulingConstraintCategory.UNASSIGNED_ROOM
            )
            violations.append(
                ConstraintViolation(
                    SchedulingConstraintCategory.UNASSIGNED_ROOM,
                    SchedulingConstraintType.HARD,
                    penalty,
                    scheduled_item,
                    "Unscheduled item",
                )
            )
            return violations

        # === HARD CONSTRAINTS ===
        # Check for invalid scheduling (hard constraint)
        if not scheduled_item.timeslot or not scheduled_item.day:
            penalty = self.penalty_manager.get_penalty(
                SchedulingConstraintCategory.INVALID_SCHEDULING
            )
            violations.append(
                ConstraintViolation(
                    SchedulingConstraintCategory.INVALID_SCHEDULING,
                    SchedulingConstraintType.HARD,
                    penalty,
                    scheduled_item,
                    "Missing timeslot or day assignment",
                )
            )
            return violations

        # Hard Constraint: Teacher wheelchair accessibility
        if teacher.needsWheelchairAccessibleRoom and not room.isWheelchairAccessible:
            penalty = self.penalty_manager.get_penalty(
                SchedulingConstraintCategory.TEACHER_WHEELCHAIR_ACCESS
            )
            violations.append(
                ConstraintViolation(
                    SchedulingConstraintCategory.TEACHER_WHEELCHAIR_ACCESS,
                    SchedulingConstraintType.HARD,
                    penalty,
                    scheduled_item,
                    f"Teacher {teacher.name} needs wheelchair accessible room, but {room.name} is not accessible",
                )
            )

        # Hard Constraint: Student group wheelchair accessibility
        for sg_id in scheduled_item.studentGroupIds:
            student_group = self.student_group_map.get(sg_id)
            if (
                student_group
                and student_group.accessibilityRequirement
                and not room.isWheelchairAccessible
            ):
                penalty = self.penalty_manager.get_penalty(
                    SchedulingConstraintCategory.STUDENT_GROUP_WHEELCHAIR_ACCESS
                )
                violations.append(
                    ConstraintViolation(
                        SchedulingConstraintCategory.STUDENT_GROUP_WHEELCHAIR_ACCESS,
                        SchedulingConstraintType.HARD,
                        penalty,
                        scheduled_item,
                        f"Student group {student_group.name} needs wheelchair accessible room, but {room.name} is not accessible",
                    )
                )

        # Hard Constraint: Room type mismatch
        if room.type != scheduled_item.sessionType:
            penalty = self.penalty_manager.get_penalty(
                SchedulingConstraintCategory.ROOM_TYPE_MISMATCH
            )
            violations.append(
                ConstraintViolation(
                    SchedulingConstraintCategory.ROOM_TYPE_MISMATCH,
                    SchedulingConstraintType.HARD,
                    penalty,
                    scheduled_item,
                    f"Session type '{scheduled_item.sessionType}' requires different room type than '{room.type}'",
                )
            )

        # Hard Constraint: Resource conflicts
        time_key_room = (
            scheduled_item.classroomId,
            scheduled_item.day,
            scheduled_item.timeslot,
        )
        time_key_teacher = (
            scheduled_item.teacherId,
            scheduled_item.day,
            scheduled_item.timeslot,
        )

        # Room conflict
        if time_key_room in room_tracker:
            conflicting_item = room_tracker[time_key_room]
            penalty = self.penalty_manager.get_penalty(
                SchedulingConstraintCategory.ROOM_CONFLICT
            )
            violations.append(
                ConstraintViolation(
                    SchedulingConstraintCategory.ROOM_CONFLICT,
                    SchedulingConstraintType.HARD,
                    penalty,
                    scheduled_item,
                    f"Room {room.name} already occupied at {scheduled_item.day} {scheduled_item.timeslot}",
                    conflicting_item,
                )
            )
        else:
            room_tracker[time_key_room] = scheduled_item

        # Teacher conflict
        if time_key_teacher in teacher_tracker:
            conflicting_item = teacher_tracker[time_key_teacher]
            penalty = self.penalty_manager.get_penalty(
                SchedulingConstraintCategory.TEACHER_CONFLICT
            )
            violations.append(
                ConstraintViolation(
                    SchedulingConstraintCategory.TEACHER_CONFLICT,
                    SchedulingConstraintType.HARD,
                    penalty,
                    scheduled_item,
                    f"Teacher {teacher.name} already teaching at {scheduled_item.day} {scheduled_item.timeslot}",
                    conflicting_item,
                )
            )
        else:
            teacher_tracker[time_key_teacher] = scheduled_item

        # Student group conflicts
        for sg_id in scheduled_item.studentGroupIds:
            time_key_student_group = (
                sg_id,
                scheduled_item.day,
                scheduled_item.timeslot,
            )
            if time_key_student_group in student_group_tracker:
                conflicting_item = student_group_tracker[time_key_student_group]
                student_group = self.student_group_map.get(sg_id)
                sg_name = student_group.name if student_group else sg_id
                penalty = self.penalty_manager.get_penalty(
                    SchedulingConstraintCategory.STUDENT_GROUP_CONFLICT
                )
                violations.append(
                    ConstraintViolation(
                        SchedulingConstraintCategory.STUDENT_GROUP_CONFLICT,
                        SchedulingConstraintType.HARD,
                        penalty,
                        scheduled_item,
                        f"Student group {sg_name} already has class at {scheduled_item.day} {scheduled_item.timeslot}",
                        conflicting_item,
                    )
                )
            else:
                student_group_tracker[time_key_student_group] = scheduled_item

        return violations

    def _evaluate_soft_constraints(
        self, scheduled_item: ScheduledItem
    ) -> List[ConstraintViolation]:
        """Evaluate soft constraints for a scheduled item."""
        violations: List[ConstraintViolation] = []

        course = self.course_map.get(scheduled_item.courseId)
        room = self.room_map.get(scheduled_item.classroomId)
        teacher = self.teacher_map.get(scheduled_item.teacherId)

        if (
            not course or not room or not teacher
        ):  # Major hard violations, no need to evaluate soft constraints
            return violations

        # Calculate total student count
        total_student_count = 0
        for sg_id in scheduled_item.studentGroupIds:
            student_group = self.student_group_map.get(sg_id)
            if student_group:
                total_student_count += student_group.size
            else:
                penalty = self.penalty_manager.get_penalty(
                    SchedulingConstraintCategory.MISSING_DATA
                )
                violations.append(
                    ConstraintViolation(
                        SchedulingConstraintCategory.MISSING_DATA,
                        SchedulingConstraintType.HARD,
                        penalty,
                        scheduled_item,
                        f"Student group {sg_id} not found",
                    )
                )

        # Soft Constraint: Room capacity overflow
        if room.capacity < total_student_count:
            overflow = total_student_count - room.capacity
            penalty = self.penalty_manager.get_penalty(
                SchedulingConstraintCategory.ROOM_CAPACITY_OVERFLOW,
                violation_count=overflow,
            )
            violations.append(
                ConstraintViolation(
                    SchedulingConstraintCategory.ROOM_CAPACITY_OVERFLOW,
                    SchedulingConstraintType.SOFT,
                    penalty,
                    scheduled_item,
                    f"Room capacity: {room.capacity} - exceeded by {overflow} students (total students: {total_student_count})",
                )
            )

        # Get teacher constraints for preference evaluation
        teacher_constraints = []
        if self.constraint_registry:
            teacher_constraints = self.constraint_registry.get_teacher_constraints(
                scheduled_item.teacherId
            )

        # Evaluate teacher time preferences
        time_preference_violations = self._evaluate_teacher_time_preferences(
            scheduled_item, teacher, teacher_constraints
        )
        violations.extend(time_preference_violations)

        # Evaluate teacher room preferences
        room_preference_violations = self._evaluate_teacher_room_preferences(
            scheduled_item, teacher, room, teacher_constraints
        )
        violations.extend(room_preference_violations)

        # Evaluate ECTS priority constraint
        ects_violations = self._evaluate_ects_priority(scheduled_item, course)
        violations.extend(ects_violations)

        return violations

    def _compile_fitness_report(
        self, violations: List[ConstraintViolation], evaluation_time: float
    ) -> FitnessReport:
        """Compile violations into a comprehensive fitness report."""

        # Categorize violations
        violation_summary: Dict[
            SchedulingConstraintCategory, List[ConstraintViolation]
        ] = {}
        hard_constraint_scores: Dict[SchedulingConstraintCategory, int] = {}
        soft_constraint_scores: Dict[SchedulingConstraintCategory, float] = {}

        total_hard_violations = 0
        total_soft_penalty = 0.0

        for violation in violations:
            # Add to summary
            if violation.constraint_category not in violation_summary:
                violation_summary[violation.constraint_category] = []
            violation_summary[violation.constraint_category].append(violation)

            # Update scores
            if violation.constraint_type == SchedulingConstraintType.HARD:
                hard_constraint_scores[violation.constraint_category] = (
                    hard_constraint_scores.get(violation.constraint_category, 0) + 1
                )
                total_hard_violations += 1
            else:  # SOFT
                soft_constraint_scores[violation.constraint_category] = (
                    soft_constraint_scores.get(violation.constraint_category, 0.0)
                    + violation.severity
                )
                total_soft_penalty += violation.severity

        # Create fitness vector: [total_hard, total_soft, individual_categories...]
        fitness_vector = [float(total_hard_violations), total_soft_penalty]

        # Add individual category scores to vector (for multi-objective optimization)
        all_categories = list(SchedulingConstraintCategory)
        for category in all_categories:
            if category in hard_constraint_scores:
                fitness_vector.append(float(hard_constraint_scores[category]))
            elif category in soft_constraint_scores:
                fitness_vector.append(soft_constraint_scores[category])
            else:
                fitness_vector.append(0.0)

        return FitnessReport(
            total_hard_violations=total_hard_violations,
            total_soft_penalty=total_soft_penalty,
            hard_constraint_scores=hard_constraint_scores,
            soft_constraint_scores=soft_constraint_scores,
            violations=violations,
            violation_summary=violation_summary,
            is_feasible=(total_hard_violations == 0),
            fitness_vector=fitness_vector,
            evaluation_time=evaluation_time,
        )

    def _evaluate_teacher_time_preferences(
        self,
        scheduled_item: ScheduledItem,
        teacher: Teacher,
        teacher_constraints: List[Constraint],
    ) -> List[ConstraintViolation]:
        """Check teacher time preferences against scheduled time."""
        violations: List[ConstraintViolation] = []

        for constraint in teacher_constraints:
            if (
                constraint.constraintCategory
                != SchedulingConstraintCategory.TEACHER_TIME_PREFERENCE
            ):
                continue

            constraint_value = constraint.value
            preference = constraint_value.get("preference", "NEUTRAL")
            days = constraint_value.get("days", [])
            timeslot_codes = constraint_value.get("timeslotCodes", [])

            # Check if this scheduled item conflicts with teacher preferences
            if scheduled_item.day in days and scheduled_item.timeslot in timeslot_codes:
                if preference == "AVOID":
                    # Teacher wants to avoid this time - violation
                    penalty = self.penalty_manager.get_penalty(
                        SchedulingConstraintCategory.TEACHER_TIME_PREFERENCE,
                        severity_factor=constraint.priority / 10.0,
                    )
                    violations.append(
                        ConstraintViolation(
                            SchedulingConstraintCategory.TEACHER_TIME_PREFERENCE,
                            SchedulingConstraintType.SOFT,
                            penalty,
                            scheduled_item,
                            f"Teacher {teacher.name} prefers to avoid {scheduled_item.day} {scheduled_item.timeslot}",
                        )
                    )
            elif preference == "PREFER":
                # Teacher prefers specific times, but this isn't one of them
                # This is a lighter penalty since it's not explicitly avoided
                penalty = self.penalty_manager.get_penalty(
                    SchedulingConstraintCategory.TEACHER_TIME_PREFERENCE,
                    severity_factor=(constraint.priority / 10.0)
                    * 0.5,  # Half penalty for non-preferred
                )
                violations.append(
                    ConstraintViolation(
                        SchedulingConstraintCategory.TEACHER_TIME_PREFERENCE,
                        SchedulingConstraintType.SOFT,
                        penalty,
                        scheduled_item,
                        f"Teacher {teacher.name} prefers different time slots",
                    )
                )

        return violations

    def _evaluate_teacher_room_preferences(
        self,
        scheduled_item: ScheduledItem,
        teacher: Teacher,
        room: Classroom,
        teacher_constraints: List[Constraint],
    ) -> List[ConstraintViolation]:
        """Check teacher room preferences against assigned room."""
        violations: List[ConstraintViolation] = []

        for constraint in teacher_constraints:
            if (
                constraint.constraintCategory
                != SchedulingConstraintCategory.TEACHER_ROOM_PREFERENCE
            ):
                continue

            constraint_value = constraint.value
            preference = constraint_value.get("preference", "PREFER")
            room_ids = constraint_value.get("roomIds", [])
            building_ids = constraint_value.get("buildingIds", [])

            # Check room preferences
            if preference == "AVOID":
                if room.classroomId in room_ids or room.buildingId in building_ids:
                    penalty = self.penalty_manager.get_penalty(
                        SchedulingConstraintCategory.TEACHER_ROOM_PREFERENCE,
                        severity_factor=constraint.priority / 10.0,
                    )
                    violations.append(
                        ConstraintViolation(
                            SchedulingConstraintCategory.TEACHER_ROOM_PREFERENCE,
                            SchedulingConstraintType.SOFT,
                            penalty,
                            scheduled_item,
                            f"Teacher {teacher.name} prefers to avoid room {room.name}",
                        )
                    )
            elif preference == "PREFER":
                if (
                    room_ids
                    and room.classroomId not in room_ids
                    and building_ids
                    and room.buildingId not in building_ids
                ):
                    penalty = self.penalty_manager.get_penalty(
                        SchedulingConstraintCategory.TEACHER_ROOM_PREFERENCE,
                        severity_factor=(constraint.priority / 10.0) * 0.5,
                    )
                    violations.append(
                        ConstraintViolation(
                            SchedulingConstraintCategory.TEACHER_ROOM_PREFERENCE,
                            SchedulingConstraintType.SOFT,
                            penalty,
                            scheduled_item,
                            f"Teacher {teacher.name} prefers different rooms",
                        )
                    )

        return violations

    def _evaluate_ects_priority(
        self, scheduled_item: ScheduledItem, course: Course
    ) -> List[ConstraintViolation]:
        """Check if high-ECTS courses are scheduled early enough."""
        violations: List[ConstraintViolation] = []

        # Only evaluate if this is a high-priority course
        if course.ectsCredits >= self.ects_threshold:
            # Check if scheduled in a later timeslot
            timeslot_order = self.timeslot_order.get(scheduled_item.timeslot, 0)

            # Define "early" timeslots as first 3 slots of the day
            early_timeslot_threshold = 3

            if timeslot_order > early_timeslot_threshold:
                # Calculate penalty based on how late it is
                delay_penalty = (timeslot_order - early_timeslot_threshold) * 0.5
                penalty = self.penalty_manager.get_penalty(
                    SchedulingConstraintCategory.ECTS_PRIORITY_VIOLATION,
                    severity_factor=delay_penalty,
                )
                violations.append(
                    ConstraintViolation(
                        SchedulingConstraintCategory.ECTS_PRIORITY_VIOLATION,
                        SchedulingConstraintType.SOFT,
                        penalty,
                        scheduled_item,
                        f"High-ECTS course {course.name} ({course.ectsCredits} ECTS) scheduled late in the day",
                    )
                )

        return violations

    def evaluate_consecutive_movement(
        self, schedule: List[ScheduledItem]
    ) -> List[ConstraintViolation]:
        """
        Evaluate consecutive classroom movement for teachers and student groups.
        This method should be called after evaluating the entire schedule.
        """
        violations: List[ConstraintViolation] = []

        # Group schedule by teacher and day
        teacher_daily_schedules = self._group_by_entity_and_day(schedule, "teacher")

        for teacher_id, daily_schedule in teacher_daily_schedules.items():
            for day, day_items in daily_schedule.items():
                sorted_items = sorted(
                    day_items, key=lambda x: self.timeslot_order.get(x.timeslot, 0)
                )

                # Check consecutive pairs
                for i in range(len(sorted_items) - 1):
                    current = sorted_items[i]
                    next_item = sorted_items[i + 1]

                    # Only check if truly consecutive (no gap)
                    if self._are_consecutive_timeslots(
                        current.timeslot, next_item.timeslot
                    ):
                        if current.classroomId != next_item.classroomId:
                            penalty = self.penalty_manager.get_penalty(
                                SchedulingConstraintCategory.TEACHER_CONSECUTIVE_MOVEMENT
                            )
                            violations.append(
                                ConstraintViolation(
                                    SchedulingConstraintCategory.TEACHER_CONSECUTIVE_MOVEMENT,
                                    SchedulingConstraintType.SOFT,
                                    penalty,
                                    next_item,
                                    f"Teacher {teacher_id} moves from {current.classroomId} to {next_item.classroomId}",
                                    current,
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

    def _are_consecutive_timeslots(self, timeslot1: str, timeslot2: str) -> bool:
        """Check if two timeslots are consecutive."""
        order1 = self.timeslot_order.get(timeslot1, 0)
        order2 = self.timeslot_order.get(timeslot2, 0)
        return order2 == order1 + 1
