from app.models.models import StudentGroup, Course, Teacher, Classroom, ScheduledItem
import time
import random

# --- GA Parameters ---
MAX_GENERATIONS = 10000  # Consider adjusting based on problem size and performance
GENE_MUTATION_RATE = (
    0.1  # Probability of mutating a single gene (ScheduledItem's assignment)
)
CHROMOSOME_MUTATION_RATE = 0.2  # Probability that a whole chromosome undergoes mutation
MAX_DURATION_SECONDS = 20  # Increased for potentially longer runs
SELECTION_TOURNAMENT_SIZE = 3
CHROMOSOME_POPULATION_SIZE = 50
ELITISM_COUNT = 2  # Number of best individuals to carry over to the next generation

# --- Penalties ---
# All hard constraints have high penalties. Ensure they are significantly higher than any potential soft constraint penalties.
penalties = {
    "room_capacity": 200,
    "teacher_wheelchair_accessibility": 1000,
    "student_group_wheelchair_accessibility": 1000,
    "room_conflict": 1000,
    "teacher_conflict": 1000,
    "student_group_conflict": 1000,
    "course_not_scheduled": 5000,  # Should ideally not happen if initialization is correct and crossover/mutation preserve all items.
    "room_type_conflict": 1000,
}


class GeneticScheduler:
    def __init__(
        self,
        courses: list[Course],
        teachers: list[Teacher],
        rooms: list[Classroom],
        student_groups: list[StudentGroup],
        timeslots: list[str],  # List of valid timeslot IDs
        days: list[str],  # List of valid day strings
        population_size: int = CHROMOSOME_POPULATION_SIZE,
        gene_mutation_rate: float = GENE_MUTATION_RATE,
        chromosome_mutation_rate: float = CHROMOSOME_MUTATION_RATE,
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

        # Create maps for faster lookups
        self.teacher_map = {teacher.teacherId: teacher for teacher in teachers}
        self.room_map = {room.classroomId: room for room in rooms}
        self.course_map = {course.courseId: course for course in courses}
        self.student_group_map = {sg.studentGroupId: sg for sg in student_groups}

    def run(
        self, generations: int = MAX_GENERATIONS
    ) -> tuple[list[ScheduledItem] | None, float]:
        population = self.initialize_population()
        best_solution_overall = None
        best_fitness_overall = float("inf")

        start_time = time.time()
        generation = 0

        while generation < generations:
            fitness_scores = [self.fitness(chromosome) for chromosome in population]

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

                print(f"Generation {generation} / {generations}", end=" ")
                print(f"New Best Fitness: {best_fitness_overall:.2f}", end=" ")
                print(f"Time: {elapsed_time:.2f}s")

            if best_fitness_overall == 0:  # Check for perfect solution
                print(f"Perfect solution found!", end=" ")
                print(f"Generations: {generation}/{generations}", end=" ")
                print(f"Fitness: {best_fitness_overall}", end=" ")
                print(f"Time: {elapsed_time:.2f}s")
                break
            elif elapsed_time > MAX_DURATION_SECONDS:  # Check for timeout
                print(f"Time limit reached after {generation} generations", end=" ")
                print(f"Best fitness: {best_fitness_overall}", end=" ")
                print(f"Time: {elapsed_time:.2f}s")
                break
            elif generation > 0 and generation % 100 == 0:  # Just log progress
                print(f"Generation {generation:>4d}", end=" ")
                print(f"Fitness: {best_fitness_overall}", end=" ")
                print(f"Time: {elapsed_time:.2f}s")

            population = self.evolve(population, fitness_scores)
            generation += 1

        final_elapsed_time = time.time() - start_time
        if best_fitness_overall > 0:
            print(f"Optimal solution not found after {generation+1} generations.")
            print(f"Time: {final_elapsed_time:.2f}s")
            print(f"Best fitness: {best_fitness_overall}")

        return best_solution_overall, best_fitness_overall

    def initialize_population(self) -> list[list[ScheduledItem]]:
        if len(self.courses) == 0:
            raise ValueError("No courses to schedule.")

        # Base
        base_chromosome: list[ScheduledItem] = []
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
                    timeslot=random.choice(self.timeslots),
                    day=random.choice(self.days),
                )
            )

        self.base_chromosome = base_chromosome

        population: list[list[ScheduledItem]] = []
        for _ in range(self.population_size):
            chromosome = self.initialize_chromosome()
            population.append(chromosome)
        return population

    def initialize_chromosome(self) -> list[ScheduledItem]:
        """
        Initializes a chromosome by assigning a random timeslot, day, and a heuristically chosen room
        to each base scheduled item.
        """
        chromosome: list[ScheduledItem] = []
        for base_gene in self.base_chromosome:
            # new_gene = base_gene.copy()
            new_gene = base_gene.model_copy()

            # Heuristic for room selection: try to match room type
            suitable_rooms_for_type = [
                room for room in self.rooms if room.type == new_gene.sessionType
            ]

            chosen_room = None
            if suitable_rooms_for_type:
                chosen_room = random.choice(suitable_rooms_for_type)
            else:  # Fallback: if no room of the specific type, pick any room
                # This will be penalized by the fitness function.
                if not self.rooms:
                    raise ValueError("No rooms available in the system to assign.")
                chosen_room = random.choice(self.rooms)

            new_gene.classroomId = chosen_room.classroomId
            new_gene.timeslot = random.choice(self.timeslots)
            new_gene.day = random.choice(self.days)
            chromosome.append(base_gene)
        return chromosome

    def selection(
        self, population: list[list[ScheduledItem]], fitness_scores: list[float]
    ) -> list[list[ScheduledItem]]:
        """Tournament selection."""
        selected_parents: list[list[ScheduledItem]] = []
        for _ in range(len(population)):  # Select N parents for N offspring
            tournament_indices = random.sample(
                range(len(population)), SELECTION_TOURNAMENT_SIZE
            )
            tournament_fitnesses = [fitness_scores[i] for i in tournament_indices]

            # Find the index of the winner within the tournament_indices list
            winner_local_idx = tournament_fitnesses.index(min(tournament_fitnesses))
            # Get the actual index in the population
            winner_population_idx = tournament_indices[winner_local_idx]
            selected_parents.append(population[winner_population_idx])
        return selected_parents

    def crossover(self, parent1: list[ScheduledItem], parent2: list[ScheduledItem]):
        """
        Performs single-point crossover.
        Since each index in the chromosome corresponds to a specific pre-defined ScheduledItem template,
        this method correctly swaps assignments for items after the crossover point.
        """
        if len(parent1) != len(parent2):  # Should not happen if initialized correctly
            raise ValueError("Parents must have the same length for crossover.")
        if len(parent1) <= 1:  # Cannot perform crossover on length 1
            return parent1[:], parent2[:]  # Return copies

        point = random.randint(1, len(parent1) - 1)
        child1 = parent1[:point] + parent2[point:]
        child2 = parent2[:point] + parent1[point:]
        return child1, child2

    def mutate(self, chromosome: list[ScheduledItem]) -> list[ScheduledItem]:
        """
        Mutates a chromosome by potentially changing the room, timeslot, or day
        for some of its ScheduledItems (genes).
        """
        mutated_chromosome: list[ScheduledItem] = [
            item.model_copy() for item in chromosome
        ]

        for i in range(len(mutated_chromosome)):
            if (
                random.random() < self.gene_mutation_rate
            ):  # Chance to mutate this specific gene (ScheduledItem)
                item_to_mutate = mutated_chromosome[i]
                mutation_type = random.choice(
                    ["room", "time", "day", "all"]
                )  # Added "all" for a bigger jump

                if mutation_type == "room" or mutation_type == "all":
                    # Heuristic: try to pick a room of the correct type
                    suitable_rooms_for_type = [
                        r for r in self.rooms if r.type == item_to_mutate.sessionType
                    ]
                    new_room: Classroom | None = None
                    if suitable_rooms_for_type:
                        new_room = random.choice(suitable_rooms_for_type)
                    elif self.rooms:  # Fallback to any room
                        new_room = random.choice(self.rooms)

                    if new_room:
                        item_to_mutate.classroomId = new_room.classroomId

                if mutation_type == "time" or mutation_type == "all":
                    item_to_mutate.timeslot = random.choice(self.timeslots)

                if mutation_type == "day" or mutation_type == "all":
                    item_to_mutate.day = random.choice(self.days)
        return mutated_chromosome

    def evolve(
        self, population: list[list[ScheduledItem]], fitness_scores: list[float]
    ) -> list[list[ScheduledItem]]:
        new_population: list[list[ScheduledItem]] = []

        # * Elitism: Carry over the best individuals
        sorted_population_indices = sorted(
            range(len(population)), key=lambda k: fitness_scores[k]
        )
        for i in range(ELITISM_COUNT):
            if i < len(sorted_population_indices):
                new_population.append(population[sorted_population_indices[i]])

        # Fill the rest of the population with offspring
        parents = self.selection(
            population, fitness_scores
        )  # Select parents from the current population

        num_offspring_needed = self.population_size - ELITISM_COUNT
        offspring_generated = 0

        # Generate offspring through crossover and mutation
        # Ensure we generate enough offspring, handling odd parent counts
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
            else:  # Odd number of parents, or not enough pairs left
                # Take the last parent, mutate it, and add it
                if parent_idx < len(parents):
                    p_last = parents[parent_idx]
                    if random.random() < self.chromosome_mutation_rate:
                        new_population.append(self.mutate(p_last))
                    else:
                        new_population.append(p_last)
                    offspring_generated += 1
                    parent_idx += 1
                else:  # Should not happen if selection returns enough parents
                    print(
                        "Warning: Not enough parents to generate required offspring. Filling with random."
                    )
                    new_population.append(self.initialize_chromosome())
                    offspring_generated += 1

        return new_population[
            : self.population_size
        ]  # Ensure population size is maintained

    def fitness(self, chromosome: list[ScheduledItem]):
        total_penalty = 0

        # Maps for conflict detection. Key: (resource_id, day, timeslot), Value: count or first ScheduledItem
        room_schedule_tracker = {}
        teacher_schedule_tracker = {}
        student_group_schedule_tracker = {}

        # For debugging constraint violations
        # constraint_violations_log = {}

        if len(chromosome) != len(self.base_chromosome):
            # This indicates a severe problem with chromosome generation/crossover/mutation
            # if chromosomes can change length or lose/gain essential items.
            # With the current base_scheduled_items_template approach, this shouldn't happen.
            total_penalty += penalties["course_not_scheduled"] * abs(
                len(chromosome) - len(self.base_chromosome)
            )
            print(
                f"CRITICAL: Chromosome length mismatch. Expected {len(self.base_chromosome)}, got {len(chromosome)}"
            )
            return float("inf")

        for _, scheduled_item in enumerate(chromosome):
            item_penalty = 0
            # violation_reasons_for_item = [] # For detailed logging

            course = self.course_map.get(scheduled_item.courseId)
            room = self.room_map.get(scheduled_item.classroomId)
            teacher = self.teacher_map.get(scheduled_item.teacherId)
            student_group_count = 0

            if not course or not room or not teacher:
                # This indicates bad data or an issue with how IDs are being assigned
                # print(f"Warning: Missing data for scheduled_item: C:{scheduled_item.courseId}, R:{scheduled_item.classroomId}, T:{scheduled_item.teacherId}")
                total_penalty += (
                    1000000  # Severe penalty for missing core data # ! Magic value used
                )
                continue

            for sg_id in scheduled_item.studentGroupIds:
                student_group = self.student_group_map.get(sg_id)
                if student_group:
                    student_group_count += student_group.size
                else:
                    # print(f"Warning: Student group ID '{sg_id}' not found in map for course '{scheduled_item.courseName}'.")
                    item_penalty += penalties[
                        "student_group_conflict"
                    ]  # Or a specific "data_missing" penalty

            if scheduled_item.timeslot == "" or scheduled_item.day == "":
                item_penalty += penalties["course_not_scheduled"] * 5

            # Hard Constraint 1. Room Capacity
            if room.capacity < student_group_count:
                item_penalty += penalties["room_capacity"]
                # violation_reasons_for_item.append(f"RoomCap (Need:{current_students_count} > Has:{room.capacity})")

            # Hard Constraint 2. Teacher Wheelchair Accessibility
            if (
                teacher.needsWheelchairAccessibleRoom
                and not room.isWheelchairAccessible
            ):
                item_penalty += penalties["teacher_wheelchair_accessibility"]
                # violation_reasons_for_item.append("TeachAccess")

            # Hard Constraint 3. Room Type
            if room.type != scheduled_item.sessionType:
                item_penalty += penalties["room_type_conflict"]
                # violation_reasons_for_item.append(f"RoomType (Need:{scheduled_item.sessionType} != Has:{room.type})")

            # Time-based Conflict Checks
            time_key_room = (
                scheduled_item.classroomId,
                scheduled_item.day,
                scheduled_item.timeslot,
            )
            time_key_teacher = (
                scheduled_item.teacherId,
                scheduled_item.day,
                scheduled_item.timeslot,
            )

            # Hard Constraint 4. Room Conflict
            if time_key_room in room_schedule_tracker:
                item_penalty += penalties["room_conflict"]
                # violation_reasons_for_item.append(f"RoomConflict (with {room_schedule[time_key_room].courseName})")
            else:  # Mark as occupied by this item
                room_schedule_tracker[time_key_room] = scheduled_item

            # Hard Constraint 5. Teacher Conflict
            if time_key_teacher in teacher_schedule_tracker:
                item_penalty += penalties["teacher_conflict"]
                # violation_reasons_for_item.append(f"TeachConflict (with {teacher_schedule[time_key_teacher].courseName})")
            else:  # Mark as occupied by this item
                teacher_schedule_tracker[time_key_teacher] = scheduled_item

            # Student Group Conflicts
            for sg_id in scheduled_item.studentGroupIds:
                student_group = self.student_group_map.get(sg_id)
                if not student_group:
                    # This indicates a severe problem with chromosome generation/crossover/mutation
                    # if chromosomes can change length or lose/gain essential items.
                    # With the current base_scheduled_items_template approach, this shouldn't happen.
                    total_penalty += penalties["course_not_scheduled"] * abs(
                        len(chromosome) - len(self.base_chromosome)
                    )
                    continue

                # Hard Constraint 6. Student Group Conflict
                time_key_student_group = (
                    sg_id,
                    scheduled_item.day,
                    scheduled_item.timeslot,
                )
                if time_key_student_group in student_group_schedule_tracker:
                    item_penalty += penalties["student_group_conflict"]
                    # violation_reasons_for_item.append(f"StudGrpConflict {sg_id} (with {student_group_schedule[time_key_student_group].courseName})")
                else:
                    student_group_schedule_tracker[time_key_student_group] = (
                        scheduled_item
                    )

                # Hard Constraint 7. Student Group Wheelchair Accessibility
                if (
                    student_group.accessibilityRequirement
                    and not room.isWheelchairAccessible
                ):
                    item_penalty += penalties["student_group_wheelchair_accessibility"]

            # Update item's validity flag (optional, for external use)
            scheduled_item.is_valid_hard = item_penalty == 0
            total_penalty += item_penalty

            # if violation_reasons_for_item:
            #     constraint_violations_log[f"{scheduled_item.courseName} @ {scheduled_item.day} {scheduled_item.timeslot} R:{scheduled_item.classroomId}"] = violation_reasons_for_item

        # Log violations for promising (low penalty) solutions for debugging
        # if total_penalty > 0 and total_penalty < (min(penalties.values()) * 5) : # Log if penalty isn't astronomically high
        #     print(f"\n--- Fitness Eval --- Penalty: {total_penalty}")
        #     for item_desc, reasons in constraint_violations_log.items():
        #         print(f"  - {item_desc}: {reasons}")
        #     print("--- End Fitness Eval ---")

        return total_penalty
