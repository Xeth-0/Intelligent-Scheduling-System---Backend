"""
Simple GA test with minimal data to demonstrate improvements
"""
import sys
import time
sys.path.append('app')

from app.models import Course, Teacher, Classroom, StudentGroup, Timeslot, Constraint
from app.services.GeneticScheduler import GeneticScheduler

def create_simple_test_data():
    """Create simple test data with all required fields"""
    
    # Simple timeslots
    timeslots = [
        Timeslot(timeslotId="TS1", code="08:00-09:00", label="Period 1", startTime="08:00", endTime="09:00", order=1),
        Timeslot(timeslotId="TS2", code="09:00-10:00", label="Period 2", startTime="09:00", endTime="10:00", order=2),
        Timeslot(timeslotId="TS3", code="10:00-11:00", label="Period 3", startTime="10:00", endTime="11:00", order=3),
        Timeslot(timeslotId="TS4", code="11:00-12:00", label="Period 4", startTime="11:00", endTime="12:00", order=4),
    ]
    
    # Simple classrooms
    classrooms = [
        Classroom(classroomId="R101", name="Room 101", capacity=30, type="LECTURE", buildingId="B1", floor=1, isWheelchairAccessible=True),
        Classroom(classroomId="R102", name="Room 102", capacity=25, type="LAB", buildingId="B1", floor=1, isWheelchairAccessible=True),
        Classroom(classroomId="R201", name="Room 201", capacity=40, type="LECTURE", buildingId="B1", floor=2, isWheelchairAccessible=False),
    ]
    
    # Simple teachers
    teachers = [
        Teacher(teacherId="T1", name="Dr. Smith", email="smith@edu.com", phone="123-456-7890", department="CS"),
        Teacher(teacherId="T2", name="Prof. Jones", email="jones@edu.com", phone="123-456-7891", department="CS"),
    ]
    
    # Simple student groups
    student_groups = [
        StudentGroup(studentGroupId="CS1", name="CS Group 1", size=25, department="CS"),
        StudentGroup(studentGroupId="CS2", name="CS Group 2", size=20, department="CS"),
    ]
    
    # Simple courses
    courses = [
        Course(courseId="C1", name="Math", teacherId="T1", sessionType="LECTURE", studentGroupIds=["CS1"], 
               description="Basic Math", ectsCredits=3, department="CS", sessionsPerWeek=2),
        Course(courseId="C2", name="Physics", teacherId="T2", sessionType="LECTURE", studentGroupIds=["CS2"],
               description="Basic Physics", ectsCredits=3, department="CS", sessionsPerWeek=2),
        Course(courseId="C3", name="Lab", teacherId="T1", sessionType="LAB", studentGroupIds=["CS1"],
               description="Lab Work", ectsCredits=2, department="CS", sessionsPerWeek=1),
        Course(courseId="C4", name="Programming", teacherId="T2", sessionType="LAB", studentGroupIds=["CS2"],
               description="Programming Lab", ectsCredits=2, department="CS", sessionsPerWeek=1),
    ]
    
    # Simple constraints (using correct field names)
    constraints = [
        Constraint(constraintId="CT1", constraintType="TEACHER_AVAILABILITY", teacherId=None,
                  value={"days": ["Monday"], "timeslots": ["08:00-09:00"]}, priority=10.0, category="TEACHER_CONSTRAINTS"),
        Constraint(constraintId="CT2", constraintType="ROOM_CAPACITY", teacherId=None,
                  value={"minCapacity": 20}, priority=10.0, category="ROOM_CONSTRAINTS"),
    ]
    
    return timeslots, classrooms, teachers, student_groups, courses, constraints

def test_ga_improvements():
    """Test the GA improvements with simple data"""
    print("Creating simple test data...")
    timeslots, classrooms, teachers, student_groups, courses, constraints = create_simple_test_data()
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    
    print(f"Problem: {len(courses)} courses, {len(classrooms)} rooms, {len(teachers)} teachers")
    
    # Test 1: Original approach (disable adaptive features)
    print("\n=== ORIGINAL GA (Adaptive Features OFF) ===")
    original_scheduler = GeneticScheduler(
        courses=courses, teachers=teachers, rooms=classrooms, student_groups=student_groups,
        timeslots=timeslots, days=days, constraints=constraints,
        population_size=20, gene_mutation_rate=0.1, chromosome_mutation_rate=0.2
    )
    
    # Disable adaptive features for baseline comparison
    original_scheduler.heuristic_mutation_probability = 0.0  # Pure random mutation only
    
    start_time = time.time()
    solution1, fitness1, report1 = original_scheduler.run(generations=200)
    duration1 = time.time() - start_time
    
    print(f"Results:")
    print(f"  Final Fitness: {fitness1:.2f}")
    print(f"  Hard Violations: {report1.total_hard_violations if report1 else 'N/A'}")
    print(f"  Soft Penalty: {report1.total_soft_penalty if report1 else 'N/A'}")
    print(f"  Duration: {duration1:.2f}s")
    
    # Test 2: Enhanced approach (all adaptive features enabled)
    print("\n=== ENHANCED GA (Adaptive Features ON) ===")
    enhanced_scheduler = GeneticScheduler(
        courses=courses, teachers=teachers, rooms=classrooms, student_groups=student_groups,
        timeslots=timeslots, days=days, constraints=constraints,
        population_size=20, gene_mutation_rate=0.1, chromosome_mutation_rate=0.2
    )
    
    start_time = time.time()
    solution2, fitness2, report2 = enhanced_scheduler.run(generations=200)
    duration2 = time.time() - start_time
    
    print(f"Results:")
    print(f"  Final Fitness: {fitness2:.2f}")
    print(f"  Hard Violations: {report2.total_hard_violations if report2 else 'N/A'}")
    print(f"  Soft Penalty: {report2.total_soft_penalty if report2 else 'N/A'}")
    print(f"  Duration: {duration2:.2f}s")
    print(f"  Stagnation Count: {enhanced_scheduler.stagnation_counter}")
    print(f"  Final Heuristic Probability: {enhanced_scheduler.heuristic_mutation_probability:.3f}")
    
    # Summary
    print("\n=== COMPARISON ===")
    if fitness1 > 0:
        improvement = (fitness1 - fitness2) / fitness1 * 100
        print(f"Fitness Improvement: {improvement:.1f}%")
        print(f"Enhanced GA: {'BETTER' if fitness2 < fitness1 else 'WORSE'} solution")
    
    print(f"Time difference: {duration2 - duration1:.2f}s")
    
    return fitness1, fitness2, duration1, duration2

if __name__ == "__main__":
    test_ga_improvements() 