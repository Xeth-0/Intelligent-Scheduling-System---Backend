import time
import random
from app.models.models import StudentGroup, Course, Teacher, Classroom, ScheduledItem

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
        population_size=CHROMOSOME_POPULATION_SIZE,
        gene_mutation_rate=GENE_MUTATION_RATE,
        chromosome_mutation_rate=CHROMOSOME_MUTATION_RATE,
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

        # Pre-calculate all individual course sessions to be scheduled.
        # This list defines the structure of a chromosome. Each item in this list will get an assignment.
        self.base_scheduled_items_template = self._create_base_scheduled_items()

    def _create_base_scheduled_items(self):
        """
        Generates a flat list of ScheduledItem templates, one for each unique class session
        that needs to be scheduled. This defines the fixed structure of a chromosome.
        """
        base_items = []
        item_idx_counter = 0  # For unique naming if needed

        # ! JESUS that's a lot of nested loops
        for course in self.courses:
            for i, session_type in enumerate(course.sessionTypes):
                sessions_this_type = course.sessionsPerWeek[i]
                # For each instance of this session type (e.g., Lab 1, Lab 2)
                for j in range(sessions_this_type):
                    # Each element in course.studentGroupIds is a list of student group IDs
                    # that attend *this specific instance* of the course session together.
                    for _student_group_ids in course.studentGroupIds:
                        for sg_id in _student_group_ids:
                            if not self.student_group_map.get(sg_id):
                                print(
                                    f"WARNING: Student group ID '{sg_id}' not found in map for course '{course.name}'."
                                )
                                continue  # ! Add Graceful Error Handling

                        # Create a unique name for easier debugging
                        # The join might be long if many student groups, consider a more concise identifier
                        sg_display_name = "_".join(_student_group_ids)
                        item_name = f"{course.name}({course.courseId})[{session_type[:3]}{j+1}]_Grps[{sg_display_name}]"
                        item_idx_counter += 1

                        base_item = ScheduledItem(
                            courseId=course.courseId,
                            courseName=item_name,  # More detailed name
                            sessionType=session_type,
                            teacherId=course.teacherId,
                            studentGroupIds=list(
                                _student_group_ids
                            ),  # Ensure it's a list
                            # classroomId, timeslot, day will be filled by GA
                            classroomId="",
                            timeslot="",
                            day="",
                        )
                        base_items.append(base_item)
        if not base_items:
            raise ValueError(
                "No course sessions to schedule. Check course data and student group assignments."
            )
        return base_items

    def run(self, generations=MAX_GENERATIONS):
        population = self.initialize_population()
        best_solution_overall = None
        best_fitness_overall = float("inf")

        start_time = time.time()
        for generation in range(generations):
            fitness_scores = [self.fitness(chromosome) for chromosome in population]

            # Find current best in this generation
            min_fitness_current_gen = min(fitness_scores)
            idx_min_fitness_current_gen = fitness_scores.index(min_fitness_current_gen)

            if min_fitness_current_gen < best_fitness_overall:
                best_fitness_overall = min_fitness_current_gen
                # Deepcopy might be safer if ScheduledItem objects are mutated directly elsewhere,
                # but current mutation creates new lists/items.
                best_solution_overall = [
                    item.copy() for item in population[idx_min_fitness_current_gen]
                ]
                print(
                    f"Generation {generation}: New best fitness = {best_fitness_overall:.2f}"
                )

            if best_fitness_overall == 0:
                print(
                    f"Perfect solution found! Generations: {generation}/{generations}, Fitness: {best_fitness_overall}"
                )
                break

            elapsed_time = time.time() - start_time
            if elapsed_time > MAX_DURATION_SECONDS:
                print(
                    f"Max duration ({MAX_DURATION_SECONDS}s) reached. Generations: {generation}/{generations}, Fitness: {best_fitness_overall}"
                )
                break

            if generation % 100 == 0 and generation > 0:  # Log progress
                print(
                    f"Generation {generation}, Best Fitness: {best_fitness_overall:.2f}, Time: {elapsed_time:.2f}s"
                )

            population = self.evolve(population, fitness_scores)

        final_elapsed_time = time.time() - start_time
        if best_fitness_overall > 0:
            print(
                f"Optimal solution (fitness 0) not found after {generation+1} generations. Time: {final_elapsed_time:.2f}s"
            )

        return best_solution_overall, best_fitness_overall

    def initialize_population(self):
        population = []
        for _ in range(self.population_size):
            chromosome = self.initialize_chromosome()
            population.append(chromosome)
        return population

    def initialize_chromosome(self):
        """
        Initializes a chromosome by assigning a random timeslot, day, and a heuristically chosen room
        to each base scheduled item.
        """
        chromosome = []
        for base_item_template in self.base_scheduled_items_template:
            new_item = base_item_template.copy()  # Start with a copy of the template

            # Heuristic for room selection: try to match room type
            suitable_rooms_for_type = [
                room for room in self.rooms if room.type == new_item.sessionType
            ]

            chosen_room = None
            if suitable_rooms_for_type:
                chosen_room = random.choice(suitable_rooms_for_type)
            else:  # Fallback: if no room of the specific type, pick any room
                # This will be penalized by the fitness function.
                if not self.rooms:
                    raise ValueError("No rooms available in the system to assign.")
                chosen_room = random.choice(self.rooms)

            new_item.classroomId = chosen_room.classroomId
            new_item.timeslot = random.choice(self.timeslots)
            new_item.day = random.choice(self.days)
            chromosome.append(new_item)
        return chromosome

    def selection(self, population, fitness_scores):
        """Tournament selection."""
        selected_parents = []
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

    def crossover(self, parent1, parent2):
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

    def mutate2(self, chromosome):
        """
        Mutates a chromosome by potentially changing the room, timeslot, or day
        for some of its ScheduledItems (genes), prioritizing free and suitable slots.
        """
        mutated_chromosome = [item.copy() for item in chromosome]  # Work on a copy

        for i in range(len(mutated_chromosome)):
            if (
                random.random() < self.gene_mutation_rate
            ):  # Chance to mutate this specific gene
                item_to_mutate = mutated_chromosome[i]

                original_course_name = item_to_mutate.courseName
                original_session_type = item_to_mutate.sessionType
                original_room_id = item_to_mutate.classroomId
                original_day = item_to_mutate.day
                original_timeslot = item_to_mutate.timeslot

                print(
                    f"DEBUG: Mutate: Attempting on item {i}: {original_course_name} ({original_session_type}) currently at R:{original_room_id}, D:{original_day}, T:{original_timeslot}"
                )

                # Build a set of occupied slots by other items in the current chromosome
                # Key: (classroomId, day, timeslot)
                occupied_slots_by_others = set()
                for j, other_item in enumerate(mutated_chromosome):
                    if i == j:  # Don't check item against itself
                        continue
                    occupied_slots_by_others.add(
                        (other_item.classroomId, other_item.day, other_item.timeslot)
                    )

                mutation_type = random.choice(["room", "time", "day", "all"])
                print(
                    f"DEBUG: Mutate: Item {i} - Mutation type chosen: {mutation_type}"
                )

                # Store if an actual change was made to the item's assignment
                assignment_changed = False

                if mutation_type == "all":
                    # Try to find a completely new, free, and suitable (or any type if no suitable type) slot
                    suitable_type_rooms = [
                        r for r in self.rooms if r.type == item_to_mutate.sessionType
                    ]
                    # Rooms to search: prefer suitable type, then any type.
                    search_rooms = (
                        suitable_type_rooms if suitable_type_rooms else self.rooms
                    )

                    if not search_rooms:
                        print(
                            f"DEBUG: Mutate: Item {i} ('all') - No rooms available for search. Skipping mutation for this item."
                        )
                        continue

                    potential_slots = []
                    for room in search_rooms:
                        for day_option in self.days:
                            for timeslot_option in self.timeslots:
                                if (
                                    room.classroomId,
                                    day_option,
                                    timeslot_option,
                                ) not in occupied_slots_by_others:
                                    potential_slots.append(
                                        (room.classroomId, day_option, timeslot_option)
                                    )

                    if potential_slots:
                        new_roomId, new_day, new_timeslot = random.choice(
                            potential_slots
                        )
                        item_to_mutate.classroomId = new_roomId
                        item_to_mutate.day = new_day
                        item_to_mutate.timeslot = new_timeslot
                        assignment_changed = True
                        print(
                            f"DEBUG: Mutate: Item {i} ('all') - Moved to free slot: R:{new_roomId}, D:{new_day}, T:{new_timeslot}"
                        )
                    else:
                        # Fallback for "all": Pick a room (preferring suitable type) and random day/timeslot
                        print(
                            f"DEBUG: Mutate: Item {i} ('all') - No completely free slot found. Using fallback assignment."
                        )
                        fallback_room_candidates = (
                            suitable_type_rooms if suitable_type_rooms else self.rooms
                        )
                        if fallback_room_candidates:
                            chosen_room = random.choice(fallback_room_candidates)
                            item_to_mutate.classroomId = chosen_room.classroomId
                        # If no rooms at all, classroomId remains unchanged.

                        if self.timeslots:
                            item_to_mutate.timeslot = random.choice(self.timeslots)
                        if self.days:
                            item_to_mutate.day = random.choice(self.days)
                        assignment_changed = True  # Considered changed due to random re-assignment intent
                        print(
                            f"DEBUG: Mutate: Item {i} ('all' fallback) - Assigned to R:{item_to_mutate.classroomId}, D:{item_to_mutate.day}, T:{item_to_mutate.timeslot}"
                        )

                elif mutation_type == "room":
                    # Try to find a new suitable room for the current day/timeslot
                    suitable_rooms = [
                        r for r in self.rooms if r.type == item_to_mutate.sessionType
                    ]

                    free_suitable_rooms_at_current_time = []
                    if suitable_rooms:
                        for room in suitable_rooms:
                            if (
                                room.classroomId,
                                original_day,
                                original_timeslot,
                            ) not in occupied_slots_by_others:
                                free_suitable_rooms_at_current_time.append(room)

                    if free_suitable_rooms_at_current_time:
                        new_room = random.choice(free_suitable_rooms_at_current_time)
                        item_to_mutate.classroomId = new_room.classroomId
                        assignment_changed = True
                        print(
                            f"DEBUG: Mutate: Item {i} ('room') - Moved to free suitable room R:{new_room.classroomId} at D:{original_day}, T:{original_timeslot}."
                        )
                    else:
                        # Fallback: Pick any suitable room (or any room if no suitable type), may conflict
                        print(
                            f"DEBUG: Mutate: Item {i} ('room') - No free suitable room at current D/T. Using fallback."
                        )
                        candidate_fallback_rooms = (
                            suitable_rooms if suitable_rooms else self.rooms
                        )
                        if candidate_fallback_rooms:
                            new_room = random.choice(candidate_fallback_rooms)
                            item_to_mutate.classroomId = new_room.classroomId
                            assignment_changed = True
                            print(
                                f"DEBUG: Mutate: Item {i} ('room' fallback) - Assigned to R:{new_room.classroomId} (may conflict)."
                            )
                        else:
                            print(
                                f"DEBUG: Mutate: Item {i} ('room' fallback) - No rooms to choose from."
                            )

                elif mutation_type == "time":
                    # Try to find a new free timeslot for the current room/day
                    free_timeslots_for_current_room_day = []
                    if self.timeslots:
                        for timeslot_option in self.timeslots:
                            if (
                                original_room_id,
                                original_day,
                                timeslot_option,
                            ) not in occupied_slots_by_others:
                                free_timeslots_for_current_room_day.append(
                                    timeslot_option
                                )

                    if free_timeslots_for_current_room_day:
                        new_timeslot = random.choice(
                            free_timeslots_for_current_room_day
                        )
                        item_to_mutate.timeslot = new_timeslot
                        assignment_changed = True
                        print(
                            f"DEBUG: Mutate: Item {i} ('time') - Moved to free timeslot T:{new_timeslot} at R:{original_room_id}, D:{original_day}."
                        )
                    else:
                        # Fallback: Pick any timeslot, may conflict
                        print(
                            f"DEBUG: Mutate: Item {i} ('time') - No free timeslot at current R/D. Using fallback."
                        )
                        if self.timeslots:
                            new_timeslot = random.choice(self.timeslots)
                            item_to_mutate.timeslot = new_timeslot
                            assignment_changed = True
                            print(
                                f"DEBUG: Mutate: Item {i} ('time' fallback) - Assigned to T:{new_timeslot} (may conflict)."
                            )
                        else:
                            print(
                                f"DEBUG: Mutate: Item {i} ('time' fallback) - No timeslots to choose from."
                            )

                elif mutation_type == "day":
                    # Try to find a new free day for the current room/timeslot
                    free_days_for_current_room_slot = []
                    if self.days:
                        for day_option in self.days:
                            if (
                                original_room_id,
                                day_option,
                                original_timeslot,
                            ) not in occupied_slots_by_others:
                                free_days_for_current_room_slot.append(day_option)

                    if free_days_for_current_room_slot:
                        new_day = random.choice(free_days_for_current_room_slot)
                        item_to_mutate.day = new_day
                        assignment_changed = True
                        print(
                            f"DEBUG: Mutate: Item {i} ('day') - Moved to free day D:{new_day} at R:{original_room_id}, T:{original_timeslot}."
                        )
                    else:
                        # Fallback: Pick any day, may conflict
                        print(
                            f"DEBUG: Mutate: Item {i} ('day') - No free day at current R/S. Using fallback."
                        )
                        if self.days:
                            new_day = random.choice(self.days)
                            item_to_mutate.day = new_day
                            assignment_changed = True
                            print(
                                f"DEBUG: Mutate: Item {i} ('day' fallback) - Assigned to D:{new_day} (may conflict)."
                            )
                        else:
                            print(
                                f"DEBUG: Mutate: Item {i} ('day' fallback) - No days to choose from."
                            )

                if assignment_changed:
                    # Log if the actual assignment (Room, Day, Timeslot) changed
                    if (
                        item_to_mutate.classroomId != original_room_id
                        or item_to_mutate.day != original_day
                        or item_to_mutate.timeslot != original_timeslot
                    ):
                        print(
                            f"DEBUG: Mutate: Item {i} ({original_course_name}) final state: R:{item_to_mutate.classroomId}, D:{item_to_mutate.day}, T:{item_to_mutate.timeslot} (was R:{original_room_id}, D:{original_day}, T:{original_timeslot})"
                        )
                    else:
                        print(
                            f"DEBUG: Mutate: Item {i} ({original_course_name}) - Mutation attempt of type '{mutation_type}' resulted in no change to R,D,T."
                        )
                else:
                    print(
                        f"DEBUG: Mutate: Item {i} ({original_course_name}) - No mutation applied or no change made."
                    )

        return mutated_chromosome

    def mutate(self, chromosome):
        """
        Mutates a chromosome by potentially changing the room, timeslot, or day
        for some of its ScheduledItems (genes).
        """
        mutated_chromosome = [item.copy() for item in chromosome]  # Work on a copy

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
                    new_room = None
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

    def evolve(self, population, fitness_scores):
        new_population = []

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

        if len(chromosome) != len(self.base_scheduled_items_template):
            # This indicates a severe problem with chromosome generation/crossover/mutation
            # if chromosomes can change length or lose/gain essential items.
            # With the current base_scheduled_items_template approach, this shouldn't happen.
            total_penalty += penalties["course_not_scheduled"] * abs(
                len(chromosome) - len(self.base_scheduled_items_template)
            )
            print(
                f"CRITICAL: Chromosome length mismatch. Expected {len(self.base_scheduled_items_template)}, got {len(chromosome)}"
            )
            return float("inf")

        for item_idx, scheduled_item in enumerate(chromosome):
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
