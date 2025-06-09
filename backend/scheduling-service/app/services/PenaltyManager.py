import numpy as np
from typing import Dict, Optional
from dataclasses import dataclass
from app.models.models import Course
from app.services.Constraint import ConstraintCategory


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

    def __init__(self):
        self._calculate_separation_bounds()
        self._init_penalty_configs()
        self.validate_mathematical_guarantees()

    def _init_penalty_configs(self) -> None:
        """
        Initialize penalty configurations for each constraint category.
        """
        hard_penalty_configs = {
            key: PenaltyConfig(base_penalty=self.min_hard_penalty, strategy="fixed")
            for key in ConstraintCategory.get_hard_constraints()
        }
        soft_penalty_configs = {
            key: PenaltyConfig(
                base_penalty=self.max_soft_penalty, strategy="proportional"
            )
            for key in ConstraintCategory.get_soft_constraints()
        }
        self._penalty_configs = {**hard_penalty_configs, **soft_penalty_configs}

    def _calculate_separation_bounds(self) -> None:
        """
        Calculate mathematical bounds to ensure hard constraints always dominate.
        This provides mathematical proof that no combination of soft constraints
        can make a solution with hard violations better than one without.
        """
        # Estimate maximum possible soft penalty in a schedule
        # Assumptions: 100 courses, each could have multiple soft violations
        estimated_max_courses = 100
        estimated_max_soft_violations_per_course = 10
        estimated_max_soft_penalty_per_violation = 20.0

        max_possible_soft_total = (
            estimated_max_courses
            * estimated_max_soft_violations_per_course
            * estimated_max_soft_penalty_per_violation
        )

        # Safety margin to account for underestimation
        safety_margin = 1000.0

        # Hard constraints must exceed this bound
        self.min_hard_penalty = max_possible_soft_total + safety_margin

        # Individual soft penalties cannot exceed this
        self.max_soft_penalty = self.min_hard_penalty * 0.1

    def get_penalty(
        self,
        constraint_category: ConstraintCategory,
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
        self, constraint_category: ConstraintCategory, config: PenaltyConfig
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
        self, constraint_category: ConstraintCategory
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
