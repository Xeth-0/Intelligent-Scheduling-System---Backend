from typing import Dict, List, Any
import numpy as np
from app.services.PenaltyManager import PenaltyConfig
from app.services.Fitness import ScheduleFitnessEvaluator
from app.services.SchedulingConstraint import SchedulingConstraintCategory

try:
    from skopt import gp_minimize  # type: ignore
    from skopt.space import Real  # type: ignore
    from skopt.utils import use_named_args  # type: ignore
    SKOPT_AVAILABLE = True
except ImportError:
    SKOPT_AVAILABLE = False
    print(
        "Warning: scikit-optimize not available. PenaltyOptimizer will use basic grid search."
    )
    # Mock implementations when scikit-optimize is not available
    gp_minimize = None  # type: ignore
    
    class Real:
        def __init__(self, low, high, name):
            self.low = low
            self.high = high
            self.name = name

    def use_named_args(space):
        def decorator(func):
            return func
        return decorator


class OptimizationResult:
    """Results from penalty optimization."""

    def __init__(
        self,
        optimal_params: Dict[str, float],
        best_score: float,
        optimization_history: List[Dict[str, Any]],
    ):
        self.optimal_params = optimal_params
        self.best_score = best_score
        self.optimization_history = optimization_history


class PenaltyOptimizer:
    """
    Bayesian optimization for penalty parameter tuning.
    Maintains safety constraints to ensure hard constraints always dominate soft constraints.
    """

    def __init__(self, fitness_evaluator: ScheduleFitnessEvaluator):
        self.fitness_evaluator = fitness_evaluator
        self.penalty_manager = fitness_evaluator.penalty_manager

        # Define search space for penalty parameters
        # Only optimize soft constraint penalties to maintain safety
        self.search_space = [
            Real(1.0, 50.0, name="room_capacity_overflow_base"),
            Real(1.0, 20.0, name="teacher_time_preference_base"),
            Real(1.0, 15.0, name="teacher_room_preference_base"),
            Real(1.0, 25.0, name="teacher_consecutive_movement_base"),
            Real(1.0, 15.0, name="student_consecutive_movement_base"),
            Real(1.0, 10.0, name="ects_priority_violation_base"),
            Real(1.0, 20.0, name="schedule_compactness_base"),
        ]

        # Safety constraints - these are immutable
        self.safety_bounds = {
            "min_hard_soft_separation": 100.0,  # Hard penalties must be at least 100x larger than max soft
            "max_individual_soft_penalty": self.penalty_manager.max_soft_penalty,
            "min_penalty": 0.1,
        }

        self.optimization_history: List[Dict[str, Any]] = []

    def objective_function(self, penalty_params: Dict[str, float]) -> float:
        """
        Objective function for optimization.

        Args:
            penalty_params: Dictionary of penalty parameter names to values

        Returns:
            Objective score to minimize (lower is better)
        """
        if not self._validate_safety_constraints(penalty_params):
            return 1e6  # Return very bad score for invalid configurations

        # Update penalty manager with new parameters
        original_configs = self._backup_penalty_configs()
        self._update_penalty_manager(penalty_params)

        try:
            # Run multiple evaluation trials for statistical significance
            scores = []
            for _ in range(3):  # 3 trials for balance between accuracy and speed
                trial_score = self._evaluate_penalty_configuration()
                scores.append(trial_score)

            # Calculate combined objective
            avg_score = np.mean(scores)
            score_variance = np.var(scores)  # Prefer consistent configurations

            # Combined objective (minimize both average score and variance)
            objective = avg_score + (score_variance * 0.1)

            # Record this trial
            self.optimization_history.append(
                {
                    "parameters": penalty_params.copy(),
                    "score": avg_score,
                    "variance": score_variance,
                    "objective": objective,
                }
            )

            return float(objective)

        finally:
            # Restore original penalty configurations
            self._restore_penalty_configs(original_configs)

    def _validate_safety_constraints(self, penalty_params: Dict[str, float]) -> bool:
        """Ensure penalty parameters meet safety requirements."""
        # Check individual bounds
        for param_name, value in penalty_params.items():
            if value < self.safety_bounds["min_penalty"]:
                return False
            if value > self.safety_bounds["max_individual_soft_penalty"]:
                return False

        # Estimate maximum possible soft penalty total
        max_estimated_soft_total = sum(penalty_params.values()) * 10

        # Ensure hard constraints will still dominate
        min_hard_penalty = self.penalty_manager.min_hard_penalty
        if max_estimated_soft_total >= min_hard_penalty:
            return False

        return True

    def _backup_penalty_configs(self) -> Dict[SchedulingConstraintCategory, PenaltyConfig]:
        """
        Backup current penalty configurations.
          (Just a copy of the current penalty configurations.)
        """
        return {
            category: PenaltyConfig(
                base_penalty=config.base_penalty,
                multiplier=config.multiplier,
                max_penalty=config.max_penalty,
                strategy=config.strategy,
            )
            for category, config in self.penalty_manager._penalty_configs.items()
        }

    def _restore_penalty_configs(
        self, configs: Dict[SchedulingConstraintCategory, PenaltyConfig]
    ) -> None:
        """Restore penalty configurations from backup."""
        for category, config in configs.items():
            self.penalty_manager._penalty_configs[category] = config

    def _update_penalty_manager(self, penalty_params: Dict[str, float]) -> None:
        """Update penalty manager with new parameters."""
        param_mapping = {
            "room_capacity_overflow_base": SchedulingConstraintCategory.ROOM_CAPACITY_OVERFLOW,
            "teacher_time_preference_base": SchedulingConstraintCategory.TEACHER_TIME_PREFERENCE,
            "teacher_room_preference_base": SchedulingConstraintCategory.TEACHER_ROOM_PREFERENCE,
            "teacher_consecutive_movement_base": SchedulingConstraintCategory.TEACHER_CONSECUTIVE_MOVEMENT,
            "ects_priority_violation_base": SchedulingConstraintCategory.ECTS_PRIORITY_VIOLATION,
            # "schedule_compactness_base": SchedulingConstraintCategory.SCHEDULE_COMPACTNESS,
        }

        for param_name, value in penalty_params.items():
            if param_name in param_mapping:
                category = param_mapping[param_name]
                config = self.penalty_manager.get_penalty_config(category)
                if config:
                    config.base_penalty = value

    def _evaluate_penalty_configuration(self) -> float:
        """
        Evaluate current penalty configuration using a mock or real scheduling trial.
        This should be replaced with actual GA evaluation when integrated.
        """
        # For now, return a mock score based on penalty balance
        # In real implementation, this would run the GA with current penalties

        # Simple heuristic: prefer balanced penalties
        soft_configs = [
            self.penalty_manager.get_penalty_config(cat)
            for cat in [
                SchedulingConstraintCategory.ROOM_CAPACITY_OVERFLOW,
                SchedulingConstraintCategory.TEACHER_TIME_PREFERENCE,
                SchedulingConstraintCategory.TEACHER_ROOM_PREFERENCE,
                SchedulingConstraintCategory.TEACHER_CONSECUTIVE_MOVEMENT,
                SchedulingConstraintCategory.ECTS_PRIORITY_VIOLATION,
            ]
            if self.penalty_manager.get_penalty_config(cat) is not None
        ]

        penalty_values = [
            config.base_penalty for config in soft_configs if config is not None
        ]

        # Prefer moderate, balanced penalties
        balance_score = np.std(penalty_values)  # Lower variance is better
        magnitude_score = abs(np.mean(penalty_values) - 10.0)  # Prefer around 10.0

        return float(balance_score + magnitude_score)

    def optimize_penalties(
        self, n_calls: int = 30, random_state: int = 42
    ) -> OptimizationResult:
        """
        Run optimization to find optimal penalty parameters.

        Args:
            n_calls: Number of optimization iterations
            random_state: Random seed for reproducibility

        Returns:
            OptimizationResult with optimal parameters and history
        """
        if not SKOPT_AVAILABLE:
            return self._fallback_grid_search()

        # Create objective function compatible with skopt
        @use_named_args(self.search_space)
        def skopt_objective(**params):
            return self.objective_function(params)

        # Get initial point from current configuration
        initial_point = self._get_current_penalty_point()

        # Run Bayesian optimization
        result = gp_minimize(  # type: ignore
            func=skopt_objective,
            dimensions=self.search_space,
            n_calls=n_calls,
            x0=initial_point,
            acq_func="EI",  # Expected Improvement
            random_state=random_state,
        )

        # Extract optimal parameters
        optimal_params = {
            dim.name: value for dim, value in zip(self.search_space, result.x)  # type: ignore
        }

        return OptimizationResult(
            optimal_params=optimal_params,
            best_score=result.fun,  # type: ignore
            optimization_history=self.optimization_history,
        )

    def _get_current_penalty_point(self) -> List[float]:
        """Get current penalty configuration as initial point for optimization."""
        current_point = []

        for dim in self.search_space:
            param_name = dim.name
            if param_name == "room_capacity_overflow_base":
                config = self.penalty_manager.get_penalty_config(
                    SchedulingConstraintCategory.ROOM_CAPACITY_OVERFLOW
                )
            elif param_name == "teacher_time_preference_base":
                config = self.penalty_manager.get_penalty_config(
                    SchedulingConstraintCategory.TEACHER_TIME_PREFERENCE
                )
            elif param_name == "teacher_room_preference_base":
                config = self.penalty_manager.get_penalty_config(
                    SchedulingConstraintCategory.TEACHER_ROOM_PREFERENCE
                )
            elif param_name == "teacher_consecutive_movement_base":
                config = self.penalty_manager.get_penalty_config(
                    SchedulingConstraintCategory.TEACHER_CONSECUTIVE_MOVEMENT
                )
            elif param_name == "ects_priority_violation_base":
                config = self.penalty_manager.get_penalty_config(
                    SchedulingConstraintCategory.ECTS_PRIORITY_VIOLATION
                )
            # elif param_name == "schedule_compactness_base":
            #     config = self.penalty_manager.get_penalty_config(
            #         SchedulingConstraintCategory.SCHEDULE_COMPACTNESS
            #     )
            else:
                config = None

            if config is not None:
                current_point.append(config.base_penalty)
            else:
                current_point.append(10.0)  # Default value

        return current_point

    def _fallback_grid_search(self) -> OptimizationResult:
        """Fallback optimization method when scikit-optimize is not available."""
        # Simple grid search over a few key parameters
        best_score = float("inf")
        best_params = {}
        history = []

        # Coarse grid search
        for room_overflow in [5.0, 10.0, 15.0]:
            for teacher_time in [3.0, 6.0, 12.0]:
                for movement in [5.0, 10.0, 15.0]:
                    params = {
                        "room_capacity_overflow_base": room_overflow,
                        "teacher_time_preference_base": teacher_time,
                        "teacher_room_preference_base": teacher_time * 0.5,
                        "teacher_consecutive_movement_base": movement,
                        "student_consecutive_movement_base": movement * 0.5,
                        "ects_priority_violation_base": 5.0,
                        "schedule_compactness_base": 7.0,
                    }

                    score = self.objective_function(params)
                    history.append({"parameters": params, "score": score})

                    if score < best_score:
                        best_score = score
                        best_params = params.copy()

        return OptimizationResult(
            optimal_params=best_params,
            best_score=best_score,
            optimization_history=history,
        )

    def apply_optimal_penalties(self, optimal_params: Dict[str, float]) -> None:
        """Apply optimized penalty parameters to the penalty manager."""
        if self._validate_safety_constraints(optimal_params):
            self._update_penalty_manager(optimal_params)
        else:
            raise ValueError("Optimal parameters violate safety constraints")

    def validate_optimization_result(self, result: OptimizationResult) -> bool:
        """Validate that optimization result meets all safety requirements."""
        return self._validate_safety_constraints(result.optimal_params)
