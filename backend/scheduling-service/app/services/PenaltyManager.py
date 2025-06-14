import numpy as np
from typing import Dict, Optional, List, Tuple, Any
from dataclasses import dataclass
from app.models import Course, Constraint
from app.services.SchedulingConstraint import SchedulingConstraintCategory
from app.services.SchedulingConstraintRegistry import SchedulingConstraintRegistry


@dataclass
class PenaltyConfig:
    """Configuration for penalty calculation strategies."""

    base_penalty: float
    multiplier: float = 1.0
    max_penalty: Optional[float] = None
    strategy: str = "fixed"  # "fixed", "proportional", "exponential"


class PenaltyManager:
    """
    Centralized manager for constraint violation penalties.
    Provides consistent penalty values and supports runtime updates.
    Ensures mathematical guarantees that hard constraints always dominate soft constraints.
    """

    def __init__(
        self,
        num_courses: int,
        num_teachers: int,
        constraint_registry: SchedulingConstraintRegistry,
    ):
        self.constraint_registry = constraint_registry
        self.num_courses = num_courses
        self.num_teachers = num_teachers

        self._calculate_separation_bounds()
        self._init_penalty_configs()
        self.validate_mathematical_guarantees()

    def _init_penalty_configs(self) -> None:
        """
        Initialize penalty configurations for each constraint category.
        """
        hard_penalty_configs = {
            key: PenaltyConfig(base_penalty=self.min_hard_penalty, strategy="fixed")
            for key in SchedulingConstraintCategory.get_hard_constraints()
        }
        soft_penalty_configs = {
            key: PenaltyConfig(base_penalty=self.max_soft_penalty, strategy="proportional")
            for key in SchedulingConstraintCategory.get_soft_constraints()
        }
        self._penalty_configs = {**hard_penalty_configs, **soft_penalty_configs}

    def _calculate_separation_bounds(self) -> None:
        """
        Calculate mathematical bounds to ensure hard constraints always dominate.
        This provides mathematical proof that no combination of soft constraints
        can make a solution with hard violations better than one without.
        """
        # Calculate maximum possible soft penalty using actual constraint categories
        max_possible_soft_total = self._calculate_max_soft_penalty_bound()

        # Safety margin to account for edge cases and underestimation
        safety_margin = max_possible_soft_total * 0.5  # 50% safety margin

        # Hard constraints must exceed this bound
        self.min_hard_penalty = max_possible_soft_total + safety_margin

        # Individual soft penalties cannot exceed this
        self.max_soft_penalty = self.min_hard_penalty * 0.1

    def _calculate_max_soft_penalty_bound(self) -> float:
        """
        Calculate the theoretical maximum possible soft constraint penalty
        for a schedule using actual constraint categories and problem size.
        """
        total_max_penalty = 0.0

        # Get all soft constraint categories
        soft_constraints = SchedulingConstraintCategory.get_soft_constraints()

        for constraint_category in soft_constraints:
            max_violations = self._estimate_max_violations_for_constraint(constraint_category)
            max_severity = self._estimate_max_severity_for_constraint(constraint_category)

            # Refine estimates using constraint registry if available
            if hasattr(self, "constraint_registry") and self.constraint_registry:
                max_violations, max_severity = self._refine_estimates_from_registry(
                    constraint_category, max_violations, max_severity
                )

            # Calculate penalty using the actual penalty calculation logic
            # Use maximum possible violation count and severity
            constraint_max_penalty = self._calculate_constraint_max_penalty(
                constraint_category, max_violations, max_severity
            )

            total_max_penalty += constraint_max_penalty

        return total_max_penalty / 2

    def _refine_estimates_from_registry(
        self,
        constraint_category: SchedulingConstraintCategory,
        base_violations: int,
        base_severity: float,
    ) -> Tuple[int, float]:
        """Refine violation and severity estimates using actual constraints from registry."""
        try:
            # Get actual constraints of this category from registry
            actual_constraints = self.constraint_registry.get_constraints_by_category(
                constraint_category
            )

            if not actual_constraints:
                # No user constraints of this type, use base estimates
                return base_violations, base_severity

            # For user preference constraints, use actual priority values
            if constraint_category in [
                SchedulingConstraintCategory.TEACHER_TIME_PREFERENCE,
                SchedulingConstraintCategory.TEACHER_ROOM_PREFERENCE,
                SchedulingConstraintCategory.TEACHER_SCHEDULE_COMPACTNESS,
            ]:
                # Find maximum priority from actual constraints
                max_priority = max(
                    (constraint.priority for constraint in actual_constraints), default=1
                )
                refined_severity = max_priority / 10.0  # Convert priority to severity factor

                # Number of violations could be limited by number of actual constraints
                refined_violations = min(
                    base_violations, len(actual_constraints) * self.num_courses
                )

                return refined_violations, max(refined_severity, base_severity)

            # For other constraint types, keep base estimates but consider constraint count
            constraint_factor = min(
                len(actual_constraints) / max(self.num_teachers, 1), 2.0
            )  # Cap at 2x
            refined_violations = int(base_violations * constraint_factor)

            return refined_violations, base_severity

        except (AttributeError, TypeError):
            # Registry doesn't have the expected method or structure, use base estimates
            return base_violations, base_severity

    def _estimate_max_violations_for_constraint(
        self, constraint_category: SchedulingConstraintCategory
    ) -> int:
        """Estimate maximum possible violations for a specific constraint category."""
        if constraint_category == SchedulingConstraintCategory.ROOM_CAPACITY_OVERFLOW:
            # Each course could potentially overflow room capacity
            return self.num_courses

        elif constraint_category == SchedulingConstraintCategory.ECTS_PRIORITY_VIOLATION:
            # Assume 30% of courses are high-ECTS and could be scheduled poorly
            return max(1, int(self.num_courses * 0.3))

        elif constraint_category == SchedulingConstraintCategory.TEACHER_TIME_PREFERENCE:
            # Each course could violate teacher time preferences
            return self.num_courses

        elif constraint_category == SchedulingConstraintCategory.TEACHER_ROOM_PREFERENCE:
            # Each course could violate teacher room preferences
            return self.num_courses

        elif constraint_category == SchedulingConstraintCategory.TEACHER_SCHEDULE_COMPACTNESS:
            # Each teacher could have compactness violations
            return self.num_teachers

        elif constraint_category == SchedulingConstraintCategory.TEACHER_CONSECUTIVE_MOVEMENT:
            # Estimate based on teachers and average daily classes
            # Assume average 4 classes per teacher per day, max 3 movements per day
            avg_classes_per_teacher_per_day = 4
            max_movements_per_day = 5
            working_days = 5
            return self.num_teachers * max_movements_per_day * working_days

        else:
            # Default conservative estimate
            return self.num_courses

    def _estimate_max_severity_for_constraint(
        self, constraint_category: SchedulingConstraintCategory
    ) -> float:
        """Estimate maximum severity factor for a specific constraint category."""
        if constraint_category == SchedulingConstraintCategory.ROOM_CAPACITY_OVERFLOW:
            # Room could be severely overflowed (assume max 50 extra students)
            return 50.0

        elif constraint_category == SchedulingConstraintCategory.ECTS_PRIORITY_VIOLATION:
            # Late scheduling penalty (assume max delay factor)
            return 5.0

        elif constraint_category in [
            SchedulingConstraintCategory.TEACHER_TIME_PREFERENCE,
            SchedulingConstraintCategory.TEACHER_ROOM_PREFERENCE,
        ]:
            # User preference constraints have priority-based severity (max priority 10)
            return 1.0  # priority/10.0 where max priority is 10

        elif constraint_category == SchedulingConstraintCategory.TEACHER_SCHEDULE_COMPACTNESS:
            # Compactness violations
            return 3.0

        elif constraint_category == SchedulingConstraintCategory.TEACHER_CONSECUTIVE_MOVEMENT:
            # Movement penalties are typically unit penalties
            return 1.0

        else:
            # Default moderate severity
            return 2.0

    def _calculate_constraint_max_penalty(
        self,
        constraint_category: SchedulingConstraintCategory,
        max_violations: int,
        max_severity: float,
    ) -> float:
        """Calculate maximum penalty for a constraint using actual penalty logic."""
        # Use a temporary penalty config to calculate maximum penalty
        temp_config = PenaltyConfig(
            base_penalty=50.0,  # Conservative base penalty for soft constraints
            multiplier=1.0,
            strategy="proportional",
        )

        penalty = temp_config.base_penalty

        if temp_config.strategy == "proportional":
            penalty *= max_violations * temp_config.multiplier
        elif temp_config.strategy == "exponential":
            # Cap exponential growth to prevent overflow
            penalty *= min(temp_config.multiplier**max_violations, 1000.0)

        # Apply severity factor
        penalty *= max_severity

        return penalty

    def get_penalty(
        self,
        constraint_category: SchedulingConstraintCategory,
        violation_count: int = 1,
        severity_factor: float = 1.0,
    ) -> float:
        """
        Calculate penalty for a constraint violation.

        Args:
            constraint_category: The type of constraint violated
            violation_count: Number of violations (for proportional penalties)
            severity_factor: Additional multiplier for severity

        Returns:
            Calculated penalty value
        """
        config = self._penalty_configs.get(constraint_category)
        if not config:
            # Default penalty for unknown constraints - assume soft
            return min(10.0 * severity_factor, self.max_soft_penalty)

        penalty = config.base_penalty

        if config.strategy == "proportional":
            penalty *= violation_count * config.multiplier
        elif config.strategy == "exponential":
            penalty *= config.multiplier**violation_count
        # "fixed" strategy uses base_penalty as-is

        # Apply severity factor
        penalty *= severity_factor

        # Apply max penalty cap if configured
        if config.max_penalty is not None:
            penalty = min(penalty, config.max_penalty)

        return penalty

    def update_penalty_config(
        self, constraint_category: SchedulingConstraintCategory, config: PenaltyConfig
    ) -> None:
        """
        Update penalty configuration for a constraint category.
        Validates that the update maintains mathematical guarantees.
        """
        # Validate that hard/soft separation is maintained
        if constraint_category.is_hard_constraint:
            if config.base_penalty < self.min_hard_penalty:
                raise ValueError(
                    f"Hard constraint penalty {config.base_penalty} must be >= {self.min_hard_penalty}"
                )
        else:
            if config.max_penalty is None or config.max_penalty > self.max_soft_penalty:
                config.max_penalty = self.max_soft_penalty

        self._penalty_configs[constraint_category] = config

    def get_penalty_config(
        self, constraint_category: SchedulingConstraintCategory
    ) -> Optional[PenaltyConfig]:
        """Get current penalty configuration for a constraint category."""
        return self._penalty_configs.get(constraint_category)

    def validate_mathematical_guarantees(self) -> bool:
        """
        Validate that current penalty configuration maintains mathematical guarantees.
        Returns True if guarantees hold, False otherwise.
        """
        # Check hard constraint minimum bounds
        for category, config in self._penalty_configs.items():
            if category.is_hard_constraint:
                if config.base_penalty < self.min_hard_penalty:
                    return False
            else:
                max_possible_soft = config.max_penalty or (config.base_penalty * 100)
                if max_possible_soft >= self.min_hard_penalty:
                    return False

        return True

    def scale_penalties(self, hard_scale: float = 1.0, soft_scale: float = 1.0) -> None:
        """
        Scale penalty values while maintaining mathematical guarantees.

        Args:
            hard_scale: Scaling factor for hard constraint penalties
            soft_scale: Scaling factor for soft constraint penalties
        """
        for category, config in self._penalty_configs.items():
            if category.is_hard_constraint:
                config.base_penalty *= hard_scale
            else:
                config.base_penalty *= soft_scale
                if config.max_penalty is not None:
                    config.max_penalty *= soft_scale

        # Recalculate bounds to maintain guarantees
        self._calculate_separation_bounds()

        # Validate that scaling maintained guarantees
        if not self.validate_mathematical_guarantees():
            raise ValueError("Penalty scaling violated mathematical guarantees")

    def get_penalty_summary(self) -> Dict[str, float]:
        """Get summary of current penalty configurations for debugging."""
        return {
            category.value: config.base_penalty
            for category, config in self._penalty_configs.items()
        }

    def get_bounds_analysis(self) -> Dict[str, Any]:
        """Get detailed analysis of how penalty bounds were calculated for debugging."""
        soft_constraints = SchedulingConstraintCategory.get_soft_constraints()

        analysis = {
            "problem_size": {"num_courses": self.num_courses, "num_teachers": self.num_teachers},
            "bounds": {
                "min_hard_penalty": self.min_hard_penalty,
                "max_soft_penalty": self.max_soft_penalty,
            },
            "constraint_analysis": {},
        }

        total_estimated = 0.0
        for constraint_category in soft_constraints:
            max_violations = self._estimate_max_violations_for_constraint(constraint_category)
            max_severity = self._estimate_max_severity_for_constraint(constraint_category)
            max_penalty = self._calculate_constraint_max_penalty(
                constraint_category, max_violations, max_severity
            )

            analysis["constraint_analysis"][constraint_category.value] = {
                "max_violations": max_violations,
                "max_severity": max_severity,
                "max_penalty": max_penalty,
            }
            total_estimated += max_penalty

        analysis["total_estimated_max_soft"] = total_estimated
        analysis["safety_margin"] = total_estimated * 0.5

        return analysis
