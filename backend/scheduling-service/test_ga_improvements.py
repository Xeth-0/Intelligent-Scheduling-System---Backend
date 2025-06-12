"""
GA improvements test using real data from the seeded database
"""
import sys
import json
import time
sys.path.append('app')

from app.models import Course, Teacher, Classroom, StudentGroup, Timeslot, Constraint
from app.services.GeneticScheduler import GeneticScheduler

def load_test_data():
    """Load test data from JSON file with proper field mapping"""
    try:
        with open('test_data.json', 'r') as f:
            data = json.load(f)
        
        print("Loading real seed data...")
        
        # Convert to model objects with proper field mapping
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
        print("Creating fallback test data...")
        return create_fallback_data()

def create_fallback_data():
    """Create fallback test data if JSON loading fails"""
    
    timeslots = [
        Timeslot(timeslotId="TS1", code="0800_0900", label="08:00-09:00", startTime="08:00", endTime="09:00", order=1),
        Timeslot(timeslotId="TS2", code="0900_1000", label="09:00-10:00", startTime="09:00", endTime="10:00", order=2),
        Timeslot(timeslotId="TS3", code="1000_1100", label="10:00-11:00", startTime="10:00", endTime="11:00", order=3),
        Timeslot(timeslotId="TS4", code="1100_1200", label="11:00-12:00", startTime="11:00", endTime="12:00", order=4),
    ]
    
    classrooms = [
        Classroom(classroomId="R101", name="Room 101", capacity=30, type="LECTURE", buildingId="B1", floor=1, isWheelchairAccessible=True),
        Classroom(classroomId="R102", name="Room 102", capacity=25, type="LAB", buildingId="B1", floor=1, isWheelchairAccessible=True),
    ]
    
    teachers = [
        Teacher(teacherId="T1", name="Dr. Smith", email="smith@edu.com", phone="123-456-7890", department="CS"),
        Teacher(teacherId="T2", name="Prof. Jones", email="jones@edu.com", phone="123-456-7891", department="CS"),
    ]
    
    student_groups = [
        StudentGroup(studentGroupId="CS1", name="CS Group 1", size=25, department="CS"),
        StudentGroup(studentGroupId="CS2", name="CS Group 2", size=20, department="CS"),
    ]
    
    courses = [
        Course(courseId="C1", name="Math", teacherId="T1", sessionType="LECTURE", studentGroupIds=["CS1"], 
               description="Basic Math", ectsCredits=3, department="CS", sessionsPerWeek=2),
        Course(courseId="C2", name="Physics", teacherId="T2", sessionType="LECTURE", studentGroupIds=["CS2"],
               description="Basic Physics", ectsCredits=3, department="CS", sessionsPerWeek=2),
    ]
    
    constraints = []
    
    return timeslots, classrooms, teachers, student_groups, courses, constraints

def test_original_vs_enhanced():
    """Test original vs enhanced GA with real seed data"""
    print("Testing Original vs Enhanced GA with real seed data...")
    timeslots, classrooms, teachers, student_groups, courses, constraints = load_test_data()
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    
    # Calculate problem complexity
    total_sessions_needed = sum(c.sessionsPerWeek for c in courses)
    total_available_slots = len(classrooms) * len(timeslots) * len(days)
    capacity_utilization = (total_sessions_needed / total_available_slots) * 100 if total_available_slots > 0 else 0
    
    print(f"\nProblem Analysis:")
    print(f"  - {len(courses)} courses requiring scheduling")
    print(f"  - {len(classrooms)} available rooms")
    print(f"  - {len(teachers)} teachers")
    print(f"  - {len(student_groups)} student groups")
    print(f"  - {len(timeslots)} timeslots × {len(days)} days = {len(timeslots) * len(days)} time periods")
    print(f"  - Total sessions needed: {total_sessions_needed}")
    print(f"  - Total available slots: {total_available_slots}")
    print(f"  - Capacity utilization: {capacity_utilization:.1f}%")
    
    # Test with disabled adaptive features (original behavior)
    print("\n" + "="*60)
    print("ORIGINAL GA (Adaptive Features Disabled)")
    print("="*60)
    original_scheduler = GeneticScheduler(
        courses=courses, teachers=teachers, rooms=classrooms, student_groups=student_groups,
        timeslots=timeslots, days=days, constraints=constraints,
        population_size=40, gene_mutation_rate=0.1, chromosome_mutation_rate=0.2
    )
    
    # Disable adaptive features
    original_scheduler.heuristic_mutation_probability = 0.0  # Pure random mutation
    
    start_time = time.time()
    orig_solution, orig_fitness, orig_report = original_scheduler.run(generations=500)
    orig_duration = time.time() - start_time
    
    print(f"Results:")
    print(f"  Final Fitness: {orig_fitness:.2f}")
    print(f"  Hard Violations: {orig_report.total_hard_violations if orig_report else 'N/A'}")
    print(f"  Soft Penalty: {orig_report.total_soft_penalty if orig_report else 'N/A'}")
    print(f"  Duration: {orig_duration:.2f}s")
    print(f"  Sessions Scheduled: {len(orig_solution) if orig_solution else 0}/{total_sessions_needed}")
    print(f"  Solution Complete: {'YES' if orig_solution and len(orig_solution) == total_sessions_needed else 'NO'}")
    
    # Test with all adaptive features enabled
    print("\n" + "="*60)
    print("ENHANCED GA (All Adaptive Features Enabled)")
    print("="*60)
    enhanced_scheduler = GeneticScheduler(
        courses=courses, teachers=teachers, rooms=classrooms, student_groups=student_groups,
        timeslots=timeslots, days=days, constraints=constraints,
        population_size=40, gene_mutation_rate=0.1, chromosome_mutation_rate=0.2
    )
    
    start_time = time.time()
    enh_solution, enh_fitness, enh_report = enhanced_scheduler.run(generations=500)
    enh_duration = time.time() - start_time
    
    print(f"Results:")
    print(f"  Final Fitness: {enh_fitness:.2f}")
    print(f"  Hard Violations: {enh_report.total_hard_violations if enh_report else 'N/A'}")
    print(f"  Soft Penalty: {enh_report.total_soft_penalty if enh_report else 'N/A'}")
    print(f"  Duration: {enh_duration:.2f}s")
    print(f"  Stagnation Count: {enhanced_scheduler.stagnation_counter}")
    print(f"  Final Heuristic Probability: {enhanced_scheduler.heuristic_mutation_probability:.3f}")
    print(f"  Sessions Scheduled: {len(enh_solution) if enh_solution else 0}/{total_sessions_needed}")
    print(f"  Solution Complete: {'YES' if enh_solution and len(enh_solution) == total_sessions_needed else 'NO'}")
    
    # Calculate improvements
    print("\n" + "="*60)
    print("IMPROVEMENT SUMMARY")
    print("="*60)
    
    if orig_fitness > 0 and enh_fitness > 0:
        fitness_improvement = (orig_fitness - enh_fitness) / orig_fitness * 100
        print(f"Fitness Improvement: {fitness_improvement:.1f}% (lower is better)")
        print(f"Winner: {'Enhanced GA' if enh_fitness < orig_fitness else 'Original GA' if orig_fitness < enh_fitness else 'TIE'}")
        
        if enh_report and orig_report:
            hard_improvement = orig_report.total_hard_violations - enh_report.total_hard_violations
            soft_improvement = orig_report.total_soft_penalty - enh_report.total_soft_penalty
            print(f"Hard Constraint Violations Reduced: {hard_improvement}")
            print(f"Soft Penalty Reduced: {soft_improvement:.2f}")
    
    time_difference = enh_duration - orig_duration
    print(f"Time Difference: {time_difference:.2f}s ({'Enhanced took longer' if time_difference > 0 else 'Enhanced was faster'})")
    
    # Solution completeness comparison
    orig_complete = orig_solution and len(orig_solution) == total_sessions_needed
    enh_complete = enh_solution and len(enh_solution) == total_sessions_needed
    
    if enh_complete and not orig_complete:
        print("✅ Enhanced GA found complete solution while Original GA did not!")
    elif orig_complete and not enh_complete:
        print("⚠️  Original GA found complete solution while Enhanced GA did not.")
    elif enh_complete and orig_complete:
        print("✅ Both algorithms found complete solutions.")
    else:
        print("⚠️  Neither algorithm found a complete solution.")
    
    print(f"\nReal-world problem successfully tested with {len(courses)} actual courses!")
    
    return {
        'original': {
            'fitness': orig_fitness,
            'duration': orig_duration,
            'violations': orig_report.total_hard_violations if orig_report else 0,
            'sessions_scheduled': len(orig_solution) if orig_solution else 0,
            'complete': orig_complete
        },
        'enhanced': {
            'fitness': enh_fitness,
            'duration': enh_duration,
            'violations': enh_report.total_hard_violations if enh_report else 0,
            'sessions_scheduled': len(enh_solution) if enh_solution else 0,
            'complete': enh_complete
        }
    }

if __name__ == "__main__":
    results = test_original_vs_enhanced()
    print(f"\nTest completed. Results: {results}") 