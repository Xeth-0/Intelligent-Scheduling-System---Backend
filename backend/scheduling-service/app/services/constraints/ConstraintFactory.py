from typing import List

from app.services.PenaltyManager import PenaltyManager
from app.services.SchedulingConstraintRegistry import SchedulingConstraintRegistry
from app.services.SchedulingConstraint import SchedulingConstraintCategory

from .BaseConstraint import BaseConstraintValidator, WholeScheduleConstraintValidator
from .HardConstraints import (
    MissingDataConstraint,
    InvalidSchedulingConstraint,
    UnassignedRoomConstraint,
    RoomTypeMatchConstraint,
    WheelchairAccessibilityConstraint,
    RoomConflictConstraint,
    TeacherConflictConstraint,
    StudentGroupConflictConstraint,
)
from .SoftConstraints import (
    RoomCapacityConstraint,
    EctsPriorityConstraint,
    TeacherTimePreferenceConstraint,
    TeacherRoomPreferenceConstraint,
    TeacherScheduleCompactnessConstraint,
    TeacherConsecutiveMovementConstraint,
)


class ConstraintValidatorFactory:
    """
    Factory for creating constraint validator instances.
    Handles both system constraints and user preference constraints.
    """

    def __init__(self, penalty_manager: PenaltyManager, ects_threshold: float = 0.0):
        self.penalty_manager = penalty_manager
        self.ects_threshold = ects_threshold

    def create_gene_level_validators(self) -> List[BaseConstraintValidator]:
        """Create constraint validators that run on each gene."""
        return [
            # Hard constraints
            MissingDataConstraint(self.penalty_manager),
            InvalidSchedulingConstraint(self.penalty_manager),
            UnassignedRoomConstraint(self.penalty_manager),
            RoomTypeMatchConstraint(self.penalty_manager),
            WheelchairAccessibilityConstraint(self.penalty_manager),
            RoomConflictConstraint(self.penalty_manager),
            TeacherConflictConstraint(self.penalty_manager),
            StudentGroupConflictConstraint(self.penalty_manager),
            # Soft constraints
            RoomCapacityConstraint(self.penalty_manager),
            EctsPriorityConstraint(self.penalty_manager, self.ects_threshold),
        ]

    def create_whole_schedule_validators(self) -> List[WholeScheduleConstraintValidator]:
        """Create constraint validators that run on the entire schedule."""
        return [
            TeacherConsecutiveMovementConstraint(self.penalty_manager),
        ]

    def create_user_preference_validators(
        self, constraint_registry: SchedulingConstraintRegistry
    ) -> List[BaseConstraintValidator]:
        """Create validators from user preference constraints."""
        validators = []

        # Teacher time preferences
        time_constraints = constraint_registry.get_constraints_by_category(
            SchedulingConstraintCategory.TEACHER_TIME_PREFERENCE
        )
        for constraint in time_constraints:
            validators.append(TeacherTimePreferenceConstraint(self.penalty_manager, constraint))

        # Teacher room preferences
        room_constraints = constraint_registry.get_constraints_by_category(
            SchedulingConstraintCategory.TEACHER_ROOM_PREFERENCE
        )
        for constraint in room_constraints:
            validators.append(TeacherRoomPreferenceConstraint(self.penalty_manager, constraint))

        # Teacher schedule compactness
        compactness_constraints = constraint_registry.get_constraints_by_category(
            SchedulingConstraintCategory.TEACHER_SCHEDULE_COMPACTNESS
        )
        for constraint in compactness_constraints:
            validators.append(
                TeacherScheduleCompactnessConstraint(self.penalty_manager, constraint)
            )

        return validators

    def create_all_gene_validators(
        self, constraint_registry: SchedulingConstraintRegistry
    ) -> List[BaseConstraintValidator]:
        """Create all gene-level validators: system + user preferences."""
        validators = self.create_gene_level_validators()
        validators.extend(self.create_user_preference_validators(constraint_registry))
        return validators

    def create_all_schedule_validators(
        self, constraint_registry: SchedulingConstraintRegistry
    ) -> List[WholeScheduleConstraintValidator]:
        """Create all whole-schedule validators."""
        return self.create_whole_schedule_validators()
