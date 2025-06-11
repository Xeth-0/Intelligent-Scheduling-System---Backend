from app.models import (
    Classroom,
    Course,
    ScheduledItem,
    StudentGroup,
    Teacher,
    Timeslot,
    Constraint,
)
from app.services.Fitness import ScheduleFitnessEvaluator, FitnessReport
from app.services.SchedulingConstraintRegistry import SchedulingConstraintRegistry
from typing import List, Tuple, Optional
import random
import time

# --- GA Parameters ---
MAX_GENERATIONS = 10000
GENE_MUTATION_RATE = (
    0.1  # Probability of mutating a single gene (ScheduledItem's assignment)
)
CHROMOSOME_MUTATION_RATE = 0.2  # Probability that a whole chromosome undergoes mutation
MAX_DURATION_SECONDS = 20  # Increased for potentially longer runs
SELECTION_TOURNAMENT_SIZE = 3
CHROMOSOME_POPULATION_SIZE = 50
ELITISM_COUNT = 2  # Number of best individuals to carry over to the next generation


class GeneticScheduler:
    def __init__(
        self,
        courses: List[Course],
        teachers: List[Teacher],
        rooms: List[Classroom],
        student_groups: List[StudentGroup],
        timeslots: List[Timeslot],
        days: List[str],
        constraints: List[Constraint],
        population_size: int = CHROMOSOME_POPULATION_SIZE,
        gene_mutation_rate: float = GENE_MUTATION_RATE,
        chromosome_mutation_rate: float = CHROMOSOME_MUTATION_RATE,
        use_detailed_fitness: bool = True,
    ):
        self.courses = courses
        self.teachers = teachers
        self.rooms = rooms
        self.student_groups = student_groups
        self.timeslots = timeslots
        self.days = days
        self.population_size = population_size
        self.gene_mutation_rate = gene_mutation_rate
        self.chromosome_mutation_rate = chromosome_mutation_rate
        self.use_detailed_fitness = use_detailed_fitness

        # Initialize the constraint registry
        self.constraint_registry = SchedulingConstraintRegistry(constraints)
        self.constraint_registry.print_summary()

        # Create maps for faster lookups (keeping existing functionality)
        self.teacher_map = {teacher.teacherId: teacher for teacher in teachers}
        self.room_map = {room.classroomId: room for room in rooms}
        self.course_map = {course.courseId: course for course in courses}
        self.student_group_map = {sg.studentGroupId: sg for sg in student_groups}
        self.timeslot_map = {ts.code: ts for ts in timeslots}

        # Initialize the new fitness evaluator with constraint registry
        self.fitness_evaluator = ScheduleFitnessEvaluator(
            teachers,
            rooms,
            student_groups,
            courses,
            timeslots,
            days,
            constraint_registry=self.constraint_registry,
        )

        # For storing detailed fitness reports during evolution
        self.last_generation_reports: List[FitnessReport] = []

    def run(
        self, generations: int = MAX_GENERATIONS
    ) -> Tuple[Optional[List[ScheduledItem]], float, Optional[FitnessReport]]:
        population = self.initialize_population()
        best_solution_overall = None
        best_fitness_overall = float("inf")
        best_report_overall = None

        start_time = time.time()
        generation = 0

        while generation < generations:
            # Evaluate population with detailed fitness
            fitness_scores, fitness_reports = self._evaluate_population(population)
            self.last_generation_reports = fitness_reports

            # Find current best in this generation
            min_fitness_current_gen = min(fitness_scores)
            idx_min_fitness_current_gen = fitness_scores.index(min_fitness_current_gen)

            elapsed_time = time.time() - start_time

            if min_fitness_current_gen < best_fitness_overall:
                best_fitness_overall = min_fitness_current_gen
                best_solution_overall = [
                    item.model_copy()
                    for item in population[idx_min_fitness_current_gen]
                ]
                best_report_overall = fitness_reports[idx_min_fitness_current_gen]

                print(f"Generation {generation} / {generations}", end=" ")
                print(f"New Best Fitness: {best_fitness_overall:.2f}", end=" ")
                print(
                    f"Hard Violations: {best_report_overall.total_hard_violations}",
                    end=" ",
                )
                print(f"Time: {elapsed_time:.2f}s")

            if best_fitness_overall == 0:  # Check for perfect solution
                print(f"Perfect solution found!", end=" ")
                print(f"Generations: {generation}/{generations}", end=" ")
                print(f"Time: {elapsed_time:.2f}s")
                break
            elif elapsed_time > MAX_DURATION_SECONDS:
                print(f"Time limit reached after {generation} generations", end=" ")
                print(f"Best fitness: {best_fitness_overall}", end=" ")
                print(f"Time: {elapsed_time:.2f}s")
                break
            elif generation > 0 and generation % 100 == 0:
                print(f"Generation {generation:>4d}", end=" ")
                print(f"Fitness: {best_fitness_overall}", end=" ")
                print(
                    f"Hard Violations: {best_report_overall.total_hard_violations if best_report_overall else 'N/A'}",
                    end=" ",
                )
                print(f"Time: {elapsed_time:.2f}s")

            population = self.evolve(population, fitness_scores)
            generation += 1

        final_elapsed_time = time.time() - start_time
        if best_fitness_overall > 0:
            print(f"Optimal solution not found after {generation+1} generations.")
            print(f"Time: {final_elapsed_time:.2f}s")
            print(f"Best fitness: {best_fitness_overall}")

        return best_solution_overall, best_fitness_overall, best_report_overall

    def _evaluate_population(
        self, population: List[List[ScheduledItem]]
    ) -> Tuple[List[float], List[FitnessReport]]:
        """Evaluate entire population and return both simple scores and detailed reports."""
        fitness_scores = []
        fitness_reports = []

        for chromosome in population:
            if self.use_detailed_fitness:
                report = self.fitness_evaluator.evaluate(chromosome)
                fitness_reports.append(report)
                # For backward compatibility, use weighted sum as single score
                # Prioritize hard constraints heavily
                score = report.total_hard_violations * 1000 + report.total_soft_penalty
                fitness_scores.append(score)
            else:
                # Fallback to original fitness function
                score = self.fitness(chromosome)  # Keep original method
                fitness_scores.append(score)
                fitness_reports.append(None)

        return fitness_scores, fitness_reports

    def get_best_solution_report(self, schedule: List[ScheduledItem]) -> FitnessReport:
        """Get detailed fitness report for any schedule (for external evaluation)."""
        return self.fitness_evaluator.evaluate(schedule)

    # Keep all existing methods (initialize_population, selection, crossover, mutate, evolve, fitness)
    # for backward compatibility...

    def initialize_population(self) -> List[List[ScheduledItem]]:
        # Keep existing implementation
        if len(self.courses) == 0:
            raise ValueError("No courses to schedule.")

        # Base chromosome template
        base_chromosome: List[ScheduledItem] = []
        for course in self.courses:
            sg_name = "|".join(course.studentGroupIds)
            course_display_name = (
                f"{course.name} - [{course.sessionType[:3]}] | {sg_name}"
            )
            base_chromosome.append(
                ScheduledItem(
                    courseId=course.courseId,
                    courseName=course_display_name,
                    sessionType=course.sessionType,
                    teacherId=course.teacherId,
                    studentGroupIds=course.studentGroupIds,
                    classroomId=random.choice(self.rooms).classroomId,
                    timeslot=random.choice(self.timeslots).code,
                    day=random.choice(self.days),
                )
            )

        self.base_chromosome = base_chromosome

        population: List[List[ScheduledItem]] = []
        for _ in range(self.population_size):
            chromosome = self.initialize_chromosome()
            population.append(chromosome)
        return population

    def initialize_chromosome(self) -> List[ScheduledItem]:
        chromosome: List[ScheduledItem] = []
        for base_gene in self.base_chromosome:
            new_gene = base_gene.model_copy()

            # Heuristic for room selection: try to match room type
            suitable_rooms_for_type = [
                room for room in self.rooms if room.type == new_gene.sessionType
            ]

            chosen_room = None
            if suitable_rooms_for_type:
                chosen_room = random.choice(suitable_rooms_for_type)
            else:
                if not self.rooms:
                    raise ValueError("No rooms available in the system to assign.")
                chosen_room = random.choice(self.rooms)

            new_gene.classroomId = chosen_room.classroomId
            new_gene.timeslot = random.choice(self.timeslots).code
            new_gene.day = random.choice(self.days)
            chromosome.append(new_gene)
        return chromosome

    def selection(
        self, population: List[List[ScheduledItem]], fitness_scores: List[float]
    ) -> List[List[ScheduledItem]]:
        selected_parents: List[List[ScheduledItem]] = []
        for _ in range(len(population)):
            tournament_indices = random.sample(
                range(len(population)), SELECTION_TOURNAMENT_SIZE
            )
            tournament_fitnesses = [fitness_scores[i] for i in tournament_indices]
            winner_local_idx = tournament_fitnesses.index(min(tournament_fitnesses))
            winner_population_idx = tournament_indices[winner_local_idx]
            selected_parents.append(population[winner_population_idx])
        return selected_parents

    def crossover(
        self, parent1: List[ScheduledItem], parent2: List[ScheduledItem]
    ) -> tuple[List[ScheduledItem], List[ScheduledItem]]:
        if len(parent1) != len(parent2):
            raise ValueError("Parents must have the same length for crossover.")
        if len(parent1) <= 1:
            return [item.model_copy() for item in parent1], [
                item.model_copy() for item in parent2
            ]

        point = random.randint(1, len(parent1) - 1)
        child1 = [item.model_copy() for item in parent1[:point]] + [
            item.model_copy() for item in parent2[point:]
        ]
        child2 = [item.model_copy() for item in parent2[:point]] + [
            item.model_copy() for item in parent1[point:]
        ]
        return child1, child2

    def mutate(self, chromosome: List[ScheduledItem]) -> List[ScheduledItem]:
        mutated_chromosome: List[ScheduledItem] = [
            item.model_copy() for item in chromosome
        ]

        for i in range(len(mutated_chromosome)):
            if random.random() < self.gene_mutation_rate:
                item_to_mutate = mutated_chromosome[i]
                mutation_type = random.choice(["room", "time", "day", "all"])

                if mutation_type == "room" or mutation_type == "all":
                    suitable_rooms_for_type = [
                        r for r in self.rooms if r.type == item_to_mutate.sessionType
                    ]
                    new_room: Optional[Classroom] = None
                    if suitable_rooms_for_type:
                        new_room = random.choice(suitable_rooms_for_type)
                    elif self.rooms:
                        new_room = random.choice(self.rooms)

                    if new_room:
                        item_to_mutate.classroomId = new_room.classroomId

                if mutation_type == "time" or mutation_type == "all":
                    item_to_mutate.timeslot = random.choice(self.timeslots).code

                if mutation_type == "day" or mutation_type == "all":
                    item_to_mutate.day = random.choice(self.days)
        return mutated_chromosome

    def evolve(
        self, population: List[List[ScheduledItem]], fitness_scores: List[float]
    ) -> List[List[ScheduledItem]]:
        new_population: List[List[ScheduledItem]] = []

        # Elitism
        sorted_population_indices = sorted(
            range(len(population)), key=lambda k: fitness_scores[k]
        )
        for i in range(ELITISM_COUNT):
            if i < len(sorted_population_indices):
                elite = population[sorted_population_indices[i]]
                new_population.append([item.model_copy() for item in elite])

        # Generate offspring
        parents = self.selection(population, fitness_scores)
        num_offspring_needed = self.population_size - ELITISM_COUNT
        offspring_generated = 0
        parent_idx = 0

        while offspring_generated < num_offspring_needed:
            if parent_idx + 1 < len(parents):
                p1 = parents[parent_idx]
                p2 = parents[parent_idx + 1]
                child1, child2 = self.crossover(p1, p2)
                parent_idx += 2

                if random.random() < self.chromosome_mutation_rate:
                    new_population.append(self.mutate(child1))
                else:
                    new_population.append(child1)
                offspring_generated += 1

                if offspring_generated < num_offspring_needed:
                    if random.random() < self.chromosome_mutation_rate:
                        new_population.append(self.mutate(child2))
                    else:
                        new_population.append(child2)
                    offspring_generated += 1
            else:
                if parent_idx < len(parents):
                    p_last = parents[parent_idx]
                    if random.random() < self.chromosome_mutation_rate:
                        new_population.append(self.mutate(p_last))
                    else:
                        new_population.append([item.model_copy() for item in p_last])
                    offspring_generated += 1
                    parent_idx += 1
                else:
                    new_population.append(self.initialize_chromosome())
                    offspring_generated += 1

        return new_population[: self.population_size]

    def fitness(self, chromosome: List[ScheduledItem]) -> float:
        report = self.fitness_evaluator.evaluate(chromosome)
        return report.total_hard_violations * 1000 + report.total_soft_penalty
