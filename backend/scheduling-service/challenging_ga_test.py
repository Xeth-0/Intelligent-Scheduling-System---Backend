"""
Challenging GA test with more complex constraints to demonstrate improvements
"""
import sys
import time
sys.path.append('app')

from app.models import Course, Teacher, Classroom, StudentGroup, Timeslot, Constraint
from app.services.GeneticScheduler import GeneticScheduler

def create_challenging_test_data():
    """Create challenging test data that will stress the GA"""
    
    # More timeslots
    timeslots = [
        Timeslot(timeslotId="TS1", code="08:00-09:00", label="Period 1", startTime="08:00", endTime="09:00", order=1),
        Timeslot(timeslotId="TS2", code="09:00-10:00", label="Period 2", startTime="09:00", endTime="10:00", order=2),
        Timeslot(timeslotId="TS3", code="10:00-11:00", label="Period 3", startTime="10:00", endTime="11:00", order=3),
        Timeslot(timeslotId="TS4", code="11:00-12:00", label="Period 4", startTime="11:00", endTime="12:00", order=4),
        Timeslot(timeslotId="TS5", code="13:00-14:00", label="Period 5", startTime="13:00", endTime="14:00", order=5),
        Timeslot(timeslotId="TS6", code="14:00-15:00", label="Period 6", startTime="14:00", endTime="15:00", order=6),
    ]
    
    # Limited classrooms (creates resource constraints)
    classrooms = [
        Classroom(classroomId="R101", name="Small Room", capacity=20, type="LECTURE", buildingId="B1", floor=1, isWheelchairAccessible=True),
        Classroom(classroomId="R102", name="Lab Room", capacity=15, type="LAB", buildingId="B1", floor=1, isWheelchairAccessible=True),
        Classroom(classroomId="R201", name="Large Room", capacity=50, type="LECTURE", buildingId="B1", floor=2, isWheelchairAccessible=False),
    ]
    
    # Multiple teachers with varied schedules
    teachers = [
        Teacher(teacherId="T1", name="Dr. Smith", email="smith@edu.com", phone="123-456-7890", department="CS"),
        Teacher(teacherId="T2", name="Prof. Jones", email="jones@edu.com", phone="123-456-7891", department="CS"),
        Teacher(teacherId="T3", name="Dr. Brown", email="brown@edu.com", phone="123-456-7892", department="CS"),
    ]
    
    # Multiple student groups with different sizes
    student_groups = [
        StudentGroup(studentGroupId="CS1A", name="CS Group 1A", size=18, department="CS"),
        StudentGroup(studentGroupId="CS1B", name="CS Group 1B", size=22, department="CS"),
        StudentGroup(studentGroupId="CS2A", name="CS Group 2A", size=16, department="CS"),
        StudentGroup(studentGroupId="CS2B", name="CS Group 2B", size=25, department="CS"),
        StudentGroup(studentGroupId="CS3A", name="CS Group 3A", size=12, department="CS"),
    ]
    
    # Many courses to create scheduling conflicts
    courses = [
        # Multiple sessions per course
        Course(courseId="MATH101_L", name="Math 101 Lecture", teacherId="T1", sessionType="LECTURE", studentGroupIds=["CS1A", "CS1B"], 
               description="Math Lecture", ectsCredits=3, department="CS", sessionsPerWeek=3),
        Course(courseId="MATH101_T1", name="Math 101 Tutorial 1", teacherId="T1", sessionType="LECTURE", studentGroupIds=["CS1A"], 
               description="Math Tutorial", ectsCredits=1, department="CS", sessionsPerWeek=1),
        Course(courseId="MATH101_T2", name="Math 101 Tutorial 2", teacherId="T1", sessionType="LECTURE", studentGroupIds=["CS1B"], 
               description="Math Tutorial", ectsCredits=1, department="CS", sessionsPerWeek=1),
               
        Course(courseId="PHYS101_L", name="Physics 101 Lecture", teacherId="T2", sessionType="LECTURE", studentGroupIds=["CS1A", "CS1B"], 
               description="Physics Lecture", ectsCredits=3, department="CS", sessionsPerWeek=2),
        Course(courseId="PHYS101_LAB1", name="Physics 101 Lab 1", teacherId="T2", sessionType="LAB", studentGroupIds=["CS1A"], 
               description="Physics Lab", ectsCredits=2, department="CS", sessionsPerWeek=1),
        Course(courseId="PHYS101_LAB2", name="Physics 101 Lab 2", teacherId="T2", sessionType="LAB", studentGroupIds=["CS1B"], 
               description="Physics Lab", ectsCredits=2, department="CS", sessionsPerWeek=1),
               
        Course(courseId="PROG201_L", name="Programming 201 Lecture", teacherId="T3", sessionType="LECTURE", studentGroupIds=["CS2A", "CS2B"], 
               description="Programming Lecture", ectsCredits=4, department="CS", sessionsPerWeek=2),
        Course(courseId="PROG201_LAB1", name="Programming 201 Lab 1", teacherId="T3", sessionType="LAB", studentGroupIds=["CS2A"], 
               description="Programming Lab", ectsCredits=3, department="CS", sessionsPerWeek=2),
        Course(courseId="PROG201_LAB2", name="Programming 201 Lab 2", teacherId="T3", sessionType="LAB", studentGroupIds=["CS2B"], 
               description="Programming Lab", ectsCredits=3, department="CS", sessionsPerWeek=2),
               
        Course(courseId="DB301_L", name="Database 301 Lecture", teacherId="T1", sessionType="LECTURE", studentGroupIds=["CS3A"], 
               description="Database Lecture", ectsCredits=4, department="CS", sessionsPerWeek=2),
        Course(courseId="DB301_LAB", name="Database 301 Lab", teacherId="T1", sessionType="LAB", studentGroupIds=["CS3A"], 
               description="Database Lab", ectsCredits=3, department="CS", sessionsPerWeek=2),
               
        Course(courseId="AI401_L", name="AI 401 Lecture", teacherId="T2", sessionType="LECTURE", studentGroupIds=["CS3A"], 
               description="AI Lecture", ectsCredits=4, department="CS", sessionsPerWeek=2),
        Course(courseId="AI401_LAB", name="AI 401 Lab", teacherId="T2", sessionType="LAB", studentGroupIds=["CS3A"], 
               description="AI Lab", ectsCredits=3, department="CS", sessionsPerWeek=1),
    ]
    
    # No specific constraints to keep it simple but challenging due to resource limitations
    constraints = []
    
    return timeslots, classrooms, teachers, student_groups, courses, constraints

def test_ga_on_challenging_problem():
    """Test GA improvements on a challenging scheduling problem"""
    print("Creating challenging test data...")
    timeslots, classrooms, teachers, student_groups, courses, constraints = create_challenging_test_data()
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    
    print(f"Challenging Problem:")
    print(f"  - {len(courses)} courses to schedule")
    print(f"  - {len(classrooms)} available rooms")
    print(f"  - {len(teachers)} teachers")
    print(f"  - {len(student_groups)} student groups")
    print(f"  - {len(timeslots)} timeslots per day")
    print(f"  - {len(days)} days per week")
    print(f"  - Total scheduling slots: {len(classrooms) * len(timeslots) * len(days)}")
    
    # Test 1: Original approach (disable adaptive features)
    print("\n" + "="*60)
    print("ORIGINAL GA (No Adaptive Features)")
    print("="*60)
    
    original_scheduler = GeneticScheduler(
        courses=courses, teachers=teachers, rooms=classrooms, student_groups=student_groups,
        timeslots=timeslots, days=days, constraints=constraints,
        population_size=50, gene_mutation_rate=0.1, chromosome_mutation_rate=0.2
    )
    
    # Disable adaptive features for baseline
    original_scheduler.heuristic_mutation_probability = 0.0  # Pure random mutation
    
    start_time = time.time()
    solution1, fitness1, report1 = original_scheduler.run(generations=1000)
    duration1 = time.time() - start_time
    
    print(f"\nOriginal GA Results:")
    print(f"  Final Fitness: {fitness1:.2f}")
    print(f"  Hard Violations: {report1.total_hard_violations if report1 else 'N/A'}")
    print(f"  Soft Penalty: {report1.total_soft_penalty if report1 else 'N/A'}")
    print(f"  Duration: {duration1:.2f}s")
    print(f"  Solution Found: {'YES' if solution1 else 'NO'}")
    
    # Test 2: Enhanced approach (all adaptive features enabled)
    print("\n" + "="*60)
    print("ENHANCED GA (Full Adaptive Features)")
    print("="*60)
    
    enhanced_scheduler = GeneticScheduler(
        courses=courses, teachers=teachers, rooms=classrooms, student_groups=student_groups,
        timeslots=timeslots, days=days, constraints=constraints,
        population_size=50, gene_mutation_rate=0.1, chromosome_mutation_rate=0.2
    )
    
    start_time = time.time()
    solution2, fitness2, report2 = enhanced_scheduler.run(generations=1000)
    duration2 = time.time() - start_time
    
    print(f"\nEnhanced GA Results:")
    print(f"  Final Fitness: {fitness2:.2f}")
    print(f"  Hard Violations: {report2.total_hard_violations if report2 else 'N/A'}")
    print(f"  Soft Penalty: {report2.total_soft_penalty if report2 else 'N/A'}")
    print(f"  Duration: {duration2:.2f}s")
    print(f"  Stagnation Count: {enhanced_scheduler.stagnation_counter}")
    print(f"  Final Heuristic Probability: {enhanced_scheduler.heuristic_mutation_probability:.3f}")
    print(f"  Solution Found: {'YES' if solution2 else 'NO'}")
    
    # Detailed comparison
    print("\n" + "="*60)
    print("COMPARISON ANALYSIS")
    print("="*60)
    
    if fitness1 > 0 and fitness2 > 0:
        fitness_improvement = (fitness1 - fitness2) / fitness1 * 100
        print(f"Fitness Improvement: {fitness_improvement:.1f}%")
        
        if report1 and report2:
            hard_improvement = report1.total_hard_violations - report2.total_hard_violations
            soft_improvement = report1.total_soft_penalty - report2.total_soft_penalty
            print(f"Hard Violations Reduced: {hard_improvement}")
            print(f"Soft Penalty Reduced: {soft_improvement:.2f}")
        
        print(f"Winner: {'Enhanced GA' if fitness2 < fitness1 else 'Original GA' if fitness1 < fitness2 else 'TIE'}")
    
    time_difference = duration2 - duration1
    print(f"Time Difference: {time_difference:.2f}s ({'Enhanced took longer' if time_difference > 0 else 'Enhanced was faster'})")
    
    print("\nKey Benefits of Enhanced GA:")
    print("  - Diversity-guided mutation adapts to population state")
    print("  - Stagnation detection prevents local optima")
    print("  - Uniform crossover better handles large chromosomes")
    print("  - Early stopping prevents wasted computation")
    
    return {
        'original': {'fitness': fitness1, 'duration': duration1, 'violations': report1.total_hard_violations if report1 else 0},
        'enhanced': {'fitness': fitness2, 'duration': duration2, 'violations': report2.total_hard_violations if report2 else 0}
    }

if __name__ == "__main__":
    results = test_ga_on_challenging_problem()
    print(f"\nTest completed. Results: {results}") 