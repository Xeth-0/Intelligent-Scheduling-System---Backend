import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, validator
from app.services.SchedulingConstraint import (
    SchedulingConstraintCategory, 
    ConstraintTypeMapper, 
    ConstraintValidator
)


class Constraint(BaseModel):
    """
    Represents a validated constraint in the scheduling system.
    
    Constraints can be either teacher-specific or campus-wide.
    They define rules that must be followed (hard) or preferred (soft) during scheduling.
    """
    constraintId: str = Field(..., description="Unique identifier for the constraint")
    constraintType: str = Field(..., description="TypeScript constraint type name from frontend")
    teacherId: Optional[str] = Field(
        default=None,
        description="Teacher ID if this is a teacher-specific constraint, None for campus constraints",
    )
    value: Dict[str, Any] = Field(..., description="Constraint parameters and values")
    priority: float = Field(
        ..., description="Priority weight for this constraint", ge=0.0, le=10.0
    )
    category: str = Field(..., description="Raw category string from frontend")
    
    # Computed fields after validation
    constraintCategory: Optional[SchedulingConstraintCategory] = None

    @validator('constraintCategory', pre=True, always=True)
    def map_constraint_category(cls, v, values):
        """Map TypeScript constraint type to Python constraint category."""
        constraint_type = values.get('constraintType')
        if not constraint_type:
            return None
            
        try:
            return ConstraintTypeMapper.map_constraint_type(constraint_type)
        except ValueError as e:
            # Log warning but don't fail validation - let it be handled later
            logging.warning(f"Failed to map constraint type: {e}")
            return None

    @validator("value")
    def validate_constraint_value(cls, v, values):
        """
        Validates constraint value based on constraint type.
        
        Uses the centralized constraint validation system.
        """
        constraint_type = values.get("constraintType")
        
        # Only validate if we can map the constraint type
        try:
            category = ConstraintTypeMapper.map_constraint_type(constraint_type)
            return ConstraintValidator.validate_constraint_value(category, v)
        except (ValueError, KeyError):
            # If we can't map or validate, return as-is
            # This allows for graceful handling of unknown constraint types
            return v
    
    @property
    def is_hard_constraint(self) -> bool:
        """Check if this constraint is a hard constraint."""
        if self.constraintCategory:
            return self.constraintCategory.is_hard_constraint
        return False
    
    @property
    def is_teacher_constraint(self) -> bool:
        """Check if this constraint is teacher-specific."""
        return self.teacherId is not None
