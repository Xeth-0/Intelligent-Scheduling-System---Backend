# For profiling the fitness evaluator
import time  # TODO: Remove

from app.services.FitnessReport import FitnessReport, ConstraintViolation
from app.models.models import Classroom, Course, ScheduledItem, StudentGroup, Teacher
from app.services.constraint import ConstraintCategory, ConstraintType

from typing import Dict, List, Tuple


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
    ):
        self.teachers = teachers
        self.rooms = rooms
        self.student_groups = student_groups
        self.courses = courses

        # Create lookup maps for efficient access
        self.teacher_map = {teacher.teacherId: teacher for teacher in teachers}
        self.room_map = {room.classroomId: room for room in rooms}
        self.student_group_map = {sg.studentGroupId: sg for sg in student_groups}
        self.course_map = {course.courseId: course for course in courses}

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
                    ConstraintCategory.MISSING_DATA,
                    ConstraintType.HARD,
                    1.0,
                    scheduled_item,
                    f"Course {scheduled_item.courseId} not found",
                )
            )
        if not room:
            violations.append(
                ConstraintViolation(
                    ConstraintCategory.MISSING_DATA,
                    ConstraintType.HARD,
                    1.0,
                    scheduled_item,
                    f"Room {scheduled_item.classroomId} not found",
                )
            )
        if not teacher:
            violations.append(
                ConstraintViolation(
                    ConstraintCategory.MISSING_DATA,
                    ConstraintType.HARD,
                    1.0,
                    scheduled_item,
                    f"Teacher {scheduled_item.teacherId} not found",
                )
            )

        # If missing critical data, skip further evaluation
        if not (course and room and teacher):
            return violations

        # Check for invalid scheduling (hard constraint)
        if not scheduled_item.timeslot or not scheduled_item.day:
            violations.append(
                ConstraintViolation(
                    ConstraintCategory.INVALID_SCHEDULING,
                    ConstraintType.HARD,
                    1.0,
                    scheduled_item,
                    "Missing timeslot or day assignment",
                )
            )
            return violations

        # Calculate total student count
        total_student_count = 0
        for sg_id in scheduled_item.studentGroupIds:
            student_group = self.student_group_map.get(sg_id)
            if student_group:
                total_student_count += student_group.size
            else:
                violations.append(
                    ConstraintViolation(
                        ConstraintCategory.MISSING_DATA,
                        ConstraintType.HARD,
                        1.0,
                        scheduled_item,
                        f"Student group {sg_id} not found",
                    )
                )

        # === HARD CONSTRAINTS ===

        # Hard Constraint: Teacher wheelchair accessibility
        if teacher.needsWheelchairAccessibleRoom and not room.isWheelchairAccessible:
            violations.append(
                ConstraintViolation(
                    ConstraintCategory.TEACHER_WHEELCHAIR_ACCESS,
                    ConstraintType.HARD,
                    1.0,
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
                violations.append(
                    ConstraintViolation(
                        ConstraintCategory.STUDENT_GROUP_WHEELCHAIR_ACCESS,
                        ConstraintType.HARD,
                        1.0,
                        scheduled_item,
                        f"Student group {student_group.name} needs wheelchair accessible room, but {room.name} is not accessible",
                    )
                )

        # Hard Constraint: Room type mismatch
        if room.type != scheduled_item.sessionType:
            violations.append(
                ConstraintViolation(
                    ConstraintCategory.ROOM_TYPE_MISMATCH,
                    ConstraintType.HARD,
                    1.0,
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
            violations.append(
                ConstraintViolation(
                    ConstraintCategory.ROOM_CONFLICT,
                    ConstraintType.HARD,
                    1.0,
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
            violations.append(
                ConstraintViolation(
                    ConstraintCategory.TEACHER_CONFLICT,
                    ConstraintType.HARD,
                    1.0,
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
                violations.append(
                    ConstraintViolation(
                        ConstraintCategory.STUDENT_GROUP_CONFLICT,
                        ConstraintType.HARD,
                        1.0,
                        scheduled_item,
                        f"Student group {sg_name} already has class at {scheduled_item.day} {scheduled_item.timeslot}",
                        conflicting_item,
                    )
                )
            else:
                student_group_tracker[time_key_student_group] = scheduled_item

        # === SOFT CONSTRAINTS ===

        # Soft Constraint: Room capacity (treating this as soft for now)
        if room.capacity < total_student_count:
            overflow = total_student_count - room.capacity
            # Penalty proportional to overflow
            penalty = overflow * 10.0  # 10 points per extra student
            violations.append(
                ConstraintViolation(
                    ConstraintCategory.ROOM_CAPACITY_OVERFLOW,
                    ConstraintType.SOFT,
                    penalty,
                    scheduled_item,
                    f"Room capacity: {room.capacity} - exceeded by {overflow} students (total students: {total_student_count})",
                )
            )

        # TODO: Add more soft constraints here
        # - Teacher time preferences
        # - Room preferences
        # - Scheduling efficiency metrics
        # - Course clustering preferences

        return violations

    def _compile_fitness_report(
        self, violations: List[ConstraintViolation], evaluation_time: float
    ) -> FitnessReport:
        """Compile violations into a comprehensive fitness report."""

        # Categorize violations
        violation_summary: Dict[ConstraintCategory, List[ConstraintViolation]] = {}
        hard_constraint_scores: Dict[ConstraintCategory, int] = {}
        soft_constraint_scores: Dict[ConstraintCategory, float] = {}

        total_hard_violations = 0
        total_soft_penalty = 0.0

        for violation in violations:
            # Add to summary
            if violation.constraint_category not in violation_summary:
                violation_summary[violation.constraint_category] = []
            violation_summary[violation.constraint_category].append(violation)

            # Update scores
            if violation.constraint_type == ConstraintType.HARD:
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
        all_categories = list(ConstraintCategory)
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
