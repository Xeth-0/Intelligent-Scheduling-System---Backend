"""
Challenging GA test using real data from the seeded database
"""
import sys
import time
import json
sys.path.append('app')

from app.models import Course, Teacher, Classroom, StudentGroup, Timeslot, Constraint
from app.services.GeneticScheduler import GeneticScheduler

def load_real_test_data():
    """Load actual test data from the generated JSON file"""
    try:
        with open('test_data.json', 'r') as f:
            data = json.load(f)
        
        print("Loading real seed data for challenging test...")
        
        # Convert to model objects with all required fields
        timeslots = []
        for ts in data['timeslots']:
            timeslots.append(Timeslot(
                timeslotId=ts['timeslotId'],
                code=ts['code'],
                label=ts['label'],
                startTime=ts['startTime'],
                endTime=ts['endTime'],
                order=ts['order']
            ))
        
        classrooms = []
        for r in data['rooms']:
            classrooms.append(Classroom(
                classroomId=r['classroomId'],
                name=r['name'],
                capacity=r['capacity'],
                type=r['type'],
                buildingId=r.get('buildingName', 'Unknown'),
                floor=r.get('floor', 1),
                isWheelchairAccessible=r.get('isWheelchairAccessible', False)
            ))
        
        teachers = []
        for t in data['teachers']:
            teachers.append(Teacher(
                teacherId=t['teacherId'],
                name=t['name'],
                email=t['email'],
                phone=t.get('phone', '000-000-0000'),
                department=t.get('departmentName', 'Unknown'),
                needsWheelchairAccessibleRoom=t.get('needsWheelchairAccessible', False)
            ))
        
        student_groups = []
        for sg in data['studentGroups']:
            student_groups.append(StudentGroup(
                studentGroupId=sg['studentGroupId'],
                name=sg['name'],
                size=sg['size'],
                department=sg.get('departmentName', 'Unknown'),
                accessibilityRequirement=sg.get('accessibilityRequirement', False)
            ))
        
        courses = []
        for c in data['courses']:
            # Convert student groups to list of IDs
            student_group_ids = []
            if 'studentGroups' in c:
                student_group_ids = [sg['studentGroupId'] for sg in c['studentGroups']]
            elif 'studentGroupIds' in c:
                student_group_ids = c['studentGroupIds']
            
            # Skip courses without a valid teacher or student groups
            teacher_id = c.get('teacherId')
            if not teacher_id or not student_group_ids:
                print(f"Skipping course {c.get('name', 'Unknown')} - missing teacher or student groups")
                continue
            
            courses.append(Course(
                courseId=c['courseId'],
                name=c['name'],
                description=c.get('description', ''),
                ectsCredits=c.get('ectsCredits', 3),
                department=c.get('department', 'Unknown'),
                teacherId=teacher_id,
                sessionType=c.get('sessionType', 'LECTURE'),
                sessionsPerWeek=c.get('sessionsPerWeek', 1),
                studentGroupIds=student_group_ids
            ))
        
        constraints = []
        for const in data.get('constraints', []):
            constraints.append(Constraint(
                constraintId=const.get('constraintTypeId', 'unknown'),
                constraintType=const.get('constraintTypeId', 'GENERAL'),
                teacherId=const.get('teacherId'),
                value=const.get('value', {}),
                priority=const.get('priority', 5.0),
                category='GENERAL'
            ))
        
        print(f"Loaded: {len(courses)} courses, {len(classrooms)} rooms, {len(teachers)} teachers")
        print(f"         {len(student_groups)} student groups, {len(timeslots)} timeslots")
        print(f"         {len(constraints)} constraints")
        
        return timeslots, classrooms, teachers, student_groups, courses, constraints
        
    except Exception as e:
        print(f"Error loading test data: {e}")
        print("Falling back to challenging mock data...")
        return create_challenging_fallback_data()

def create_challenging_fallback_data():
    """Create challenging fallback data if JSON loading fails"""
    
    # More timeslots
    timeslots = [
        Timeslot(timeslotId="TS1", code="0800_0900", label="08:00-09:00", startTime="08:00", endTime="09:00", order=1),
        Timeslot(timeslotId="TS2", code="0900_1000", label="09:00-10:00", startTime="09:00", endTime="10:00", order=2),
        Timeslot(timeslotId="TS3", code="1000_1100", label="10:00-11:00", startTime="10:00", endTime="11:00", order=3),
        Timeslot(timeslotId="TS4", code="1100_1200", label="11:00-12:00", startTime="11:00", endTime="12:00", order=4),
        Timeslot(timeslotId="TS5", code="1300_1400", label="13:00-14:00", startTime="13:00", endTime="14:00", order=5),
        Timeslot(timeslotId="TS6", code="1400_1500", label="14:00-15:00", startTime="14:00", endTime="15:00", order=6),
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
        Course(courseId="MATH101_L", name="Math 101 Lecture", teacherId="T1", sessionType="LECTURE", studentGroupIds=["CS1A", "CS1B"], 
               description="Math Lecture", ectsCredits=3, department="CS", sessionsPerWeek=3),
        Course(courseId="PHYS101_L", name="Physics 101 Lecture", teacherId="T2", sessionType="LECTURE", studentGroupIds=["CS1A", "CS1B"], 
               description="Physics Lecture", ectsCredits=3, department="CS", sessionsPerWeek=2),
        Course(courseId="PROG201_L", name="Programming 201 Lecture", teacherId="T3", sessionType="LECTURE", studentGroupIds=["CS2A", "CS2B"], 
               description="Programming Lecture", ectsCredits=4, department="CS", sessionsPerWeek=2),
    ]
    
    constraints = []
    
    return timeslots, classrooms, teachers, student_groups, courses, constraints

def test_ga_on_challenging_problem():
    """Test GA improvements on a challenging scheduling problem with real data"""
    print("Testing GA on challenging real-world problem...")
    timeslots, classrooms, teachers, student_groups, courses, constraints = load_real_test_data()
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    
    # Calculate problem complexity
    total_sessions_needed = sum(c.sessionsPerWeek for c in courses)
    total_available_slots = len(classrooms) * len(timeslots) * len(days)
    capacity_utilization = (total_sessions_needed / total_available_slots) * 100 if total_available_slots > 0 else 0
    
    print(f"\nChallenging Real-World Problem Analysis:")
    print(f"  - {len(courses)} courses to schedule")
    print(f"  - {len(classrooms)} available rooms")
    print(f"  - {len(teachers)} teachers")
    print(f"  - {len(student_groups)} student groups")
    print(f"  - {len(timeslots)} timeslots per day")
    print(f"  - {len(days)} days per week")
    print(f"  - Total sessions needed: {total_sessions_needed}")
    print(f"  - Total available slots: {total_available_slots}")
    print(f"  - Capacity utilization: {capacity_utilization:.1f}%")
    print(f"  - Constraints: {len(constraints)}")
    
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
    solution1, fitness1, report1 = original_scheduler.run(generations=800)
    duration1 = time.time() - start_time
    
    print(f"\nOriginal GA Results:")
    print(f"  Final Fitness: {fitness1:.2f}")
    print(f"  Hard Violations: {report1.total_hard_violations if report1 else 'N/A'}")
    print(f"  Soft Penalty: {report1.total_soft_penalty if report1 else 'N/A'}")
    print(f"  Duration: {duration1:.2f}s")
    print(f"  Solution Found: {'YES' if solution1 else 'NO'}")
    print(f"  Sessions Scheduled: {len(solution1) if solution1 else 0}/{total_sessions_needed}")
    
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
    solution2, fitness2, report2 = enhanced_scheduler.run(generations=800)
    duration2 = time.time() - start_time
    
    print(f"\nEnhanced GA Results:")
    print(f"  Final Fitness: {fitness2:.2f}")
    print(f"  Hard Violations: {report2.total_hard_violations if report2 else 'N/A'}")
    print(f"  Soft Penalty: {report2.total_soft_penalty if report2 else 'N/A'}")
    print(f"  Duration: {duration2:.2f}s")
    print(f"  Stagnation Count: {enhanced_scheduler.stagnation_counter}")
    print(f"  Final Heuristic Probability: {enhanced_scheduler.heuristic_mutation_probability:.3f}")
    print(f"  Solution Found: {'YES' if solution2 else 'NO'}")
    print(f"  Sessions Scheduled: {len(solution2) if solution2 else 0}/{total_sessions_needed}")
    
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
    
    # Check solution completeness
    solution1_complete = solution1 and len(solution1) == total_sessions_needed
    solution2_complete = solution2 and len(solution2) == total_sessions_needed
    
    print(f"\nSolution Completeness:")
    print(f"  Original GA: {'COMPLETE' if solution1_complete else 'INCOMPLETE'}")
    print(f"  Enhanced GA: {'COMPLETE' if solution2_complete else 'INCOMPLETE'}")
    
    print("\nKey Benefits of Enhanced GA for Complex Problems:")
    print("  - Adaptive mutation handles large search spaces better")
    print("  - Stagnation detection prevents premature convergence")
    print("  - Heuristic mutation guides toward feasible solutions")
    print("  - Better exploration-exploitation balance")
    
    return {
        'original': {
            'fitness': fitness1, 
            'duration': duration1, 
            'violations': report1.total_hard_violations if report1 else 0,
            'sessions_scheduled': len(solution1) if solution1 else 0,
            'complete': solution1_complete
        },
        'enhanced': {
            'fitness': fitness2, 
            'duration': duration2, 
            'violations': report2.total_hard_violations if report2 else 0,
            'sessions_scheduled': len(solution2) if solution2 else 0,
            'complete': solution2_complete
        }
    }

if __name__ == "__main__":
    results = test_ga_on_challenging_problem()
    print(f"\nTest completed. Results: {results}") 