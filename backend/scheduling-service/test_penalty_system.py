#!/usr/bin/env python3
"""
Test script to validate the penalty management system implementation.
Tests mathematical guarantees, constraint evaluation, and optimization.
"""

from app.services.PenaltyManager import PenaltyManager
from app.services.Fitness import ScheduleFitnessEvaluator
from app.services.PenaltyOptimizer import PenaltyOptimizer, OptimizationResult
from app.services.SchedulingConstraint import SchedulingConstraintCategory
from app.models import (
    Teacher,
    Classroom,
    StudentGroup,
    Course,
    Timeslot,
    Constraint,
    ScheduledItem,
)


def create_test_data():
    """Create sample data for testing."""

    # Create test timeslots
    timeslots = [
        Timeslot(
            timeslotId="1",
            code="0800_0900",
            label="08:00-09:00",
            startTime="08:00",
            endTime="09:00",
            order=1,
        ),
        Timeslot(
            timeslotId="2",
            code="0900_1000",
            label="09:00-10:00",
            startTime="09:00",
            endTime="10:00",
            order=2,
        ),
        Timeslot(
            timeslotId="3",
            code="1000_1100",
            label="10:00-11:00",
            startTime="10:00",
            endTime="11:00",
            order=3,
        ),
        Timeslot(
            timeslotId="4",
            code="1100_1200",
            label="11:00-12:00",
            startTime="11:00",
            endTime="12:00",
            order=4,
        ),
    ]

    # Create test teachers
    teachers = [
        Teacher(
            teacherId="T1",
            name="Dr. Smith",
            email="smith@edu",
            phone="123",
            department="CS",
            needsWheelchairAccessibleRoom=False,
        ),
        Teacher(
            teacherId="T2",
            name="Prof. Johnson",
            email="johnson@edu",
            phone="456",
            department="CS",
            needsWheelchairAccessibleRoom=True,
        ),
    ]

    # Create test rooms
    rooms = [
        Classroom(
            classroomId="R1",
            name="Room 101",
            capacity=30,
            type="LECTURE",
            buildingId="B1",
            floor=1,
            isWheelchairAccessible=True,
        ),
        Classroom(
            classroomId="R2",
            name="Room 102",
            capacity=20,
            type="LAB",
            buildingId="B1",
            floor=1,
            isWheelchairAccessible=False,
        ),
    ]

    # Create test student groups
    student_groups = [
        StudentGroup(
            studentGroupId="SG1",
            name="CS Year 1",
            size=25,
            department="CS",
            accessibilityRequirement=False,
        ),
        StudentGroup(
            studentGroupId="SG2",
            name="CS Year 2",
            size=35,
            department="CS",
            accessibilityRequirement=True,
        ),
    ]

    # Create test courses
    courses = [
        Course(
            courseId="C1",
            name="Programming 101",
            description="Intro to Programming",
            ectsCredits=6,
            department="CS",
            teacherId="T1",
            sessionType="LECTURE",
            sessionsPerWeek=2,
            studentGroupIds=["SG1"],
        ),
        Course(
            courseId="C2",
            name="Advanced Algorithms",
            description="Complex algorithms",
            ectsCredits=8,
            department="CS",
            teacherId="T2",
            sessionType="LECTURE",
            sessionsPerWeek=3,
            studentGroupIds=["SG2"],
        ),
    ]

    # Create test constraints
    constraints = [
        Constraint(
            constraintId="CONST1",
            constraintType="Teacher Time Preference",
            teacherId="T1",
            value={
                "preference": "PREFER",
                "days": ["MONDAY", "TUESDAY"],
                "timeslotCodes": ["0800_0900", "0900_1000"],
            },
            priority=7,
            category="TEACHER_PREFERENCE",
        ),
        Constraint(
            constraintId="CONST2",
            constraintType="Teacher Room Preference",
            teacherId="T2",
            value={"preference": "AVOID", "roomIds": ["R2"], "buildingIds": []},
            priority=5,
            category="TEACHER_PREFERENCE",
        ),
    ]

    return teachers, rooms, student_groups, courses, timeslots, constraints


def test_penalty_manager():
    """Test PenaltyManager functionality."""
    print("🧪 Testing PenaltyManager...")
    teachers, rooms, student_groups, courses, timeslots, constraints = (
        create_test_data()
    )

    pm = PenaltyManager(
        num_courses=len(courses),
        num_teachers=len(teachers),
        constraints=constraints,
    )

    # Test mathematical guarantees
    assert pm.validate_mathematical_guarantees(), "Mathematical guarantees should hold"
    print("✅ Mathematical guarantees validated")

    # Test penalty calculation
    hard_penalty = pm.get_penalty(SchedulingConstraintCategory.TEACHER_CONFLICT)
    soft_penalty = pm.get_penalty(
        SchedulingConstraintCategory.ROOM_CAPACITY_OVERFLOW, violation_count=5
    )

    assert (
        hard_penalty > soft_penalty
    ), "Hard penalties should be larger than soft penalties"
    print(f"✅ Hard penalty ({hard_penalty}) > Soft penalty ({soft_penalty})")

    # Test proportional penalty
    overflow_penalty_1 = pm.get_penalty(
        SchedulingConstraintCategory.ROOM_CAPACITY_OVERFLOW, violation_count=1
    )
    overflow_penalty_5 = pm.get_penalty(
        SchedulingConstraintCategory.ROOM_CAPACITY_OVERFLOW, violation_count=5
    )

    assert (
        overflow_penalty_5 > overflow_penalty_1
    ), "Proportional penalties should increase with violation count"
    print(
        f"✅ Proportional penalties work: 1 violation ({overflow_penalty_1}) < 5 violations ({overflow_penalty_5})"
    )

    # Test penalty bounds
    max_soft_total = sum(
        pm.get_penalty(cat, violation_count=10, severity_factor=5.0)
        for cat in [
            SchedulingConstraintCategory.ROOM_CAPACITY_OVERFLOW,
            SchedulingConstraintCategory.TEACHER_TIME_PREFERENCE,
            SchedulingConstraintCategory.TEACHER_ROOM_PREFERENCE,
            SchedulingConstraintCategory.TEACHER_CONSECUTIVE_MOVEMENT,
        ]
    )
    min_hard = pm.get_penalty(SchedulingConstraintCategory.TEACHER_CONFLICT)

    assert (
        min_hard > max_soft_total
    ), f"Hard constraint ({min_hard}) should dominate max soft total ({max_soft_total})"
    print(
        f"✅ Domination guaranteed: Min hard ({min_hard}) > Max soft total ({max_soft_total})"
    )

    print("✅ PenaltyManager tests passed!\n")


def test_fitness_evaluator():
    """Test ScheduleFitnessEvaluator functionality."""
    print("🧪 Testing ScheduleFitnessEvaluator...")

    teachers, rooms, student_groups, courses, timeslots, constraints = (
        create_test_data()
    )

    # Create fitness evaluator
    evaluator = ScheduleFitnessEvaluator(
        teachers=teachers,
        rooms=rooms,
        student_groups=student_groups,
        courses=courses,
        timeslots=timeslots,
        constraints=constraints,
        days=["MONDAY", "TUESDAY"],
    )

    # Test ECTS threshold calculation
    assert evaluator.ects_threshold > 0, "ECTS threshold should be calculated"
    print(f"✅ ECTS threshold calculated: {evaluator.ects_threshold}")

    # Create test schedule with violations
    test_schedule = [
        # This will cause room conflict
        ScheduledItem(
            courseId="C1",
            courseName="Programming 101",
            sessionType="LECTURE",
            teacherId="T1",
            studentGroupIds=["SG1"],
            classroomId="R1",
            timeslot="0800_0900",
            day="MONDAY",
        ),
        ScheduledItem(
            courseId="C2",
            courseName="Advanced Algorithms",
            sessionType="LECTURE",
            teacherId="T2",
            studentGroupIds=["SG2"],
            classroomId="R1",
            timeslot="0800_0900",
            day="MONDAY",  # Same room, same time = conflict
        ),
    ]

    # Evaluate schedule
    fitness_report = evaluator.evaluate(test_schedule)

    # Verify hard constraint violation detected
    assert fitness_report.total_hard_violations > 0, "Should detect room conflict"
    print(
        f"✅ Hard constraint violations detected: {fitness_report.total_hard_violations}"
    )

    # Verify soft constraint evaluation
    print(f"✅ Soft constraint penalty: {fitness_report.total_soft_penalty}")

    # Test that hard constraints dominate
    hard_component = (
        fitness_report.total_hard_violations
        * evaluator.penalty_manager.min_hard_penalty
    )
    soft_component = fitness_report.total_soft_penalty
    assert (
        hard_component > soft_component
    ), "Hard constraints should dominate in fitness calculation"
    print(
        f"✅ Domination in fitness: Hard component ({hard_component}) > Soft component ({soft_component})"
    )

    print("✅ ScheduleFitnessEvaluator tests passed!\n")


def test_penalty_optimizer():
    """Test PenaltyOptimizer functionality."""
    print("🧪 Testing PenaltyOptimizer...")

    teachers, rooms, student_groups, courses, timeslots, constraints = (
        create_test_data()
    )

    # Create fitness evaluator
    evaluator = ScheduleFitnessEvaluator(
        teachers=teachers,
        rooms=rooms,
        student_groups=student_groups,
        courses=courses,
        timeslots=timeslots,
        constraints=constraints,
        days=["MONDAY", "TUESDAY"],
    )

    # Create optimizer
    optimizer = PenaltyOptimizer(evaluator)

    # Test safety constraint validation
    safe_params = {
        "room_capacity_overflow_base": 10.0,
        "teacher_time_preference_base": 6.0,
        "teacher_room_preference_base": 4.0,
        "teacher_consecutive_movement_base": 8.0,
        "student_consecutive_movement_base": 4.0,
        "ects_priority_violation_base": 3.0,
        "schedule_compactness_base": 5.0,
    }

    unsafe_params = {
        "room_capacity_overflow_base": 10000.0,  # Too high - would violate safety
        "teacher_time_preference_base": 6.0,
        "teacher_room_preference_base": 4.0,
        "teacher_consecutive_movement_base": 8.0,
        "student_consecutive_movement_base": 4.0,
        "ects_priority_violation_base": 3.0,
        "schedule_compactness_base": 5.0,
    }

    assert optimizer._validate_safety_constraints(
        safe_params
    ), "Safe parameters should be valid"
    assert not optimizer._validate_safety_constraints(
        unsafe_params
    ), "Unsafe parameters should be invalid"
    print("✅ Safety constraint validation works")

    # Test optimization (adjust calls based on whether skopt is available)
    from app.services.PenaltyOptimizer import SKOPT_AVAILABLE

    n_calls = (
        15 if SKOPT_AVAILABLE else 5
    )  # skopt needs at least 11 calls for 7 dimensions
    result = optimizer.optimize_penalties(n_calls=n_calls)

    assert isinstance(result, OptimizationResult), "Should return OptimizationResult"
    assert optimizer.validate_optimization_result(
        result
    ), "Optimization result should be safe"
    print(f"✅ Optimization completed with score: {result.best_score}")

    print("✅ PenaltyOptimizer tests passed!\n")


def main():
    """Run all tests."""
    print("🚀 Starting Penalty System Tests\n")

    try:
        test_penalty_manager()
        test_fitness_evaluator()
        test_penalty_optimizer()

        print(
            "🎉 All tests passed! The penalty management system is working correctly."
        )

        # Display summary
        print("\n📊 System Summary:")
        pm = PenaltyManager(
            num_courses=len(courses),
            num_teachers=len(teachers),
            constraints=constraints,
        )
        print(f"- Hard constraint separation guarantee: {pm.min_hard_penalty}")
        print(f"- Soft constraint maximum: {pm.max_soft_penalty}")
        print(
            f"- Mathematical guarantees: {'✅ Valid' if pm.validate_mathematical_guarantees() else '❌ Invalid'}"
        )

    except Exception as e:
        print(f"❌ Test failed: {e}")
        raise


if __name__ == "__main__":
    main()
