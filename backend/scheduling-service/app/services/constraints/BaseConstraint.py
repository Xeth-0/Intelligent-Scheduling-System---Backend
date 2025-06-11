from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass

from app.models import ScheduledItem, Teacher, Classroom, StudentGroup, Course, Timeslot, Constraint
from app.services.FitnessReport import ConstraintViolation
from app.services.SchedulingConstraint import SchedulingConstraintCategory, SchedulingConstraintType
from app.services.PenaltyManager import PenaltyManager


class ConstraintContext:
    """
    Context object passed to constraint validators containing all necessary data
    and state for validation. Reused across genes in a single schedule evaluation
    for memory efficiency.
    """

    def __init__(
        self,
        chromosome: List[ScheduledItem],
        teachers: Dict[str, Teacher],
        rooms: Dict[str, Classroom],
        student_groups: Dict[str, StudentGroup],
        courses: Dict[str, Course],
        timeslots: Dict[str, Timeslot],
        timeslot_order: Dict[str, int],
    ):
        # Full chromosome for stateful constraints
        self.chromosome = chromosome

        # Data lookups (immutable references)
        self.teachers = teachers
        self.rooms = rooms
        self.student_groups = student_groups
        self.courses = courses
        self.timeslots = timeslots
        self.timeslot_order = timeslot_order

        # State trackers for conflict detection (shared across all constraint instances)
        self.room_tracker: Dict[Tuple[str, str, str], ScheduledItem] = {}
        self.teacher_tracker: Dict[Tuple[str, str, str], ScheduledItem] = {}
        self.student_group_tracker: Dict[Tuple[str, str, str], ScheduledItem] = {}

        # Current gene being validated (updated for each gene)
        self.scheduled_item: Optional[ScheduledItem] = None
        self.gene_index: int = 0

        # Constraint-specific data (from user preferences/campus policies)
        self.constraint_data: Optional[Constraint] = None

    def update_current_gene(self, scheduled_item: ScheduledItem, gene_index: int) -> None:
        """Update the context for the current gene being evaluated."""
        self.scheduled_item = scheduled_item
        self.gene_index = gene_index

    def reset_state_trackers(self) -> None:
        """Reset state trackers for a new schedule evaluation."""
        self.room_tracker.clear()
        self.teacher_tracker.clear()
        self.student_group_tracker.clear()


class BaseConstraintValidator(ABC):
    """
    Base class for all constraint validators.
    Each constraint type has its own validator class.
    """

    def __init__(self, category: SchedulingConstraintCategory, penalty_manager: PenaltyManager):
        self.category = category
        self.penalty_manager = penalty_manager
        self.constraint_type = category.constraint_type

    @abstractmethod
    def validate(self, context: ConstraintContext) -> List[ConstraintViolation]:
        """
        Validate the constraint against the current gene in context.
        Returns list of violations (empty if no violations).
        """
        pass

    def _create_violation(
        self,
        context: ConstraintContext,
        description: str,
        severity_factor: float = 1.0,
        violation_count: int = 1,
        conflicting_item: Optional[ScheduledItem] = None,
    ) -> ConstraintViolation:
        """Helper method to create consistent violation objects."""
        if context.scheduled_item is None:
            raise ValueError("No current scheduled item set in context")

        penalty = self.penalty_manager.get_penalty(
            self.category, violation_count=violation_count, severity_factor=severity_factor
        )

        return ConstraintViolation(
            constraint_category=self.category,
            constraint_type=self.constraint_type,
            severity=penalty,
            scheduled_item=context.scheduled_item,
            description=description,
            conflicting_item=conflicting_item,
        )

    def _get_max_penalty_for_violation(self) -> float:
        """Get the maximum penalty for a violation."""
        return self.penalty_manager.get_penalty(
            self.category, violation_count=1, severity_factor=1.0,
        )


class StatelessConstraintValidator(BaseConstraintValidator):
    """
    Base class for constraints that only need to examine the current gene.
    Examples: room capacity, accessibility, room type mismatch.
    """

    pass


class StatefulConstraintValidator(BaseConstraintValidator):
    """
    Base class for constraints that need to examine the entire chromosome or track state.
    Examples: room conflicts, teacher conflicts, consecutive movement.
    """

    pass


class WholeScheduleConstraintValidator(BaseConstraintValidator):
    """
    Base class for constraints that need to analyze the entire schedule at once.
    These run after all gene-level validations are complete.
    Examples: consecutive movement, schedule compactness patterns.
    """

    def validate(self, context: ConstraintContext) -> List[ConstraintViolation]:
        """
        For whole-schedule constraints, this is called once with the full chromosome.
        Override validate_schedule instead of this method.
        """
        return self.validate_schedule(context)

    @abstractmethod
    def validate_schedule(self, context: ConstraintContext) -> List[ConstraintViolation]:
        """
        Validate the constraint against the entire schedule.
        Returns list of violations (empty if no violations).
        """
        pass

    def _create_schedule_violation(
        self,
        context: ConstraintContext,
        scheduled_item: ScheduledItem,
        description: str,
        severity_factor: float = 1.0,
        violation_count: int = 1,
        conflicting_item: Optional[ScheduledItem] = None,
    ) -> ConstraintViolation:
        """Helper method to create violations for specific scheduled items in whole-schedule constraints."""
        penalty = self.penalty_manager.get_penalty(
            self.category, violation_count=violation_count, severity_factor=severity_factor
        )

        return ConstraintViolation(
            constraint_category=self.category,
            constraint_type=self.constraint_type,
            severity=penalty,
            scheduled_item=scheduled_item,
            description=description,
            conflicting_item=conflicting_item,
        )


class UserPreferenceConstraintValidator(BaseConstraintValidator):
    """
    Base class for constraints that come from user preferences/campus policies.
    These have associated Constraint objects with specific configuration.
    """

    def __init__(
        self,
        category: SchedulingConstraintCategory,
        penalty_manager: PenaltyManager,
        constraint: Constraint,
    ):
        super().__init__(category, penalty_manager)
        self.constraint = constraint
