from typing import List, Tuple, Optional, Dict, Any
import time
import random
from dataclasses import dataclass

from app.models import (
    Classroom,
    Course,
    ScheduledItem,
    StudentGroup,
    Teacher,
    Timeslot,
    Constraint,
)
from app.services.GeneticScheduler import GeneticScheduler
from app.services.PenaltyOptimizer import PenaltyOptimizer, OptimizationResult
from app.services.ConvergenceDetector import ConvergenceDetector, ConvergenceMetrics
from app.services.AdaptiveParameterManager import (
    AdaptiveParameterManager,
    GAParameters,
    AdaptationHistory,
)
from app.services.Fitness import ScheduleFitnessEvaluator, FitnessReport


@dataclass
class AdaptiveRunMetrics:
    """Comprehensive metrics for an adaptive GA run."""
    total_generations: int
    total_penalty_optimizations: int
    total_parameter_adaptations: int
    total_population_restarts: int
    final_fitness: float
    final_diversity: float
    convergence_history: List[ConvergenceMetrics]
    adaptation_summary: Dict[str, Any]
    execution_time: float
    best_generation: int


class AdaptiveGeneticScheduler(GeneticScheduler):
    """
    Enhanced genetic scheduler with three-tier adaptive optimization:
    
    Tier 1: Penalty landscape optimization (reshape fitness landscape)
    Tier 2: GA parameter adaptation (adjust exploration/exploitation balance)  
    Tier 3: Intelligent population restart (inject diversity while preserving elites)
    
    Research basis:
    - Jeffrey Horn (1993): Convergence detection via bit-wise diversity measures
    - Grefenstette (1986): Adaptive parameter scheduling
    - Goldberg & Deb (1992): Population sizing laws
    - Sipper et al. (2018): "Parameter space is rife with viable parameters"
    """

    def __init__(
        self,
        courses: List[Course],
        teachers: List[Teacher],
        rooms: List[Classroom],
        student_groups: List[StudentGroup],
        timeslots: List[Timeslot],
        days: List[str],
        constraints: List[Constraint],
        population_size: int = 50,
        gene_mutation_rate: float = 0.1,
        chromosome_mutation_rate: float = 0.2,
        use_detailed_fitness: bool = True,
        enable_adaptive_optimization: bool = True,
        penalty_optimization_interval: int = 5,
        max_restarts: int = 3,
    ):
        """
        Initialize adaptive genetic scheduler.
        
        Args:
            enable_adaptive_optimization: Enable the three-tier adaptive system
            penalty_optimization_interval: Generations between penalty optimizations
            max_restarts: Maximum number of population restarts allowed
        """
        # Initialize base genetic scheduler
        super().__init__(
            courses=courses,
            teachers=teachers,
            rooms=rooms,
            student_groups=student_groups,
            timeslots=timeslots,
            days=days,
            constraints=constraints,
            population_size=population_size,
            gene_mutation_rate=gene_mutation_rate,
            chromosome_mutation_rate=chromosome_mutation_rate,
            use_detailed_fitness=use_detailed_fitness,
        )

        self.enable_adaptive_optimization = enable_adaptive_optimization
        self.penalty_optimization_interval = penalty_optimization_interval
        self.max_restarts = max_restarts

        if self.enable_adaptive_optimization:
            self._initialize_adaptive_components()

    def _initialize_adaptive_components(self) -> None:
        """Initialize the three-tier adaptive optimization system."""
        # Tier 1: Penalty optimization
        self.penalty_optimizer = PenaltyOptimizer(self.fitness_evaluator)

        # Tier 2: Parameter adaptation
        initial_params = GAParameters(
            population_size=self.population_size,
            gene_mutation_rate=self.gene_mutation_rate,
            chromosome_mutation_rate=self.chromosome_mutation_rate,
            tournament_size=3,  # Default tournament size
            elitism_count=2,    # Default elitism count
        )
        self.parameter_manager = AdaptiveParameterManager(
            initial_params=initial_params,
            chromosome_length=len(self.courses),
        )

        # Tier 3: Convergence detection (enables intelligent restarts)
        convergence_window = max(20, int(len(self.courses) // 5))  # Scale with problem size
        self.convergence_detector = ConvergenceDetector(
            window_size=convergence_window,
            diversity_threshold=0.05,  # More realistic threshold for GA populations
            fitness_threshold=0.01,    # More sensitive to fitness improvements
        )

        # Track adaptive optimization metrics
        self.restart_count = 0
        self.penalty_optimization_count = 0
        self.parameter_adaptation_count = 0
        self.convergence_history: List[ConvergenceMetrics] = []

    def run_adaptive(
        self, 
        generations: int = 10000,
        time_limit: int = 120
    ) -> Tuple[Optional[List[ScheduledItem]], float, Optional[FitnessReport], AdaptiveRunMetrics]:
        """
        Run genetic algorithm with three-tier adaptive optimization.
        
        Args:
            generations: Maximum generations to run
            time_limit: Maximum time in seconds
            
        Returns:
            Tuple of (best_solution, best_fitness, best_report, adaptive_metrics)
        """
        if not self.enable_adaptive_optimization:
            # Fall back to standard GA if adaptive optimization is disabled
            solution, fitness, report = self.run(generations)
            metrics = AdaptiveRunMetrics(
                total_generations=generations,
                total_penalty_optimizations=0,
                total_parameter_adaptations=0,
                total_population_restarts=0,
                final_fitness=fitness,
                final_diversity=0.0,
                convergence_history=[],
                adaptation_summary={},
                execution_time=0.0,
                best_generation=0,
            )
            return solution, fitness, report, metrics

        start_time = time.time()
        
        # Initialize population with adaptive sizing
        optimal_pop_size = self.parameter_manager.calculate_optimal_population_size()
        self.population_size = optimal_pop_size
        population = self.initialize_population()
        
        best_solution_overall = None
        best_fitness_overall = float("inf")
        best_report_overall = None
        best_generation = 0
        
        generation = 0
        last_penalty_optimization = 0

        print(f"Starting adaptive GA with population size: {len(population)}")

        while generation < generations:
            # Evaluate population
            fitness_scores, fitness_reports = self._evaluate_population(population)
            self.last_generation_reports = fitness_reports

            # Update current parameters from parameter manager
            current_params = self.parameter_manager.current_params
            self.gene_mutation_rate = current_params.gene_mutation_rate
            self.chromosome_mutation_rate = current_params.chromosome_mutation_rate

            # Track best solution
            current_best_fitness = min(fitness_scores)
            if current_best_fitness < best_fitness_overall:
                best_fitness_overall = current_best_fitness
                best_idx = fitness_scores.index(current_best_fitness)
                best_solution_overall = [item.model_copy() for item in population[best_idx]]
                best_report_overall = fitness_reports[best_idx]
                best_generation = generation

                print(f"Gen {generation:>4d}: New best fitness: {best_fitness_overall:.2f}")

            # Check for perfect solution
            if best_fitness_overall == 0:
                print(f"Perfect solution found at generation {generation}!")
                break

            # Check time limit
            elapsed_time = time.time() - start_time
            if elapsed_time > time_limit:
                print(f"Time limit reached after {generation} generations")
                break

            # ADAPTIVE OPTIMIZATION - Three-Tier System
            if self.enable_adaptive_optimization:
                # Check convergence and get metrics
                convergence_metrics = self.convergence_detector.check_convergence(
                    population, fitness_scores
                )
                self.convergence_history.append(convergence_metrics)
                stagnation_severity = self.convergence_detector.get_stagnation_severity(generations)

                # Tier 1: Penalty Landscape Optimization
                # Only trigger for meaningful stagnation, not on schedule
                if stagnation_severity in ['moderate', 'severe']:
                    
                    print(f"Gen {generation}: Triggering penalty optimization (severity: {stagnation_severity})")
                    self._trigger_penalty_optimization()
                    last_penalty_optimization = generation

                # Tier 2: GA Parameter Adaptation
                if stagnation_severity in ['mild', 'moderate', 'severe']:
                    adapted_params, params_changed = self.parameter_manager.adapt_parameters(
                        convergence_metrics, stagnation_severity, generation
                    )
                    
                    if params_changed:
                        self.parameter_adaptation_count += 1
                        print(f"Gen {generation}: Parameters adapted for {stagnation_severity} stagnation")

                # Tier 3: Intelligent Population Restart
                if (stagnation_severity == 'severe' and 
                    self.restart_count < self.max_restarts and
                    convergence_metrics.generations_without_improvement > 100):
                    
                    print(f"Gen {generation}: Triggering intelligent restart (restart #{self.restart_count + 1})")
                    population = self._intelligent_population_restart(
                        population, fitness_scores, best_solution_overall
                    )
                    self.convergence_detector.reset()
                    continue

            # Standard GA evolution
            population = self.evolve(population, fitness_scores)
            generation += 1

            # Progress reporting
            if generation % 100 == 0:
                diversity = convergence_metrics.population_diversity if 'convergence_metrics' in locals() else 0.0
                print(f"Gen {generation:>4d}: Fitness: {best_fitness_overall:.2f}, "
                      f"Diversity: {diversity:.3f}, Time: {elapsed_time:.1f}s")

        # Compile final metrics
        final_time = time.time() - start_time
        final_diversity = (self.convergence_history[-1].population_diversity 
                          if self.convergence_history else 0.0)
        
        adaptive_metrics = AdaptiveRunMetrics(
            total_generations=generation,
            total_penalty_optimizations=self.penalty_optimization_count,
            total_parameter_adaptations=self.parameter_adaptation_count,
            total_population_restarts=self.restart_count,
            final_fitness=best_fitness_overall,
            final_diversity=final_diversity,
            convergence_history=self.convergence_history,
            adaptation_summary=self.parameter_manager.get_adaptation_summary(),
            execution_time=final_time,
            best_generation=best_generation,
        )

        self._print_adaptive_summary(adaptive_metrics)
        
        return best_solution_overall, best_fitness_overall, best_report_overall, adaptive_metrics

    def _trigger_penalty_optimization(self) -> None:
        """
        Tier 1: Penalty landscape optimization.
        
        Uses Bayesian optimization to find better penalty parameters,
        effectively reshaping the fitness landscape to escape local minima.
        """
        try:
            # Validate current penalty point before optimization
            current_point = self.penalty_optimizer._get_current_penalty_point()
            search_space = self.penalty_optimizer.search_space
            
            # Check if current point is valid
            point_valid = all(
                dim.low <= val <= dim.high 
                for dim, val in zip(search_space, current_point)
            )
            
            if not point_valid:
                print(f"⚠ Current penalty configuration invalid for optimization, skipping")
                return
            
            # Run penalty optimization with limited calls for efficiency
            optimization_result = self.penalty_optimizer.optimize_penalties(
                n_calls=12,  # Limited calls to balance quality vs speed
                random_state=42
            )
            
            # Apply optimized penalties if they're valid
            if self.penalty_optimizer.validate_optimization_result(optimization_result):
                print(f"Old penalties: {self._get_current_penalty_summary()}")
                self.penalty_optimizer.apply_optimal_penalties(optimization_result.optimal_params)
                print(f"New penalties: {self._get_current_penalty_summary()}")
                self.penalty_optimization_count += 1
                print(f"Applied optimized penalties: best score = {optimization_result.best_score:.4f}")
            else:
                print("Penalty optimization produced invalid results, keeping current penalties")
                
        except Exception as e:
            print(f"Penalty optimization failed: {e}, continuing with current penalties")

    def _intelligent_population_restart(
        self,
        current_population: List[List[ScheduledItem]],
        fitness_scores: List[float],
        best_solution: Optional[List[ScheduledItem]],
    ) -> List[List[ScheduledItem]]:
        """
        Tier 3: Intelligent population restart.
        
        Restarts population while preserving elite solutions and using
        optimized parameters for the new population.
        """
        self.restart_count += 1
        
        # Reset parameters to optimized baseline
        self.parameter_manager.reset_to_baseline()
        new_params = self.parameter_manager.current_params
        
        # Create new population with optimal size
        new_population_size = new_params.population_size
        new_population = []
        
        # Preserve elite solutions (top 10%)
        elite_count = max(1, min(5, int(0.1 * len(current_population))))
        elite_indices = sorted(range(len(fitness_scores)), key=lambda i: fitness_scores[i])[:elite_count]
        
        for idx in elite_indices:
            new_population.append([item.model_copy() for item in current_population[idx]])
        
        # Add the global best if available and not already included
        if best_solution and len(new_population) < elite_count + 1:
            new_population.append([item.model_copy() for item in best_solution])
        
        # Fill rest with fresh random individuals
        while len(new_population) < new_population_size:
            new_population.append(self.initialize_chromosome())
        
        # Update internal population size
        self.population_size = new_population_size
        
        print(f"Population restarted: {new_population_size} individuals "
              f"({len(new_population[:elite_count+1])} elite preserved)")
        
        return new_population

    def _get_current_penalty_summary(self) -> str:
        """Get summary of current penalty values for debugging."""
        penalty_manager = self.penalty_optimizer.penalty_manager
        summary = {}
        
        # Get current penalty values for each soft constraint category
        for param_name in ["room_capacity_overflow_base", "teacher_time_preference_base", 
                          "teacher_room_preference_base", "teacher_consecutive_movement_base",
                          "ects_priority_violation_base", "schedule_compactness_base"]:
            if "room_capacity" in param_name:
                from app.services.SchedulingConstraint import SchedulingConstraintCategory
                config = penalty_manager.get_penalty_config(SchedulingConstraintCategory.ROOM_CAPACITY_OVERFLOW)
            elif "teacher_time" in param_name:
                config = penalty_manager.get_penalty_config(SchedulingConstraintCategory.TEACHER_TIME_PREFERENCE)
            elif "teacher_room" in param_name:
                config = penalty_manager.get_penalty_config(SchedulingConstraintCategory.TEACHER_ROOM_PREFERENCE)
            elif "consecutive_movement" in param_name:
                config = penalty_manager.get_penalty_config(SchedulingConstraintCategory.TEACHER_CONSECUTIVE_MOVEMENT)
            elif "ects_priority" in param_name:
                config = penalty_manager.get_penalty_config(SchedulingConstraintCategory.ECTS_PRIORITY_VIOLATION)
            elif "schedule_compactness" in param_name:
                config = penalty_manager.get_penalty_config(SchedulingConstraintCategory.TEACHER_SCHEDULE_COMPACTNESS)
            else:
                config = None
                
            if config:
                summary[param_name] = f"{config.base_penalty:.1f}"
                
        return str(summary)

    def _print_adaptive_summary(self, metrics: AdaptiveRunMetrics) -> None:
        """Print summary of adaptive optimization results."""
        print("\n" + "="*60)
        print("ADAPTIVE GENETIC ALGORITHM SUMMARY")
        print("="*60)
        print(f"Total generations: {metrics.total_generations}")
        print(f"Best fitness achieved: {metrics.final_fitness:.4f}")
        print(f"Best found at generation: {metrics.best_generation}")
        print(f"Final population diversity: {metrics.final_diversity:.3f}")
        print(f"Total execution time: {metrics.execution_time:.2f}s")
        print("\nAdaptive Interventions:")
        print(f"  Penalty optimizations: {metrics.total_penalty_optimizations}")
        print(f"  Parameter adaptations: {metrics.total_parameter_adaptations}")
        print(f"  Population restarts: {metrics.total_population_restarts}")
        
        if metrics.adaptation_summary.get("total_adaptations", 0) > 0:
            print(f"\nParameter Adaptation Details:")
            for trigger, count in metrics.adaptation_summary.get("adaptations_by_trigger", {}).items():
                print(f"  {trigger} stagnation adaptations: {count}")
        
        print("="*60) 