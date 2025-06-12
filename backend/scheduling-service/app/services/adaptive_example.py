"""
Example usage of the AdaptiveGeneticScheduler with three-tier optimization.

This demonstrates how to use the adaptive system which includes:
- Tier 1: Penalty landscape optimization (PenaltyOptimizer)
- Tier 2: GA parameter adaptation (AdaptiveParameterManager)  
- Tier 3: Intelligent population restart (ConvergenceDetector)
"""

from typing import List
from app.models import (
    Course, Teacher, Classroom, StudentGroup, Timeslot, Constraint
)
from app.services.AdaptiveGeneticScheduler import AdaptiveGeneticScheduler


def run_adaptive_scheduling_example(
    courses: List[Course],
    teachers: List[Teacher],
    rooms: List[Classroom],
    student_groups: List[StudentGroup],
    timeslots: List[Timeslot],
    days: List[str],
    constraints: List[Constraint]
):
    """
    Example of running the adaptive genetic scheduler.
    
    This shows the difference between standard GA and adaptive GA.
    """
    
    print("="*60)
    print("ADAPTIVE GENETIC ALGORITHM SCHEDULING EXAMPLE")
    print("="*60)
    
    # Initialize the adaptive scheduler
    adaptive_scheduler = AdaptiveGeneticScheduler(
        courses=courses,
        teachers=teachers,
        rooms=rooms,
        student_groups=student_groups,
        timeslots=timeslots,
        days=days,
        constraints=constraints,
        
        # Basic GA parameters
        population_size=50,  # Will be automatically optimized
        gene_mutation_rate=0.1,  # Will be adaptively adjusted
        chromosome_mutation_rate=0.2,  # Will be adaptively adjusted
        
        # Adaptive optimization settings
        enable_adaptive_optimization=True,
        penalty_optimization_interval=50,  # Every 50 generations
        max_restarts=3,  # Maximum 3 population restarts
    )
    
    print(f"Problem size: {len(courses)} courses, {len(teachers)} teachers, {len(rooms)} rooms")
    print(f"Adaptive optimization: ENABLED")
    print(f"Three-tier system:")
    print(f"  Tier 1: Penalty optimization every {adaptive_scheduler.penalty_optimization_interval} generations")
    print(f"  Tier 2: Dynamic parameter adaptation based on population state")
    print(f"  Tier 3: Intelligent restarts (max {adaptive_scheduler.max_restarts})")
    print()
    
    # Run adaptive scheduling
    print("Starting adaptive genetic algorithm...")
    solution, fitness, report, metrics = adaptive_scheduler.run_adaptive(
        generations=1000,  # Maximum generations
        time_limit=300     # 5 minutes maximum
    )
    
    if solution:
        print(f"\n✅ SOLUTION FOUND!")
        print(f"Final fitness: {fitness:.4f}")
        print(f"Schedule feasible: {report.is_feasible if report else 'Unknown'}")
        print(f"Hard violations: {report.total_hard_violations if report else 'Unknown'}")
        print(f"Soft penalty: {report.total_soft_penalty if report else 'Unknown'}")
        
        # Show adaptive optimization effectiveness
        print(f"\n📊 ADAPTIVE OPTIMIZATION RESULTS:")
        print(f"Penalty optimizations performed: {metrics.total_penalty_optimizations}")
        print(f"Parameter adaptations: {metrics.total_parameter_adaptations}")
        print(f"Population restarts: {metrics.total_population_restarts}")
        print(f"Best solution found at generation: {metrics.best_generation}")
        
        if metrics.total_penalty_optimizations > 0:
            print(f"✨ Penalty optimization helped reshape the fitness landscape {metrics.total_penalty_optimizations} times")
        
        if metrics.total_parameter_adaptations > 0:
            print(f"⚙️ GA parameters were adaptively tuned {metrics.total_parameter_adaptations} times")
            
        if metrics.total_population_restarts > 0:
            print(f"🔄 Population was intelligently restarted {metrics.total_population_restarts} times")
            
    else:
        print("❌ No solution found within time/generation limits")
        print("Consider:")
        print("  - Increasing time limit")
        print("  - Increasing generation limit") 
        print("  - Checking constraint feasibility")
    
    return solution, fitness, report, metrics


def compare_standard_vs_adaptive(
    courses: List[Course],
    teachers: List[Teacher],
    rooms: List[Classroom],
    student_groups: List[StudentGroup],
    timeslots: List[Timeslot],
    days: List[str],
    constraints: List[Constraint]
):
    """
    Compare standard GA vs adaptive GA performance.
    """
    
    print("="*60)
    print("STANDARD GA vs ADAPTIVE GA COMPARISON")
    print("="*60)
    
    # Test standard GA first
    print("\n🔹 STANDARD GENETIC ALGORITHM")
    standard_scheduler = AdaptiveGeneticScheduler(
        courses=courses,
        teachers=teachers,
        rooms=rooms,
        student_groups=student_groups,
        timeslots=timeslots,
        days=days,
        constraints=constraints,
        enable_adaptive_optimization=False,  # Disable adaptive features
    )
    
    standard_solution, standard_fitness, _, standard_metrics = standard_scheduler.run_adaptive(
        generations=500,
        time_limit=120
    )
    
    print(f"Standard GA result: {standard_fitness:.4f} (best fitness)")
    print(f"Time: {standard_metrics.execution_time:.2f}s")
    
    # Test adaptive GA
    print("\n🔹 ADAPTIVE GENETIC ALGORITHM")
    adaptive_scheduler = AdaptiveGeneticScheduler(
        courses=courses,
        teachers=teachers,
        rooms=rooms,
        student_groups=student_groups,
        timeslots=timeslots,
        days=days,
        constraints=constraints,
        enable_adaptive_optimization=True,  # Enable adaptive features
        penalty_optimization_interval=30,   # More frequent optimization
        max_restarts=2,
    )
    
    adaptive_solution, adaptive_fitness, _, adaptive_metrics = adaptive_scheduler.run_adaptive(
        generations=500,
        time_limit=120
    )
    
    print(f"Adaptive GA result: {adaptive_fitness:.4f} (best fitness)")
    print(f"Time: {adaptive_metrics.execution_time:.2f}s")
    
    # Compare results
    print(f"\n📈 COMPARISON RESULTS:")
    improvement = ((standard_fitness - adaptive_fitness) / standard_fitness) * 100
    
    if adaptive_fitness < standard_fitness:
        print(f"✅ Adaptive GA performed BETTER by {improvement:.2f}%")
    elif adaptive_fitness > standard_fitness:
        print(f"❌ Standard GA performed better by {-improvement:.2f}%")
    else:
        print("🤝 Both algorithms achieved the same result")
    
    print(f"\nAdaptive interventions used:")
    print(f"  - Penalty optimizations: {adaptive_metrics.total_penalty_optimizations}")
    print(f"  - Parameter adaptations: {adaptive_metrics.total_parameter_adaptations}")
    print(f"  - Population restarts: {adaptive_metrics.total_population_restarts}")
    
    return {
        'standard': {'fitness': standard_fitness, 'time': standard_metrics.execution_time},
        'adaptive': {'fitness': adaptive_fitness, 'time': adaptive_metrics.execution_time},
        'improvement_percent': improvement,
        'adaptive_interventions': {
            'penalty_optimizations': adaptive_metrics.total_penalty_optimizations,
            'parameter_adaptations': adaptive_metrics.total_parameter_adaptations,
            'population_restarts': adaptive_metrics.total_population_restarts,
        }
    }


# Example usage pattern:
"""
# Assuming you have your scheduling data ready:
courses = [...]  # Your course list
teachers = [...]  # Your teacher list
rooms = [...]     # Your classroom list
student_groups = [...]  # Your student group list
timeslots = [...]       # Your timeslot list
days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
constraints = [...]     # Your constraint list

# Run the adaptive scheduler
solution, fitness, report, metrics = run_adaptive_scheduling_example(
    courses, teachers, rooms, student_groups, timeslots, days, constraints
)

# Or compare standard vs adaptive
comparison_results = compare_standard_vs_adaptive(
    courses, teachers, rooms, student_groups, timeslots, days, constraints
)
""" 