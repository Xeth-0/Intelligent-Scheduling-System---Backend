"""
Simple GA test using real data from the seeded database
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
        
        print("Loading real seed data...")
        
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
        
        return timeslots, classrooms, teachers, student_groups, courses, constraints
        
    except Exception as e:
        print(f"Error loading test data: {e}")
        print("Falling back to simple mock data...")
        return create_simple_fallback_data()

def create_simple_fallback_data():
    """Create simple fallback data if JSON loading fails"""
    
    # Simple timeslots
    timeslots = [
        Timeslot(timeslotId="TS1", code="0800_0900", label="08:00-09:00", startTime="08:00", endTime="09:00", order=1),
        Timeslot(timeslotId="TS2", code="0900_1000", label="09:00-10:00", startTime="09:00", endTime="10:00", order=2),
        Timeslot(timeslotId="TS3", code="1000_1100", label="10:00-11:00", startTime="10:00", endTime="11:00", order=3),
        Timeslot(timeslotId="TS4", code="1100_1200", label="11:00-12:00", startTime="11:00", endTime="12:00", order=4),
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
    ]
    
    constraints = []
    
    return timeslots, classrooms, teachers, student_groups, courses, constraints

def test_ga_improvements():
    """Test the GA improvements with real seed data"""
    print("Testing GA improvements with real seed data...")
    timeslots, classrooms, teachers, student_groups, courses, constraints = load_real_test_data()
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    
    print(f"\nProblem Size:")
    print(f"  - {len(courses)} courses to schedule")
    print(f"  - {len(classrooms)} available rooms")
    print(f"  - {len(teachers)} teachers")
    print(f"  - {len(student_groups)} student groups")
    print(f"  - {len(timeslots)} timeslots per day")
    print(f"  - Total scheduling sessions needed: {sum(c.sessionsPerWeek for c in courses)}")
    
    # Test 1: Original approach (disable adaptive features)
    print("\n" + "="*50)
    print("ORIGINAL GA (Adaptive Features OFF)")
    print("="*50)
    original_scheduler = GeneticScheduler(
        courses=courses, teachers=teachers, rooms=classrooms, student_groups=student_groups,
        timeslots=timeslots, days=days, constraints=constraints,
        population_size=30, gene_mutation_rate=0.1, chromosome_mutation_rate=0.2
    )
    
    # Disable adaptive features for baseline comparison
    original_scheduler.heuristic_mutation_probability = 0.0  # Pure random mutation only
    
    start_time = time.time()
    solution1, fitness1, report1 = original_scheduler.run(generations=300)
    duration1 = time.time() - start_time
    
    print(f"Results:")
    print(f"  Final Fitness: {fitness1:.2f}")
    print(f"  Hard Violations: {report1.total_hard_violations if report1 else 'N/A'}")
    print(f"  Soft Penalty: {report1.total_soft_penalty if report1 else 'N/A'}")
    print(f"  Duration: {duration1:.2f}s")
    print(f"  Valid Solution: {'YES' if solution1 else 'NO'}")
    
    # Test 2: Enhanced approach (all adaptive features enabled)
    print("\n" + "="*50)
    print("ENHANCED GA (Adaptive Features ON)")
    print("="*50)
    enhanced_scheduler = GeneticScheduler(
        courses=courses, teachers=teachers, rooms=classrooms, student_groups=student_groups,
        timeslots=timeslots, days=days, constraints=constraints,
        population_size=30, gene_mutation_rate=0.1, chromosome_mutation_rate=0.2
    )
    
    start_time = time.time()
    solution2, fitness2, report2 = enhanced_scheduler.run(generations=300)
    duration2 = time.time() - start_time
    
    print(f"Results:")
    print(f"  Final Fitness: {fitness2:.2f}")
    print(f"  Hard Violations: {report2.total_hard_violations if report2 else 'N/A'}")
    print(f"  Soft Penalty: {report2.total_soft_penalty if report2 else 'N/A'}")
    print(f"  Duration: {duration2:.2f}s")
    print(f"  Stagnation Count: {enhanced_scheduler.stagnation_counter}")
    print(f"  Final Heuristic Probability: {enhanced_scheduler.heuristic_mutation_probability:.3f}")
    print(f"  Valid Solution: {'YES' if solution2 else 'NO'}")
    
    # Summary
    print("\n" + "="*50)
    print("COMPARISON SUMMARY")
    print("="*50)
    if fitness1 > 0 and fitness2 > 0:
        improvement = (fitness1 - fitness2) / fitness1 * 100
        print(f"Fitness Improvement: {improvement:.1f}%")
        print(f"Winner: {'Enhanced GA' if fitness2 < fitness1 else 'Original GA' if fitness1 < fitness2 else 'TIE'}")
    
    time_difference = duration2 - duration1
    print(f"Time Difference: {time_difference:.2f}s")
    
    return fitness1, fitness2, duration1, duration2

if __name__ == "__main__":
    test_ga_improvements() 