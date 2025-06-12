"""
Simple test script to demonstrate GA improvements
"""
import sys
import json
import time
sys.path.append('app')

from app.models import Course, Teacher, Classroom, StudentGroup, Timeslot, Constraint
from app.services.GeneticScheduler import GeneticScheduler

def load_test_data():
    """Load test data from JSON file"""
    with open('test_data.json', 'r') as f:
        data = json.load(f)
    
    # Convert to model objects
    timeslots = [Timeslot(timeslotId=ts['timeslotId'], code=ts['code'], label=ts['label'], startTime=ts['startTime'], endTime=ts['endTime'], order=ts['order']) for ts in data['timeslots']]
    classrooms = [Classroom(classroomId=r['classroomId'], name=r['name'], capacity=r['capacity'], type=r['type']) for r in data['rooms']]
    teachers = [Teacher(teacherId=t['teacherId'], name=t['name'], email=t['email']) for t in data['teachers']]
    student_groups = [StudentGroup(studentGroupId=sg['studentGroupId'], name=sg['name'], size=sg['size']) for sg in data['studentGroups']]
    courses = [Course(courseId=c['courseId'], name=c['name'], teacherId=c['teacherId'], sessionType=c['sessionType'], studentGroupIds=c['studentGroupIds']) for c in data['courses']]
    constraints = [Constraint(constraintId=c['constraintId'], type=c['type'], name=c['name'], description=c['description'], isHard=c['isHard'], penalty=c['penalty'], parameters=c['parameters']) for c in data['constraints']]
    
    return timeslots, classrooms, teachers, student_groups, courses, constraints

def test_original_vs_enhanced():
    """Test original vs enhanced GA"""
    print("Loading test data...")
    timeslots, classrooms, teachers, student_groups, courses, constraints = load_test_data()
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    
    print(f"Problem size: {len(courses)} courses, {len(classrooms)} rooms, {len(teachers)} teachers")
    
    # Test with disabled adaptive features (original behavior)
    print("\n=== ORIGINAL GA (Adaptive Features Disabled) ===")
    original_scheduler = GeneticScheduler(
        courses=courses, teachers=teachers, rooms=classrooms, student_groups=student_groups,
        timeslots=timeslots, days=days, constraints=constraints,
        population_size=30, gene_mutation_rate=0.1, chromosome_mutation_rate=0.2
    )
    
    # Disable adaptive features
    original_scheduler.heuristic_mutation_probability = 0.0  # Pure random mutation
    
    start_time = time.time()
    orig_solution, orig_fitness, orig_report = original_scheduler.run(generations=300)
    orig_duration = time.time() - start_time
    
    print(f"Results:")
    print(f"  Final Fitness: {orig_fitness:.2f}")
    print(f"  Hard Violations: {orig_report.total_hard_violations if orig_report else 'N/A'}")
    print(f"  Soft Penalty: {orig_report.total_soft_penalty if orig_report else 'N/A'}")
    print(f"  Duration: {orig_duration:.2f}s")
    
    # Test with all adaptive features enabled
    print("\n=== ENHANCED GA (All Adaptive Features Enabled) ===")
    enhanced_scheduler = GeneticScheduler(
        courses=courses, teachers=teachers, rooms=classrooms, student_groups=student_groups,
        timeslots=timeslots, days=days, constraints=constraints,
        population_size=30, gene_mutation_rate=0.1, chromosome_mutation_rate=0.2
    )
    
    start_time = time.time()
    enh_solution, enh_fitness, enh_report = enhanced_scheduler.run(generations=300)
    enh_duration = time.time() - start_time
    
    print(f"Results:")
    print(f"  Final Fitness: {enh_fitness:.2f}")
    print(f"  Hard Violations: {enh_report.total_hard_violations if enh_report else 'N/A'}")
    print(f"  Soft Penalty: {enh_report.total_soft_penalty if enh_report else 'N/A'}")
    print(f"  Duration: {enh_duration:.2f}s")
    print(f"  Stagnation Count: {enhanced_scheduler.stagnation_counter}")
    print(f"  Final Heuristic Probability: {enhanced_scheduler.heuristic_mutation_probability:.3f}")
    
    # Calculate improvements
    if orig_fitness > 0:
        fitness_improvement = (orig_fitness - enh_fitness) / orig_fitness * 100
        print(f"\n=== IMPROVEMENT SUMMARY ===")
        print(f"Fitness Improvement: {fitness_improvement:.1f}% (lower is better)")
        print(f"Enhanced GA found {'better' if enh_fitness < orig_fitness else 'worse'} solutions")
        
        if enh_report and orig_report:
            hard_improvement = orig_report.total_hard_violations - enh_report.total_hard_violations
            print(f"Hard Constraint Violations Reduced: {hard_improvement}")

if __name__ == "__main__":
    test_original_vs_enhanced() 