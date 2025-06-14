# For profiling the fitness evaluator
import time  # TODO: Remove

from app.services.FitnessReport import FitnessReport, ConstraintViolation
from app.services.PenaltyManager import PenaltyManager
from app.services.SchedulingConstraintRegistry import SchedulingConstraintRegistry
from app.services.constraints.ConstraintFactory import ConstraintValidatorFactory
from app.services.constraints.BaseConstraint import ConstraintContext
from app.models import (
    Classroom,
    Course,
    ScheduledItem,
    StudentGroup,
    Teacher,
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

    # Does the fitness of a single scheduled item.
    # Population -> List of Chromosomes
    # Chromosome -> List of scheduled Items (individual course scheduled for a single timeslot and room)

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

        # Initialize penalty manager with constraint registry
        self.penalty_manager = penalty_manager or PenaltyManager(
            num_courses=len(courses),
            num_teachers=len(teachers),
            constraint_registry=constraint_registry,
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

        # Initialize constraint validator factory and create validators
        factory = ConstraintValidatorFactory(self.penalty_manager, self.ects_threshold)
        self.gene_validators = factory.create_all_gene_validators(constraint_registry)
        self.schedule_validators = factory.create_all_schedule_validators(
            constraint_registry
        )

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
        Evaluate a complete schedule using class-based constraint validators.
        """
        start_time = time.time()
        violations: List[ConstraintViolation] = []

        # Create context once for the entire schedule evaluation
        context = ConstraintContext(
            chromosome=schedule,
            teachers=self.teacher_map,
            rooms=self.room_map,
            student_groups=self.student_group_map,
            courses=self.course_map,
            timeslots=self.timeslot_map,
            timeslot_order=self.timeslot_order,
        )

        # Evaluate each scheduled item with gene-level validators
        for gene_index, scheduled_item in enumerate(schedule):
            # Update context for current gene
            context.update_current_gene(scheduled_item, gene_index)

            # Validate against all gene-level constraints
            for validator in self.gene_validators:
                item_violations = validator.validate(context)
                violations.extend(item_violations)

        # Handle whole-schedule constraints
        for validator in self.schedule_validators:
            schedule_violations = validator.validate(context)
            violations.extend(schedule_violations)

        # Compile results
        evaluation_time = time.time() - start_time
        return self._compile_fitness_report(violations, evaluation_time)

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
