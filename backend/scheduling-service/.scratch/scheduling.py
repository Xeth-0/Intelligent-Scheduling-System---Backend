from models import Classroom, Course, Teacher, ScheduledItem
import time
import random

# Parameters for the GA
MAX_GENERATIONS = 100000000
GENE_MUTATION_RATE = 0.1
MAX_DURATION_SECONDS = 20
SELECTION_TOURNAMENT_SIZE = 3
CHROMOSOME_POPULATION_SIZE = 50

# Penalties for the GA
penalties = {
    "room_capacity": 1000,
    "teacher_wheelchair_accessibility": 1000,
    "room_conflict": 4000,
    "teacher_conflict": 5000,
    "student_group_conflict": 5000,
    "course_not_scheduled": 5000,
    "room_type_conflict": 5000,
}


class GeneticScheduler:
    """
    Genetic Algorithm implementation for course scheduling
    """

    def __init__(
        self,
        courses: list[Course],
        teachers: list[Teacher],
        rooms: list[Classroom],
        timeslots: list[str],
        days: list[str],
        population_size=CHROMOSOME_POPULATION_SIZE,
        mutation_rate=GENE_MUTATION_RATE,
    ):
        self.courses = courses
        self.teachers = teachers
        self.rooms = rooms
        self.timeslots = timeslots
        self.days = days
        self.population_size = population_size
        self.mutation_rate = mutation_rate

        # Map objects to indices for faster lookups
        self.teacher_map = {teacher.teacherId: teacher for teacher in teachers}
        self.room_map = {room.classroomId: room for room in rooms}
        self.course_map = {course.courseId: course for course in courses}

    def initialize_population(self):
        """
        Create an initial population of random schedules (chromosomes)
        Each chromosome is a list of ScheduledItem objects (genes)

        Returns a list of randomly initialized chromosomes.
        """
        population = []
        for _ in range(self.population_size):
            chromosome = self.initialize_chromosome()
            population.append(chromosome)
        return population

    def initialize_chromosome(self):
        """
        Initialize a chromosome. A chromosome is a list of scheduled items, for all courses and
        all session types.

        Returns a list of ScheduledItem objects.
        """
        chromosome = []
        for course in self.courses:
            # Create a random scheduled item for each course
            for i, session_type in enumerate(course.sessionTypes):
                for j in range(course.sessionsPerWeek[i]):
                    scheduled_item = ScheduledItem(
                        courseId=course.courseId,
                        courseName=course.name + f"({session_type}/{j})",
                        sessionType=session_type,
                        teacherId=course.teacherId,
                        studentGroupId="G1",  # ! Placeholder, would come from real data
                        classroomId=random.choice(self.rooms).classroomId,
                        timeslot=random.choice(self.timeslots),
                        day=random.choice(self.days),
                    )
                    chromosome.append(scheduled_item)
        return chromosome

    def fitness(self, chromosome):
        """
        Calculate fitness of a chromosome based on hard constraints
        Lower score is better (fewer violations)
        """
        penalty = 0

        # Track occupied slots for conflict detection. Using a dict to make lookup faster
        room_occupied = {}  # (room_id, day, timeslot) -> scheduled_item
        teacher_occupied = {}  # (teacher_id, day, timeslot) -> scheduled_item
        student_group_occupied = (
            {}
        )  # (student_group_id, day, timeslot) -> scheduled_item
        course_scheduled = (
            {}
        )  # (course_id) -> scheduled_item (to check if all courses are scheduled)

        for scheduled_item in chromosome:
            course = self.course_map[scheduled_item.courseId]
            room = self.room_map[scheduled_item.classroomId]
            teacher = self.teacher_map[scheduled_item.teacherId]
            day = scheduled_item.day
            timeslot = scheduled_item.timeslot
            student_group = scheduled_item.studentGroupId

            item_penalty = 0

            # ---------- Hard Constraint 1: Room Capacity ----------
            # Check if the room capacity is sufficient (assuming 50 students per group for now)
            students_count = 50  # Placeholder, would come from real data
            if room.capacity < students_count:
                item_penalty += penalties["room_capacity"]

            # ---------- Hard Constraint 2: Teacher Wheelchair Accessibility ----------
            if (
                teacher.needsWheelchairAccessibleRoom
                and not room.isWheelchairAccessible
            ):
                item_penalty += penalties["teacher_wheelchair_accessibility"]

            # ---------- Hard Constraint 3: Check for room conflicts -----------
            room_key = (scheduled_item.classroomId, day, timeslot)
            if room_key in room_occupied:
                item_penalty += penalties["room_conflict"]
            else:
                room_occupied[room_key] = scheduled_item

            # ---------- Hard Constraint 4: Check for teacher conflicts -----------
            teacher_key = (scheduled_item.teacherId, day, timeslot)
            if teacher_key in teacher_occupied:
                item_penalty += penalties["teacher_conflict"]
            else:
                teacher_occupied[teacher_key] = scheduled_item

            # ---------- Hard Constraint 5: Check for student group conflicts -----------
            student_key = (student_group, day, timeslot)
            if student_key in student_group_occupied:
                item_penalty += penalties["student_group_conflict"]
            else:
                student_group_occupied[student_key] = scheduled_item

            # ---------- Hard Constraint 6: Check if all courses are scheduled -----------
            if course.courseId not in course_scheduled:
                course_scheduled[course.courseId] = (
                    scheduled_item  # penalty applied at the end retroactively
                )

            # ---------- Hard Constraint 7: Check room type -----------
            if room.type != scheduled_item.sessionType:
                print(f"Room type conflict: {room.type} != {scheduled_item.sessionType}")
                item_penalty += penalties["room_type_conflict"]

            penalty += item_penalty

            if item_penalty > 0:
                scheduled_item.is_valid_hard = False

        # ---------- Penalty for not scheduling all courses -----------
        if len(course_scheduled) != len(self.courses):
            penalty += penalties["course_not_scheduled"] * (
                len(self.courses) - len(course_scheduled)
            )

        return 1 / (1 + penalty)  # Convert to a fitness score where higher is better

    def selection(self, population, fitness_scores):
        """
        Tournament selection to choose parents
        """
        tournament_size = SELECTION_TOURNAMENT_SIZE
        selected_parents = []

        for _ in range(len(population)):
            tournament_indices = random.sample(range(len(population)), tournament_size)
            tournament_fitness = [fitness_scores[i] for i in tournament_indices]

            winner_idx = tournament_indices[
                tournament_fitness.index(max(tournament_fitness))
            ]
            selected_parents.append(population[winner_idx])

        return selected_parents

    def crossover(self, parent1, parent2):
        """
        Single point crossover
        Each parent is a chromosome (list of scheduled items)
        """
        if len(parent1) != len(parent2):
            raise ValueError("Parents must have the same length")

        crossover_point = random.randint(1, len(parent1) - 1)

        # ! Need to make sure the offspring is valid
        child1 = parent1[:crossover_point] + parent2[crossover_point:]
        child2 = parent2[:crossover_point] + parent1[crossover_point:]

        return child1, child2

    def mutate(self, chromosome):
        """
        Mutation: randomly change room, day, or timeslot for some scheduled items
        """
        for i in range(len(chromosome)):
            if random.random() < self.mutation_rate:
                mutation_type = random.choice(["room", "time", "day"])

                if mutation_type == "room":
                    chromosome[i].classroomId = random.choice(self.rooms).classroomId
                elif mutation_type == "time":
                    chromosome[i].timeslot = random.choice(self.timeslots)
                else:
                    chromosome[i].day = random.choice(self.days)

        return chromosome

    def evolve(self, population):
        """
        Create a new generation through selection, crossover, and mutation
        """
        fitness_scores = [self.fitness(chromosome) for chromosome in population]
        parents = self.selection(population, fitness_scores)

        new_population = []
        for i in range(0, len(parents), 2):
            if i + 1 < len(parents):
                child1, child2 = self.crossover(parents[i], parents[i + 1])

                child1 = self.mutate(child1)
                child2 = self.mutate(child2)

                new_population.append(child1)
                new_population.append(child2)

        # If population has odd number, add the last parent
        if len(parents) % 2 != 0:
            new_population.append(self.mutate(parents[-1]))

        return new_population

    def run(self, generations=100):
        """
        Run the genetic algorithm for a specified number of generations
        """
        population = self.initialize_population()

        best_solution = None
        best_fitness = 0

        start_time = time.time()
        for generation in range(generations):
            fitness_scores = [self.fitness(chromosome) for chromosome in population]

            max_fitness_idx = fitness_scores.index(max(fitness_scores))
            current_best = population[max_fitness_idx]
            current_best_fitness = fitness_scores[max_fitness_idx]

            if current_best_fitness > best_fitness:
                best_solution = current_best.copy()
                best_fitness = current_best_fitness

            # print(f"Generation {generation}: Best fitness = {best_fitness}")

            #! Temporary stop condition while we only have hard constraints. Once we add soft constraints, this won't be good enough
            if best_fitness == 1.0:
                print("Perfect solution found!")
                break
            elif time.time() - start_time > MAX_DURATION_SECONDS:
                print("Max duration reached!")
                break

            population = self.evolve(population)

        return best_solution, best_fitness


# # Example usage:
# def run_scheduling():
#     # Sample timeslots and days (would come from real data)
#     timeslots = [
#         "08:00-09:30",
#         "09:40-11:10",
#         "11:20-12:50",
#         "13:30-15:00",
#         "15:10-16:40",
#     ]
#     days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

#     # Create scheduler
#     scheduler = GeneticScheduler(
#         courses=courses,
#         teachers=teachers,
#         rooms=rooms,
#         timeslots=timeslots,
#         days=days,
#         population_size=50,
#         mutation_rate=0.1,
#     )

#     # Run the genetic algorithm
#     best_schedule, best_fitness = scheduler.run(generations=100)

#     # Print results
#     print(f"Best schedule fitness: {best_fitness}")
#     if best_schedule:
#         for item in best_schedule:
#             print(
#                 f"Course: {item.courseName}, Room: {item.classroomId}, Day: {item.day}, Time: {item.timeslot}"
#             )

#     return best_schedule
