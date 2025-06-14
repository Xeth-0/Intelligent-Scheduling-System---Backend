from typing import Dict, List, Optional
from app.models.constraint import Constraint
from app.services.SchedulingConstraint import SchedulingConstraintCategory


class SchedulingConstraintRegistry:
    """
    Central registry for organizing and providing efficient access to validated constraints.

    Takes a list of validated Constraint objects and organizes them into efficient
    lookup structures for use during fitness evaluation.

    Responsibilities:
    - Organize constraints by teacher, category, and type
    - Provide efficient access methods for constraint filtering
    - Track constraint statistics for debugging and monitoring
    """

    def __init__(self, constraints: List[Constraint]):
        self.constraints = constraints

        # Efficient lookup structures
        self.teacher_constraints: Dict[str, List[Constraint]] = {}
        self.campus_constraints: List[Constraint] = []
        self.hard_constraints: List[Constraint] = []
        self.soft_constraints: List[Constraint] = []
        self.constraints_by_category: Dict[SchedulingConstraintCategory, List[Constraint]] = {}

        # Statistics
        self.valid_constraints_count = 0
        self.invalid_constraints_count = 0

        # Organize constraints for efficient access
        self._organize_constraints()

    def _organize_constraints(self):
        """Organize validated constraints into efficient lookup structures."""
        for constraint in self.constraints:
            # Skip constraints that couldn't be properly mapped
            if not constraint.constraintCategory:
                self.invalid_constraints_count += 1
                print(
                    f"Warning: Skipping constraint {constraint.constraintId} - unknown type: {constraint.constraintType}"
                )
                continue

            self.valid_constraints_count += 1

            # Organize by teacher vs campus
            if constraint.teacherId:
                if constraint.teacherId not in self.teacher_constraints:
                    self.teacher_constraints[constraint.teacherId] = []
                self.teacher_constraints[constraint.teacherId].append(constraint)
            else:
                self.campus_constraints.append(constraint)

            # Organize by hard vs soft
            if constraint.constraintCategory.is_hard_constraint:
                self.hard_constraints.append(constraint)
            else:
                self.soft_constraints.append(constraint)

            # Organize by category
            if constraint.constraintCategory not in self.constraints_by_category:
                self.constraints_by_category[constraint.constraintCategory] = []
            self.constraints_by_category[constraint.constraintCategory].append(constraint)

    # === Efficient Access Methods ===

    def get_teacher_constraints(self, teacher_id: str) -> List[Constraint]:
        """Get all constraints for a specific teacher."""
        return self.teacher_constraints.get(teacher_id, [])

    def get_teacher_constraints_by_category(
        self, teacher_id: str, category: SchedulingConstraintCategory
    ) -> List[Constraint]:
        """Get teacher constraints of a specific category."""
        teacher_constraints = self.get_teacher_constraints(teacher_id)
        return [c for c in teacher_constraints if c.constraintCategory == category]

    def get_constraints_by_category(
        self, category: SchedulingConstraintCategory
    ) -> List[Constraint]:
        """Get all constraints of a specific category."""
        return self.constraints_by_category.get(category, [])

    def get_soft_constraints(self) -> List[Constraint]:
        """Get all soft constraints."""
        return self.soft_constraints

    def get_hard_constraints(self) -> List[Constraint]:
        """Get all hard constraints."""
        return self.hard_constraints

    def get_campus_constraints(self) -> List[Constraint]:
        """Get all campus-wide constraints."""
        return self.campus_constraints

    # === Query Methods ===

    def has_constraint_category(self, category: SchedulingConstraintCategory) -> bool:
        """Check if any constraints of this category exist."""
        return category in self.constraints_by_category

    def has_teacher_constraints(self, teacher_id: str) -> bool:
        """Check if a teacher has any constraints."""
        return teacher_id in self.teacher_constraints

    def get_teacher_count_with_constraints(self) -> int:
        """Get count of teachers that have constraints."""
        return len(self.teacher_constraints)

    # === Statistics and Debugging ===

    def get_constraint_summary(self) -> Dict:
        """Get summary of processed constraints for debugging."""
        return {
            "total_constraints": len(self.constraints),
            "valid_constraints": self.valid_constraints_count,
            "invalid_constraints": self.invalid_constraints_count,
            "teacher_constraints_count": len([c for c in self.constraints if c.teacherId]),
            "campus_constraints_count": len(self.campus_constraints),
            "hard_constraints_count": len(self.hard_constraints),
            "soft_constraints_count": len(self.soft_constraints),
            "teachers_with_constraints": len(self.teacher_constraints),
            "constraints_by_category": {
                cat.value: len(constraints)
                for cat, constraints in self.constraints_by_category.items()
            },
        }

    def print_summary(self):
        """Print constraint registry summary for debugging."""
        summary = self.get_constraint_summary()
        print("=== Constraint Registry Summary ===")
        print(f"Total constraints: {summary['total_constraints']}")
        print(f"Valid constraints: {summary['valid_constraints']}")
        print(f"Invalid constraints: {summary['invalid_constraints']}")
        print(f"Teacher constraints: {summary['teacher_constraints_count']}")
        print(f"Campus constraints: {summary['campus_constraints_count']}")
        print(f"Hard constraints: {summary['hard_constraints_count']}")
        print(f"Soft constraints: {summary['soft_constraints_count']}")
        print(f"Teachers with constraints: {summary['teachers_with_constraints']}")
        print("Constraints by category:")
        for category, count in summary["constraints_by_category"].items():
            print(f"  {category}: {count}")
        print("===================================")
