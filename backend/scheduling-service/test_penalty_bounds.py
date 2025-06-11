"""
Test script to demonstrate improved penalty bounds calculation.
Shows how the new system calculates maximum possible soft constraint penalties
using actual constraint categories and problem size instead of hardcoded estimates.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.PenaltyManager import PenaltyManager
from app.services.SchedulingConstraintRegistry import SchedulingConstraintRegistry

def test_penalty_bounds_calculation():
    """Test the improved penalty bounds calculation."""
    
    # Create a sample constraint registry (empty for this test)
    constraint_registry = SchedulingConstraintRegistry(constraints=[])
    
    # Test with different problem sizes
    test_scenarios = [
        {"num_courses": 50, "num_teachers": 10, "name": "Small University"},
        {"num_courses": 200, "num_teachers": 40, "name": "Medium University"}, 
        {"num_courses": 500, "num_teachers": 80, "name": "Large University"}
    ]
    
    print("=== Penalty Bounds Analysis ===\n")
    
    for scenario in test_scenarios:
        print(f"--- {scenario['name']} ---")
        print(f"Courses: {scenario['num_courses']}, Teachers: {scenario['num_teachers']}")
        
        # Create penalty manager
        penalty_manager = PenaltyManager(
            num_courses=scenario['num_courses'],
            num_teachers=scenario['num_teachers'],
            constraint_registry=constraint_registry
        )
        
        # Get detailed analysis
        analysis = penalty_manager.get_bounds_analysis()
        
        print(f"Min Hard Penalty: {analysis['bounds']['min_hard_penalty']:,.2f}")
        print(f"Max Soft Penalty: {analysis['bounds']['max_soft_penalty']:,.2f}")
        print(f"Total Estimated Max Soft: {analysis['total_estimated_max_soft']:,.2f}")
        print(f"Safety Margin: {analysis['safety_margin']:,.2f}")
        
        print("\nConstraint-by-constraint breakdown:")
        for constraint_name, details in analysis['constraint_analysis'].items():
            print(f"  {constraint_name}:")
            print(f"    Max Violations: {details['max_violations']}")
            print(f"    Max Severity: {details['max_severity']}")
            print(f"    Max Penalty: {details['max_penalty']:,.2f}")
        
        print("\n" + "="*50 + "\n")

def test_penalty_calculation_accuracy():
    """Test penalty calculation for specific constraints."""
    
    constraint_registry = SchedulingConstraintRegistry(constraints=[])
    penalty_manager = PenaltyManager(
        num_courses=100,
        num_teachers=20,
        constraint_registry=constraint_registry
    )
    
    print("=== Penalty Calculation Examples ===\n")
    
    from app.services.SchedulingConstraint import SchedulingConstraintCategory
    
    # Test different constraint types
    test_cases = [
        {
            "category": SchedulingConstraintCategory.ROOM_CAPACITY_OVERFLOW,
            "violation_count": 10,  # 10 extra students
            "severity_factor": 1.0
        },
        {
            "category": SchedulingConstraintCategory.TEACHER_TIME_PREFERENCE,
            "violation_count": 1,
            "severity_factor": 0.8  # Priority 8 / 10
        },
        {
            "category": SchedulingConstraintCategory.TEACHER_CONSECUTIVE_MOVEMENT,
            "violation_count": 3,  # 3 movements in a day
            "severity_factor": 1.0
        }
    ]
    
    for case in test_cases:
        penalty = penalty_manager.get_penalty(
            case["category"],
            violation_count=case["violation_count"],
            severity_factor=case["severity_factor"]
        )
        
        print(f"Constraint: {case['category'].value}")
        print(f"Violations: {case['violation_count']}, Severity: {case['severity_factor']}")
        print(f"Calculated Penalty: {penalty:.2f}")
        print()

if __name__ == "__main__":
    test_penalty_bounds_calculation()
    test_penalty_calculation_accuracy() 