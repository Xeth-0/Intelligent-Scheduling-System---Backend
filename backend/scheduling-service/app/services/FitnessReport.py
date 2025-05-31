from dataclasses import dataclass
from typing import Dict, List, Optional

from app.models.models import ScheduledItem
from app.services.constraint import ConstraintCategory, ConstraintType


@dataclass
class ConstraintViolation:
    """Represents a specific constraint violation with detailed information."""

    constraint_category: ConstraintCategory
    constraint_type: ConstraintType
    severity: float  # How severe this violation is (for soft constraints, this could be the penalty)
    scheduled_item: ScheduledItem
    description: str
    conflicting_item: Optional[ScheduledItem] = None  # For conflicts with other items

    def __str__(self) -> str:
        base = f"{self.constraint_category.value}: {self.description}"
        if self.conflicting_item:
            base += f" (conflicts with {self.conflicting_item.courseName})"
        return base


@dataclass
class FitnessReport:
    """Comprehensive fitness evaluation results."""

    # Quantitative metrics
    total_hard_violations: int
    total_soft_penalty: float
    hard_constraint_scores: Dict[
        ConstraintCategory, int
    ]  # Count of violations per category
    soft_constraint_scores: Dict[ConstraintCategory, float]  # Penalty per category

    # Qualitative feedback
    violations: List[ConstraintViolation]
    violation_summary: Dict[ConstraintCategory, List[ConstraintViolation]]

    # Overall metrics
    is_feasible: bool  # True if no hard constraint violations
    fitness_vector: List[
        float
    ]  # [hard_violations, soft_penalty, category1, category2, ...]
    evaluation_time: float

    def get_violation_count_by_category(self, category: ConstraintCategory) -> int:
        """Get count of violations for a specific category."""
        return len(self.violation_summary.get(category, []))

    def get_violations_by_type(
        self, constraint_type: ConstraintType
    ) -> List[ConstraintViolation]:
        """Get all violations of a specific type (hard/soft)."""
        return [v for v in self.violations if v.constraint_type == constraint_type]

    def print_detailed_report(self, show_violations: bool = True) -> None:
        """Print a human-readable detailed report."""
        print(f"\n=== SCHEDULE FITNESS REPORT ===")
        print(f"Feasible: {'✓' if self.is_feasible else '✗'}")
        print(f"Hard Violations: {self.total_hard_violations}")
        print(f"Soft Penalty: {self.total_soft_penalty:.2f}")
        print(f"Evaluation Time: {self.evaluation_time:.4f}s")

        if self.hard_constraint_scores:
            print(f"\nHard Constraint Breakdown:")
            for category, count in self.hard_constraint_scores.items():
                if count > 0:
                    print(f"  {category.value}: {count} violations")

        if self.soft_constraint_scores:
            print(f"\nSoft Constraint Breakdown:")
            for category, penalty in self.soft_constraint_scores.items():
                if penalty > 0:
                    print(f"  {category.value}: {penalty:.2f} penalty")

        if show_violations and self.violations:
            print(f"\nDetailed Violations ({len(self.violations)} total):")
            for i, violation in enumerate(self.violations[:10]):  # Show first 10
                print(f"  {i+1}. {violation}")
            if len(self.violations) > 10:
                print(f"  ... and {len(self.violations) - 10} more violations")
