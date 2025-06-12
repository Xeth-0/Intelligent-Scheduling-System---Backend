from typing import Dict, Any, Optional, Tuple, List
import numpy as np
from dataclasses import dataclass
from app.services.ConvergenceDetector import ConvergenceMetrics


@dataclass
class GAParameters:
    """Container for genetic algorithm parameters."""
    population_size: int
    gene_mutation_rate: float
    chromosome_mutation_rate: float
    tournament_size: int
    elitism_count: int
    crossover_rate: float = 0.8


@dataclass 
class AdaptationHistory:
    """Track parameter adaptation history for learning."""
    generation: int
    trigger_reason: str
    old_params: GAParameters
    new_params: GAParameters
    diversity_before: float
    diversity_after: Optional[float] = None
    fitness_improvement: Optional[float] = None


class AdaptiveParameterManager:
    """
    Manages dynamic adaptation of GA parameters based on population state.
    
    Research basis:
    - Grefenstette (1986): Different parameter combinations for different phases
    - sklearn-genetic-opt: Adaptive scheduling approaches
    - Population sizing: Goldberg & Deb (1992) scaling laws
    """

    def __init__(
        self, 
        initial_params: GAParameters,
        chromosome_length: int,
        adaptation_enabled: bool = True
    ):
        """
        Initialize adaptive parameter manager.
        
        Args:
            initial_params: Starting GA parameters
            chromosome_length: Length of chromosomes (for population sizing)
            adaptation_enabled: Whether to enable parameter adaptation
        """
        self.initial_params = initial_params
        self.current_params = GAParameters(**initial_params.__dict__)
        self.chromosome_length = chromosome_length
        self.adaptation_enabled = adaptation_enabled
        
        # Track adaptation history
        self.adaptation_history: List[AdaptationHistory] = []
        self.current_generation = 0
        
        # Cooldown mechanism to prevent excessive adaptations
        self.last_adaptation_generation = -1
        self.adaptation_cooldown = 50  # Minimum generations between adaptations
        
        # Calculate parameter bounds based on problem size
        self._calculate_parameter_bounds()
        
        # Track parameter effectiveness
        self._parameter_performance: Dict[str, float] = {}

    def _calculate_parameter_bounds(self) -> None:
        """
        Calculate reasonable bounds for GA parameters based on problem size.
        
        Uses established GA research for parameter ranges.
        """
        # Population size bounds (Goldberg & Deb scaling law adaptation)
        self.min_population_size = max(20, int(np.log2(self.chromosome_length) * 5))
        self.max_population_size = min(500, self.chromosome_length * 2)
        
        # Mutation rate bounds (from GA literature)
        self.min_gene_mutation_rate = 0.001  # Per Dejong's settings
        self.max_gene_mutation_rate = 0.5    # High exploration
        
        self.min_chromosome_mutation_rate = 0.05
        self.max_chromosome_mutation_rate = 0.8
        
        # Tournament size bounds
        self.min_tournament_size = 2
        self.max_tournament_size = min(7, max(3, self.current_params.population_size // 10))
        
        # Elitism bounds (5-20% of population)
        self.min_elitism_count = max(1, int(0.05 * self.current_params.population_size))
        self.max_elitism_count = max(2, int(0.2 * self.current_params.population_size))

    def adapt_parameters(
        self, 
        convergence_metrics: ConvergenceMetrics,
        stagnation_severity: str,
        generation: int
    ) -> Tuple[GAParameters, bool]:
        """
        Adapt GA parameters based on current population state.
        
        Args:
            convergence_metrics: Current convergence analysis
            stagnation_severity: Severity level of stagnation
            generation: Current generation number
            
        Returns:
            Tuple of (new_parameters, parameters_changed)
        """
        if not self.adaptation_enabled:
            return self.current_params, False
            
        self.current_generation = generation
        
        # Check cooldown period (except for severe stagnation)
        if (stagnation_severity != 'severe' and 
            generation - self.last_adaptation_generation < self.adaptation_cooldown):
            return self.current_params, False
            
        old_params = GAParameters(**self.current_params.__dict__)
        parameters_changed = False
        
        # Determine adaptation strategy based on state
        if stagnation_severity == 'mild':
            parameters_changed = self._mild_adaptation(convergence_metrics)
        elif stagnation_severity == 'moderate':
            parameters_changed = self._moderate_adaptation(convergence_metrics)
        elif stagnation_severity == 'severe':
            parameters_changed = self._severe_adaptation(convergence_metrics)
        
        # Record adaptation if parameters changed
        if parameters_changed:
            self.last_adaptation_generation = generation
            self._record_adaptation(
                old_params, 
                stagnation_severity,
                convergence_metrics.population_diversity
            )
            
        return self.current_params, parameters_changed

    def _mild_adaptation(self, metrics: ConvergenceMetrics) -> bool:
        """
        Mild adaptation for early stagnation.
        
        Strategy: Slightly increase exploration while maintaining exploitation.
        """
        changed = False
        
        # Increase mutation rates slightly if diversity is low
        if metrics.population_diversity < 0.3:
            new_gene_rate = min(
                self.max_gene_mutation_rate,
                self.current_params.gene_mutation_rate * 1.2
            )
            if new_gene_rate != self.current_params.gene_mutation_rate:
                self.current_params.gene_mutation_rate = new_gene_rate
                changed = True
                
            new_chromosome_rate = min(
                self.max_chromosome_mutation_rate,
                self.current_params.chromosome_mutation_rate * 1.1
            )
            if new_chromosome_rate != self.current_params.chromosome_mutation_rate:
                self.current_params.chromosome_mutation_rate = new_chromosome_rate
                changed = True
        
        return changed

    def _moderate_adaptation(self, metrics: ConvergenceMetrics) -> bool:
        """
        Moderate adaptation for sustained stagnation.
        
        Strategy: Increase exploration more aggressively, adjust selection pressure.
        """
        changed = False
        
        # Significantly increase mutation rates
        new_gene_rate = min(
            self.max_gene_mutation_rate,
            self.current_params.gene_mutation_rate * 1.5
        )
        if new_gene_rate != self.current_params.gene_mutation_rate:
            self.current_params.gene_mutation_rate = new_gene_rate
            changed = True
            
        new_chromosome_rate = min(
            self.max_chromosome_mutation_rate,
            self.current_params.chromosome_mutation_rate * 1.3
        )
        if new_chromosome_rate != self.current_params.chromosome_mutation_rate:
            self.current_params.chromosome_mutation_rate = new_chromosome_rate
            changed = True
        
        # Adjust selection pressure based on diversity
        if metrics.population_diversity < 0.2:
            # Low diversity: reduce selection pressure
            new_tournament_size = max(
                self.min_tournament_size,
                self.current_params.tournament_size - 1
            )
        else:
            # Moderate diversity: increase selection pressure slightly
            new_tournament_size = min(
                self.max_tournament_size,
                self.current_params.tournament_size + 1
            )
            
        if new_tournament_size != self.current_params.tournament_size:
            self.current_params.tournament_size = new_tournament_size
            changed = True
        
        return changed

    def _severe_adaptation(self, metrics: ConvergenceMetrics) -> bool:
        """
        Severe adaptation for prolonged stagnation.
        
        Strategy: Aggressive parameter changes to break out of local optima.
        """
        changed = False
        
        # Maximum exploration settings
        new_gene_rate = min(
            self.max_gene_mutation_rate,
            self.current_params.gene_mutation_rate * 2.0
        )
        if new_gene_rate != self.current_params.gene_mutation_rate:
            self.current_params.gene_mutation_rate = new_gene_rate
            changed = True
            
        new_chromosome_rate = min(
            self.max_chromosome_mutation_rate,
            self.current_params.chromosome_mutation_rate * 1.5
        )
        if new_chromosome_rate != self.current_params.chromosome_mutation_rate:
            self.current_params.chromosome_mutation_rate = new_chromosome_rate
            changed = True
        
        # Reduce selection pressure to maintain diversity
        new_tournament_size = max(
            self.min_tournament_size,
            self.current_params.tournament_size - 2
        )
        if new_tournament_size != self.current_params.tournament_size:
            self.current_params.tournament_size = new_tournament_size
            changed = True
        
        # Increase elitism to preserve good solutions during high mutation
        new_elitism = min(
            self.max_elitism_count,
            self.current_params.elitism_count + 2
        )
        if new_elitism != self.current_params.elitism_count:
            self.current_params.elitism_count = new_elitism
            changed = True
        
        return changed

    def calculate_optimal_population_size(self) -> int:
        """
        Calculate optimal population size based on Goldberg & Deb scaling law.
        
        Returns:
            Recommended population size for current problem
        """
        # Statistical confidence interval method (from Georgia Tech)
        B = 0.05  # Confidence interval parameter
        statistical_size = int((1 + B**(-1)) * (self.chromosome_length + 2))
        
        # Goldberg scaling law adaptation (simplified for practical use)
        log_size = int(np.log2(self.chromosome_length) * 10)
        
        # Use the larger of the two, but cap at reasonable limits
        optimal_size = max(log_size, statistical_size)
        optimal_size = max(self.min_population_size, min(self.max_population_size, optimal_size))
        
        return optimal_size

    def reset_to_baseline(self) -> None:
        """Reset parameters to baseline values for population restart."""
        # Calculate new optimal population size
        optimal_pop_size = self.calculate_optimal_population_size()
        
        # Reset to conservative exploration settings
        self.current_params = GAParameters(
            population_size=optimal_pop_size,
            gene_mutation_rate=self.initial_params.gene_mutation_rate * 0.8,
            chromosome_mutation_rate=self.initial_params.chromosome_mutation_rate * 0.9,
            tournament_size=max(3, min(5, optimal_pop_size // 15)),
            elitism_count=max(2, int(0.1 * optimal_pop_size)),
            crossover_rate=self.initial_params.crossover_rate
        )
        
        # Recalculate bounds for new population size
        self._calculate_parameter_bounds()

    def _record_adaptation(
        self, 
        old_params: GAParameters, 
        trigger_reason: str,
        diversity_before: float
    ) -> None:
        """Record parameter adaptation for learning and analysis."""
        adaptation = AdaptationHistory(
            generation=self.current_generation,
            trigger_reason=trigger_reason,
            old_params=old_params,
            new_params=GAParameters(**self.current_params.__dict__),
            diversity_before=diversity_before
        )
        self.adaptation_history.append(adaptation)

    def get_adaptation_summary(self) -> Dict[str, Any]:
        """Get summary of parameter adaptations for analysis."""
        if not self.adaptation_history:
            return {"total_adaptations": 0}
            
        summary = {
            "total_adaptations": len(self.adaptation_history),
            "adaptations_by_trigger": {},
            "parameter_ranges": {
                "gene_mutation_rate": {
                    "min": min(h.new_params.gene_mutation_rate for h in self.adaptation_history),
                    "max": max(h.new_params.gene_mutation_rate for h in self.adaptation_history),
                    "current": self.current_params.gene_mutation_rate
                },
                "chromosome_mutation_rate": {
                    "min": min(h.new_params.chromosome_mutation_rate for h in self.adaptation_history),
                    "max": max(h.new_params.chromosome_mutation_rate for h in self.adaptation_history),
                    "current": self.current_params.chromosome_mutation_rate
                },
                "tournament_size": {
                    "min": min(h.new_params.tournament_size for h in self.adaptation_history),
                    "max": max(h.new_params.tournament_size for h in self.adaptation_history),
                    "current": self.current_params.tournament_size
                }
            }
        }
        
        # Count adaptations by trigger
        for adaptation in self.adaptation_history:
            trigger = adaptation.trigger_reason
            summary["adaptations_by_trigger"][trigger] = summary["adaptations_by_trigger"].get(trigger, 0) + 1
        
        return summary 