"""
Data extractor to get test data from the seeded database for GA testing
"""
import asyncio
import json
from pathlib import Path

# Mock database data based on seed structure
def create_test_data():
    """Create test data matching the seed structure"""
    
    # Timeslots (from seed/infrastructure.ts pattern)
    timeslots = [
        {"timeslotId": "TS1", "code": "08:00-09:00", "label": "Period 1", "startTime": "08:00", "endTime": "09:00", "order": 1},
        {"timeslotId": "TS2", "code": "09:00-10:00", "label": "Period 2", "startTime": "09:00", "endTime": "10:00", "order": 2},
        {"timeslotId": "TS3", "code": "10:00-11:00", "label": "Period 3", "startTime": "10:00", "endTime": "11:00", "order": 3},
        {"timeslotId": "TS4", "code": "11:00-12:00", "label": "Period 4", "startTime": "11:00", "endTime": "12:00", "order": 4},
        {"timeslotId": "TS5", "code": "13:00-14:00", "label": "Period 5", "startTime": "13:00", "endTime": "14:00", "order": 5},
        {"timeslotId": "TS6", "code": "14:00-15:00", "label": "Period 6", "startTime": "14:00", "endTime": "15:00", "order": 6},
        {"timeslotId": "TS7", "code": "15:00-16:00", "label": "Period 7", "startTime": "15:00", "endTime": "16:00", "order": 7},
        {"timeslotId": "TS8", "code": "16:00-17:00", "label": "Period 8", "startTime": "16:00", "endTime": "17:00", "order": 8}
    ]
    
    # Classrooms
    classrooms = [
        {"classroomId": "CR-101", "name": "Computer Lab 1", "capacity": 30, "type": "LAB"},
        {"classroomId": "CR-102", "name": "Computer Lab 2", "capacity": 25, "type": "LAB"},
        {"classroomId": "LR-201", "name": "Lecture Room 201", "capacity": 100, "type": "LECTURE"},
        {"classroomId": "LR-202", "name": "Lecture Room 202", "capacity": 80, "type": "LECTURE"},
        {"classroomId": "LR-203", "name": "Lecture Room 203", "capacity": 60, "type": "LECTURE"},
        {"classroomId": "TR-301", "name": "Tutorial Room 301", "capacity": 40, "type": "TUTORIAL"},
        {"classroomId": "TR-302", "name": "Tutorial Room 302", "capacity": 35, "type": "TUTORIAL"}
    ]
    
    # Teachers
    teachers = [
        {"teacherId": "T001", "name": "Dr. Smith", "email": "smith@university.edu"},
        {"teacherId": "T002", "name": "Prof. Johnson", "email": "johnson@university.edu"},
        {"teacherId": "T003", "name": "Dr. Williams", "email": "williams@university.edu"},
        {"teacherId": "T004", "name": "Prof. Brown", "email": "brown@university.edu"},
        {"teacherId": "T005", "name": "Dr. Davis", "email": "davis@university.edu"},
        {"teacherId": "T006", "name": "Prof. Miller", "email": "miller@university.edu"}
    ]
    
    # Student Groups
    student_groups = [
        {"studentGroupId": "CS-2A", "name": "Computer Science Year 2A", "size": 28},
        {"studentGroupId": "CS-2B", "name": "Computer Science Year 2B", "size": 25},
        {"studentGroupId": "CS-3A", "name": "Computer Science Year 3A", "size": 30},
        {"studentGroupId": "CS-3B", "name": "Computer Science Year 3B", "size": 22},
        {"studentGroupId": "CS-4A", "name": "Computer Science Year 4A", "size": 18},
        {"studentGroupId": "IT-2A", "name": "Information Technology Year 2A", "size": 24}
    ]
    
    # Courses - create a substantial number for testing
    courses = [
        # Year 2 CS courses
        {"courseId": "CS201-LEC", "name": "Data Structures", "teacherId": "T001", "sessionType": "LECTURE", "studentGroupIds": ["CS-2A", "CS-2B"]},
        {"courseId": "CS201-LAB", "name": "Data Structures Lab", "teacherId": "T001", "sessionType": "LAB", "studentGroupIds": ["CS-2A"]},
        {"courseId": "CS201-LAB2", "name": "Data Structures Lab", "teacherId": "T001", "sessionType": "LAB", "studentGroupIds": ["CS-2B"]},
        {"courseId": "CS202-LEC", "name": "Algorithms", "teacherId": "T002", "sessionType": "LECTURE", "studentGroupIds": ["CS-2A", "CS-2B"]},
        {"courseId": "CS202-TUT", "name": "Algorithms Tutorial", "teacherId": "T002", "sessionType": "TUTORIAL", "studentGroupIds": ["CS-2A"]},
        {"courseId": "CS202-TUT2", "name": "Algorithms Tutorial", "teacherId": "T002", "sessionType": "TUTORIAL", "studentGroupIds": ["CS-2B"]},
        
        # Year 3 CS courses
        {"courseId": "CS301-LEC", "name": "Database Systems", "teacherId": "T003", "sessionType": "LECTURE", "studentGroupIds": ["CS-3A", "CS-3B"]},
        {"courseId": "CS301-LAB", "name": "Database Lab", "teacherId": "T003", "sessionType": "LAB", "studentGroupIds": ["CS-3A"]},
        {"courseId": "CS301-LAB2", "name": "Database Lab", "teacherId": "T003", "sessionType": "LAB", "studentGroupIds": ["CS-3B"]},
        {"courseId": "CS302-LEC", "name": "Software Engineering", "teacherId": "T004", "sessionType": "LECTURE", "studentGroupIds": ["CS-3A", "CS-3B"]},
        {"courseId": "CS302-TUT", "name": "Software Engineering Tutorial", "teacherId": "T004", "sessionType": "TUTORIAL", "studentGroupIds": ["CS-3A"]},
        {"courseId": "CS302-TUT2", "name": "Software Engineering Tutorial", "teacherId": "T004", "sessionType": "TUTORIAL", "studentGroupIds": ["CS-3B"]},
        
        # Year 4 CS courses
        {"courseId": "CS401-LEC", "name": "Machine Learning", "teacherId": "T005", "sessionType": "LECTURE", "studentGroupIds": ["CS-4A"]},
        {"courseId": "CS401-LAB", "name": "Machine Learning Lab", "teacherId": "T005", "sessionType": "LAB", "studentGroupIds": ["CS-4A"]},
        {"courseId": "CS402-LEC", "name": "Computer Vision", "teacherId": "T006", "sessionType": "LECTURE", "studentGroupIds": ["CS-4A"]},
        {"courseId": "CS402-TUT", "name": "Computer Vision Tutorial", "teacherId": "T006", "sessionType": "TUTORIAL", "studentGroupIds": ["CS-4A"]},
        
        # IT courses
        {"courseId": "IT201-LEC", "name": "Network Security", "teacherId": "T003", "sessionType": "LECTURE", "studentGroupIds": ["IT-2A"]},
        {"courseId": "IT201-LAB", "name": "Network Security Lab", "teacherId": "T003", "sessionType": "LAB", "studentGroupIds": ["IT-2A"]},
        {"courseId": "IT202-LEC", "name": "Web Development", "teacherId": "T004", "sessionType": "LECTURE", "studentGroupIds": ["IT-2A"]},
        {"courseId": "IT202-LAB", "name": "Web Development Lab", "teacherId": "T004", "sessionType": "LAB", "studentGroupIds": ["IT-2A"]}
    ]
    
    # Basic constraints (simplified)
    constraints = [
        {
            "constraintId": "C001",
            "type": "TEACHER_AVAILABILITY",
            "name": "No Friday Afternoon Classes",
            "description": "Teachers prefer no classes on Friday afternoon",
            "isHard": False,
            "penalty": 50,
            "parameters": {"day": "Friday", "timeSlots": ["15:00-16:00", "16:00-17:00"]}
        },
        {
            "constraintId": "C002", 
            "type": "ROOM_CAPACITY",
            "name": "Room Capacity Check",
            "description": "Room capacity must accommodate all students",
            "isHard": True,
            "penalty": 1000,
            "parameters": {}
        }
    ]
    
    return {
        "timeslots": timeslots,
        "rooms": classrooms,
        "teachers": teachers,
        "studentGroups": student_groups,
        "courses": courses,
        "constraints": constraints
    }

def save_test_data():
    """Save test data to JSON file"""
    test_data = create_test_data()
    
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
    save_test_data() 