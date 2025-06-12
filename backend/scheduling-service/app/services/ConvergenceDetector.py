from typing import List, Dict, Any, Tuple
import numpy as np
from app.models import ScheduledItem
from dataclasses import dataclass


@dataclass
class ConvergenceMetrics:
    """Metrics for tracking convergence state."""
    population_diversity: float
    fitness_improvement: float
    generations_without_improvement: int
    is_converged: bool
    diversity_by_gene: List[float]


class ConvergenceDetector:
    """
    Detects population convergence using Jeffrey Horn's bit-wise convergence measure
    and fitness stagnation analysis.
    
    Research basis: Horn (1993) - "bit-wise average convergence measure"
    from Georgia Tech GA Parameters documentation.
    """

    def __init__(
        self, 
        window_size: int = 20,
        diversity_threshold: float = 0.4,
        fitness_threshold: float = 0.01
    ):
        """
        Initialize convergence detector.
        
        Args:
            window_size: Number of generations to track for improvement analysis
            diversity_threshold: Below this diversity level, population is considered converged
            fitness_threshold: Minimum improvement rate required to avoid stagnation
        """
        self.window_size = window_size
        self.diversity_threshold = diversity_threshold
        self.fitness_threshold = fitness_threshold
        
        # Track history
        self.fitness_history: List[float] = []
        self.diversity_history: List[float] = []
        self.best_fitness_generation: int = 0
        self.current_generation: int = 0

    def check_convergence(
        self, 
        population: List[List[ScheduledItem]], 
        fitness_scores: List[float]
    ) -> ConvergenceMetrics:
        """
        Check if population has converged using multi-criteria analysis.
        
        Args:
            population: Current GA population
            fitness_scores: Fitness scores for each chromosome
            
        Returns:
            ConvergenceMetrics with detailed convergence analysis
        """
        current_best_fitness = min(fitness_scores)
        population_diversity = self._calculate_population_diversity(population)
        
        # Update histories
        self.fitness_history.append(current_best_fitness)
        self.diversity_history.append(population_diversity)
        self.current_generation += 1
        
        # Check for fitness improvement
        if len(self.fitness_history) >= 2:
            if current_best_fitness < self.fitness_history[-2]:
                self.best_fitness_generation = self.current_generation
        
        # Calculate improvement metrics
        fitness_improvement = self._calculate_fitness_improvement()
        generations_without_improvement = self.current_generation - self.best_fitness_generation
        
        # Determine convergence
        is_converged = self._determine_convergence(
            population_diversity, 
            fitness_improvement, 
            generations_without_improvement
        )
        
        # Calculate diversity by gene for detailed analysis
        diversity_by_gene = self._calculate_diversity_by_gene(population)
        
        return ConvergenceMetrics(
            population_diversity=population_diversity,
            fitness_improvement=fitness_improvement,
            generations_without_improvement=generations_without_improvement,
            is_converged=is_converged,
            diversity_by_gene=diversity_by_gene
        )

    def _calculate_population_diversity(self, population: List[List[ScheduledItem]]) -> float:
        """
        Calculate population diversity using bit-wise convergence measure.
        
        For each gene position (course), calculate the percentage of unique assignments
        across the population, then average across all gene positions.
        
        Returns value between 0.0 (no diversity) and 1.0 (maximum diversity).
        """
        if len(population) < 2:
            return 1.0
            
        if not population or not population[0]:
            return 0.0
            
        gene_count = len(population[0])
        total_diversity = 0.0
        
        for gene_idx in range(gene_count):
            # For this gene position, collect all unique assignments
            assignments = set()
            
            for chromosome in population:
                if gene_idx < len(chromosome):
                    gene = chromosome[gene_idx]
                    # Create assignment tuple: (classroom, timeslot, day)
                    assignment = (gene.classroomId, gene.timeslot, gene.day, gene.courseId)
                    assignments.add(assignment)
            
            # Calculate diversity for this gene position
            gene_diversity = len(assignments) / len(population)
            total_diversity += gene_diversity
        
        return total_diversity / gene_count if gene_count > 0 else 0.0

    def _calculate_diversity_by_gene(self, population: List[List[ScheduledItem]]) -> List[float]:
        """Calculate diversity for each gene position separately for detailed analysis."""
        if not population or not population[0]:
            return []
            
        gene_count = len(population[0])
        diversity_by_gene = []
        
        for gene_idx in range(gene_count):
            assignments = set()
            
            for chromosome in population:
                if gene_idx < len(chromosome):
                    gene = chromosome[gene_idx]
                    assignment = (gene.classroomId, gene.timeslot, gene.day, gene.courseId)
                    assignments.add(assignment)
            
            gene_diversity = len(assignments) / len(population)
            diversity_by_gene.append(gene_diversity)
        
        return diversity_by_gene

    def _calculate_fitness_improvement(self) -> float:
        """
        Calculate relative fitness improvement over the tracking window.
        
        Returns the percentage improvement from window_size generations ago
        to the current generation.
        """
        if len(self.fitness_history) < self.window_size:
            return float('inf')  # Not enough history, assume improving
            
        old_fitness = self.fitness_history[-self.window_size]
        current_fitness = self.fitness_history[-1]
        
        if old_fitness == 0:
            return 0.0 if current_fitness == 0 else float('-inf')
            
        # Calculate relative improvement (negative values indicate worsening)
        improvement = (old_fitness - current_fitness) / abs(old_fitness)
        return improvement

    def _determine_convergence(
        self, 
        diversity: float, 
        improvement: float, 
        generations_without_improvement: int
    ) -> bool:
        """
        Determine if population has converged based on multiple criteria.
        
        Convergence is detected when:
        1. Population diversity falls below threshold AND
        2. Either fitness improvement is below threshold OR
           no improvement for extended period
        """
        diversity_converged = diversity < self.diversity_threshold
        fitness_stagnant = (
            improvement < self.fitness_threshold or 
            generations_without_improvement > self.window_size * 2
        )
        
        return diversity_converged and fitness_stagnant

    def reset(self) -> None:
        """Reset the convergence detector for a new run."""
        self.fitness_history.clear()
        self.diversity_history.clear()
        self.best_fitness_generation = 0
        self.current_generation = 0

    def get_stagnation_severity(self, generations: int) -> str:
        """
        Classify the severity of stagnation for intervention decisions.
        
        Returns:
            'none': No stagnation
            'mild': Early stagnation (20-50 generations)
            'moderate': Moderate stagnation (50-100 generations)  
            'severe': Severe stagnation (100+ generations)
        """
        generations_without_improvement = self.current_generation - self.best_fitness_generation
        
        # Use absolute thresholds that make more sense for practical GA runs
        if generations_without_improvement < 50:
            return 'none'
        elif generations_without_improvement < 150:
            return 'mild'
        elif generations_without_improvement < 300:
            return 'moderate'
        else:
            return 'severe' 