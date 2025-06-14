"""
Data extractor to get test data from the seeded database for GA testing
"""
import asyncio
import json
import os
import sys
from pathlib import Path

# Add the core directory to Python path to import Prisma types
sys.path.append(str(Path(__file__).parent.parent / "core"))

try:
    import asyncpg
except ImportError:
    print("asyncpg not installed. Installing...")
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "asyncpg"])
    import asyncpg

async def get_database_url():
    """Get database URL from environment or use default"""
    
    # Try to get DATABASE_URL from environment
    database_url = os.getenv('DATABASE_URL')
    print(f"DATABASE_URL from environment: {database_url}")
    
    # Debug: Print all environment variables that contain 'DATABASE' or 'DB'
    print("Environment variables containing 'DATABASE' or 'DB':")
    for key, value in os.environ.items():
        if 'DATABASE' in key.upper() or 'DB' in key.upper():
            print(f"  {key} = {value}")
    
    # If not found, try to load from .env file
    if not database_url:
        try:
            from pathlib import Path
            env_file = Path(__file__).parent.parent / "core" / ".env"
            if env_file.exists():
                print(f"Trying to load from .env file: {env_file}")
                with open(env_file, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith('DATABASE_URL='):
                            database_url = line.split('=', 1)[1].strip('\'"')
                            print(f"Found DATABASE_URL in .env: {database_url}")
                            break
        except Exception as e:
            print(f"Error reading .env file: {e}")
    
    # Fallback to default values
    if not database_url:
        print("DATABASE_URL not found, using fallback values")
        # Check if we're likely in docker (common docker env indicators)
        if os.getenv('HOSTNAME') or os.path.exists('/.dockerenv'):
            database_url = "postgresql://postgres:password@db:5432/iss_db"
            print("Detected Docker environment, using docker database URL")
        else:
            database_url = "postgresql://postgres:password@localhost:5432/iss_db"
            print("Detected local environment, using localhost database URL")
    
    return database_url

async def extract_seed_data():
    """Extract actual data from the seeded database"""
    
    database_url = await get_database_url()
    print(f"Attempting to connect to: {database_url}")
    
    if not database_url:
        print("No database URL available, using fallback data")
        return create_fallback_data()
    
    try:
        # Connect to the database
        conn = await asyncpg.connect(database_url)
        
        print("Connected to database, extracting seed data...")
        
        # Extract timeslots
        timeslots_query = """
            SELECT "timeslotId" as "timeslotId", code, label, "startTime", "endTime", "order"
            FROM "Timeslot"
            ORDER BY "order"
        """
        timeslots_rows = await conn.fetch(timeslots_query)
        timeslots = [dict(row) for row in timeslots_rows]
        
        # Extract classrooms
        classrooms_query = """
            SELECT c."classroomId", c.name, c.capacity, c.type, 
                   c."isWheelchairAccessible", c."openingTime", c."closingTime", c.floor,
                   b.name as "buildingName"
            FROM "Classroom" c
            LEFT JOIN "Building" b ON c."buildingId" = b."buildingId"
            ORDER BY c.name
        """
        classrooms_rows = await conn.fetch(classrooms_query)
        classrooms = [dict(row) for row in classrooms_rows]
        
        # Extract teachers with user information
        teachers_query = """
            SELECT t."teacherId", u."firstName", u."lastName", u.email, u.phone,
                   u."needWheelchairAccessibleRoom", d.name as "departmentName"
            FROM "Teacher" t
            JOIN "User" u ON t."userId" = u."userId"
            JOIN "Department" d ON t."departmentId" = d."deptId"
            ORDER BY u."firstName", u."lastName"
        """
        teachers_rows = await conn.fetch(teachers_query)
        teachers = [dict(row) for row in teachers_rows]
        
        # Extract student groups
        student_groups_query = """
            SELECT sg."studentGroupId", sg.name, sg.size, sg."accessibilityRequirement",
                   d.name as "departmentName"
            FROM "StudentGroup" sg
            JOIN "Department" d ON sg."departmentId" = d."deptId"
            ORDER BY sg.name
        """
        student_groups_rows = await conn.fetch(student_groups_query)
        student_groups = [dict(row) for row in student_groups_rows]
        
        # Extract courses with related data
        courses_query = """
            SELECT c."courseId", c.name, c.code, c.description, c."ectsCredits",
                   c."sessionType", c."sessionsPerWeek",
                   t."teacherId", u."firstName" || ' ' || u."lastName" as "teacherName",
                   u.email as "teacherEmail"
            FROM "Course" c
            LEFT JOIN "Teacher" t ON c."teacherId" = t."teacherId"
            LEFT JOIN "User" u ON t."userId" = u."userId"
            ORDER BY c.code
        """
        courses_rows = await conn.fetch(courses_query)
        courses = [dict(row) for row in courses_rows]
        
        # Get course-student group relationships
        course_student_groups_query = """
            SELECT c."courseId", sg."studentGroupId", sg.name as "studentGroupName"
            FROM "Course" c
            JOIN "_CourseToStudentGroup" csg ON c."courseId" = csg."A"
            JOIN "StudentGroup" sg ON csg."B" = sg."studentGroupId"
            ORDER BY c."courseId", sg.name
        """
        course_student_groups_rows = await conn.fetch(course_student_groups_query)
        
        # Group student groups by course
        course_student_groups = {}
        for row in course_student_groups_rows:
            course_id = row['courseId']
            if course_id not in course_student_groups:
                course_student_groups[course_id] = []
            course_student_groups[course_id].append({
                'studentGroupId': row['studentGroupId'],
                'name': row['studentGroupName']
            })
        
        # Add student groups to courses
        for course in courses:
            course['studentGroups'] = course_student_groups.get(course['courseId'], [])
        
        # Extract constraints (sample)
        constraints_query = """
            SELECT ct.id as "constraintTypeId", ct.name, ct.description,
                   c.value, c.priority, c."teacherId", c."campusId"
            FROM "Constraint" c
            JOIN "ConstraintType" ct ON c."constraintTypeId" = ct.id
            LIMIT 20
        """
        constraints_rows = await conn.fetch(constraints_query)
        constraints = []
        for row in constraints_rows:
            constraint_dict = dict(row)
            # Convert JSON value to dict if it's a string
            if isinstance(constraint_dict['value'], str):
                try:
                    constraint_dict['value'] = json.loads(constraint_dict['value'])
                except:
                    pass
            constraints.append(constraint_dict)
        
        await conn.close()
        
        # Transform data to match GA algorithm expectations
        formatted_data = {
            "timeslots": [
                {
                    "timeslotId": ts["timeslotId"],
                    "code": ts["code"],
                    "label": ts["label"],
                    "startTime": ts["startTime"],
                    "endTime": ts["endTime"],
                    "order": ts["order"]
                }
                for ts in timeslots
            ],
            "rooms": [
                {
                    "classroomId": cr["classroomId"],
                    "name": cr["name"],
                    "capacity": cr["capacity"],
                    "type": cr["type"],
                    "isWheelchairAccessible": cr["isWheelchairAccessible"],
                    "openingTime": cr["openingTime"],
                    "closingTime": cr["closingTime"],
                    "floor": cr["floor"],
                    "buildingName": cr["buildingName"]
                }
                for cr in classrooms
            ],
            "teachers": [
                {
                    "teacherId": t["teacherId"],
                    "name": f"{t['firstName']} {t['lastName']}",
                    "firstName": t["firstName"],
                    "lastName": t["lastName"],
                    "email": t["email"],
                    "phone": t["phone"],
                    "needsWheelchairAccessible": t["needWheelchairAccessibleRoom"],
                    "departmentName": t["departmentName"]
                }
                for t in teachers
            ],
            "studentGroups": [
                {
                    "studentGroupId": sg["studentGroupId"],
                    "name": sg["name"],
                    "size": sg["size"],
                    "accessibilityRequirement": sg["accessibilityRequirement"],
                    "departmentName": sg["departmentName"]
                }
                for sg in student_groups
            ],
            "courses": [
                {
                    "courseId": c["courseId"],
                    "name": c["name"],
                    "code": c["code"],
                    "description": c["description"],
                    "ectsCredits": c["ectsCredits"],
                    "sessionType": c["sessionType"],
                    "sessionsPerWeek": c["sessionsPerWeek"],
                    "teacherId": c["teacherId"],
                    "teacherName": c["teacherName"],
                    "teacherEmail": c["teacherEmail"],
                    "studentGroups": c["studentGroups"]
                }
                for c in courses
            ],
                         "constraints": [
                 {
                     "constraintTypeId": c["constraintTypeId"],
                     "name": c["name"],
                     "description": c["description"],
                     "value": c["value"],
                     "priority": float(c["priority"]) if c["priority"] else 5.0,
                     "teacherId": c["teacherId"],
                     "campusId": c["campusId"]
                 }
                 for c in constraints
             ]
        }
        
        return formatted_data
        
    except Exception as e:
        print(f"Error connecting to database: {e}")
        print("Falling back to mock data...")
        return create_fallback_data()

def create_fallback_data():
    """Create fallback test data if database connection fails"""
    
    # Basic timeslots
    timeslots = [
        {"timeslotId": "TS1", "code": "0800_0900", "label": "08:00-09:00", "startTime": "08:00", "endTime": "09:00", "order": 1},
        {"timeslotId": "TS2", "code": "0900_1000", "label": "09:00-10:00", "startTime": "09:00", "endTime": "10:00", "order": 2},
        {"timeslotId": "TS3", "code": "1000_1100", "label": "10:00-11:00", "startTime": "10:00", "endTime": "11:00", "order": 3},
        {"timeslotId": "TS4", "code": "1100_1200", "label": "11:00-12:00", "startTime": "11:00", "endTime": "12:00", "order": 4},
        {"timeslotId": "TS5", "code": "1300_1400", "label": "13:00-14:00", "startTime": "13:00", "endTime": "14:00", "order": 6},
        {"timeslotId": "TS6", "code": "1400_1500", "label": "14:00-15:00", "startTime": "14:00", "endTime": "15:00", "order": 7},
        {"timeslotId": "TS7", "code": "1500_1600", "label": "15:00-16:00", "startTime": "15:00", "endTime": "16:00", "order": 8},
        {"timeslotId": "TS8", "code": "1600_1700", "label": "16:00-17:00", "startTime": "16:00", "endTime": "17:00", "order": 9}
    ]
    
    # Basic classrooms  
    classrooms = [
        {"classroomId": "CR-101", "name": "NB111", "capacity": 300, "type": "LECTURE", "isWheelchairAccessible": True},
        {"classroomId": "CR-102", "name": "NB112", "capacity": 100, "type": "LECTURE", "isWheelchairAccessible": True},
        {"classroomId": "CR-103", "name": "NB113", "capacity": 50, "type": "LECTURE", "isWheelchairAccessible": False},
        {"classroomId": "CR-104", "name": "NB114", "capacity": 200, "type": "LAB", "isWheelchairAccessible": True},
        {"classroomId": "CR-105", "name": "NB115", "capacity": 50, "type": "LAB", "isWheelchairAccessible": False}
    ]
    
    # Basic teachers
    teachers = [
        {"teacherId": "T001", "name": "Dr. Smith", "email": "teacher1@email.email"},
        {"teacherId": "T002", "name": "Prof. Johnson", "email": "natinael@gmail.com"},
        {"teacherId": "T003", "name": "Dr. Williams", "email": "nebiat@gmail.com"}
    ]
    
    # Basic student groups
    student_groups = [
        {"studentGroupId": "SG-Y1", "name": "Year 1", "size": 50},
        {"studentGroupId": "SG-Y2", "name": "Year 2", "size": 50},
        {"studentGroupId": "SG-Y3-SE", "name": "3rd Year Software Engineering", "size": 52}
    ]
    
    # Basic courses
    courses = [
        {"courseId": "CS201", "name": "Data Structures", "teacherId": "T001", "sessionType": "LECTURE", "studentGroups": [{"studentGroupId": "SG-Y2"}]},
        {"courseId": "CS301", "name": "Software Engineering", "teacherId": "T002", "sessionType": "LECTURE", "studentGroups": [{"studentGroupId": "SG-Y3-SE"}]}
    ]
    
    return {
        "timeslots": timeslots,
        "rooms": classrooms,
        "teachers": teachers,
        "studentGroups": student_groups,
        "courses": courses,
        "constraints": []
    }

async def save_test_data():
    """Extract and save test data to JSON file"""
    print("Extracting test data from seeded database...")
    
    test_data = await extract_seed_data()
    
    output_file = Path("test_data.json")
    with open(output_file, 'w') as f:
        json.dump(test_data, f, indent=2)
    
    print(f"Test data saved to {output_file}")
    print(f"Data summary:")
    print(f"  - Timeslots: {len(test_data['timeslots'])}")
    print(f"  - Rooms: {len(test_data['rooms'])}")
    print(f"  - Teachers: {len(test_data['teachers'])}")
    print(f"  - Student Groups: {len(test_data['studentGroups'])}")
    print(f"  - Courses: {len(test_data['courses'])}")
    print(f"  - Constraints: {len(test_data['constraints'])}")

if __name__ == "__main__":
    asyncio.run(save_test_data())