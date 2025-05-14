from app.models.models import Classroom, Teacher, Course, StudentGroup

rooms_json = [
    {
        "classroomId": "1",
        "name": "NB111",
        "capacity": 300,
        "type": "lecture",
        "buildingId": "1",
        "floor": 0,
        "roomNumber": 1,
        "isWheelchairAccessible": True,
    },
    {
        "classroomId": "2",
        "name": "NB112",
        "capacity": 100,
        "type": "lecture",
        "buildingId": "1",
        "floor": 1,
        "roomNumber": 2,
        "isWheelchairAccessible": True,
    },
    {
        "classroomId": "3",
        "name": "NB113",
        "capacity": 100,
        "type": "lecture",
        "buildingId": "1",
        "floor": 1,
        "roomNumber": 3,
        "isWheelchairAccessible": False,
    },
    {
        "classroomId": "4",
        "name": "NB114",
        "capacity": 100,
        "type": "lab",
        "buildingId": "1",
        "floor": 2,
        "roomNumber": 4,
        "isWheelchairAccessible": True,
    },
    {
        "classroomId": "5",
        "name": "NB115",
        "capacity": 50,
        "type": "lab",
        "buildingId": "1",
        "floor": 2,
        "roomNumber": 5,
        "isWheelchairAccessible": False,
    },
]

teachers_json = [
    {
        "teacherId": "1",
        "name": "Abrham",
        "email": "abrham@gmail.com",
        "phone": "1234567890",
        "departmentId": "1",
        "needsWheelchairAccessibleRoom": True,
    },
    {
        "teacherId": "2",
        "name": "Natinael",
        "email": "natinael@gmail.com",
        "phone": "1234567890",
        "departmentId": "1",
        "needsWheelchairAccessibleRoom": True,
    },
    {
        "teacherId": "3",
        "name": "Nebiat",
        "email": "nebiat@gmail.com",
        "phone": "1234567890",
        "departmentId": "1",
        "needsWheelchairAccessibleRoom": False,
    },
    {
        "teacherId": "4",
        "name": "Amanuel",
        "email": "amanuel@gmail.com",
        "phone": "1234567890",
        "departmentId": "1",
        "needsWheelchairAccessibleRoom": False,
        },
    {
        "teacherId": "5",
        "name": "Tewodros",
        "email": "tewodros@gmail.com",
        "phone": "1234567890",
        "departmentId": "1",
        "needsWheelchairAccessibleRoom": False,
    },
    {
        "teacherId": "6",
        "name": "Yared",
        "email": "yared@gmail.com",
        "phone": "1234567890",
        "departmentId": "1",
        "needsWheelchairAccessibleRoom": False,
    }
]

courses_json = [
    {
        "courseId": "1",
        "name": "Fundamentals of Electrical Engineering",
        "description": "Fundamentals of Electrical Engineering",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "1",
        "sessionTypes": ["lecture", "lab"],
        "sessionsPerWeek": [1, 1],
        "studentGroupIds": [["SG_Y1", "SG_Y2"]],
    },
    {
        "courseId": "2",
        "name": "Fundamentals of Web Development",
        "description": "Fundamentals of Web Development",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "2",
        "sessionTypes": ["lecture", "lab"],
        "sessionsPerWeek": [1, 1],
        "studentGroupIds": [["SG_Y1", "SG_Y2"]],
    },
    {
        "courseId": "3",
        "name": "Human Computer Interaction",
        "description": "Principles of HCI",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "3",
        "sessionTypes": ["lecture", "lab"],
        "sessionsPerWeek": [1, 1],
        "studentGroupIds": [["SG_Y1"], ["SG_Y2"]],
    },
    {
        "courseId": "4",
        "name": "Software Engineering",
        "description": "Software Engineering Practices",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "4",
        "sessionTypes": ["lecture", "lab"],
        "sessionsPerWeek": [2, 2],
        "studentGroupIds": [["SG_Y1"], ["SG_Y2"]],
    },
    {
        "courseId": "5",
        "name": "Computer Architecture",
        "description": "Computer Architecture Fundamentals",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "5",
        "sessionTypes": ["lecture", "lab"],
        "sessionsPerWeek": [1, 1],
        "studentGroupIds": [["SG_Y1", "SG_Y2"]],
    },
    {
        "courseId": "6",
        "name": "Artificial Intelligence",
        "description": "Artificial Intelligence",
        "department": "5",
        "ectsCredits": 5,
        "teacherId": "6",
        "sessionTypes": ["lecture", "lab"],
        "sessionsPerWeek": [1, 3],
        "studentGroupIds": [["SG_Y2"]],
    },
]

student_groups_json = [
    {
        "studentGroupId": "SG_Y1",
        "name": "Year 1",
        "department": "1",
        "size": 50,
        "accessibilityRequirement": False,
    },
    {
        "studentGroupId": "SG_Y2",
        "name": "Year 2",
        "department": "1",
        "size": 50,
        "accessibilityRequirement": True,
    },
]

class SampleData:
    def __init__(self):
        # self.rooms = rooms_json
        # self.teachers = teachers_json
        # self.courses = courses_json
        # self.student_groups = student_groups_json
        self.rooms = [
            Classroom(
                classroomId=room["classroomId"],
                name=room["name"],
                capacity=room["capacity"],
                type=room["type"],
                buildingId=room["buildingId"],
                floor=room["floor"],
                isWheelchairAccessible=room["isWheelchairAccessible"],
            )
            for room in rooms_json
        ]
        self.teachers = [
            Teacher(
                teacherId=teacher["teacherId"],
                name=teacher["name"],
                email=teacher["email"],
                phone=teacher["phone"],
                department=teacher["departmentId"],
                needsWheelchairAccessibleRoom=teacher["needsWheelchairAccessibleRoom"],
            )
            for teacher in teachers_json
        ]
        self.courses = [
            Course(
                courseId=course["courseId"],
                name=course["name"],
                description=course["description"],
                ectsCredits=course["ectsCredits"],
                department=course["department"],
                teacherId=course["teacherId"],
                sessionTypes=course["sessionTypes"],
                sessionsPerWeek=course["sessionsPerWeek"],
                studentGroupIds=course["studentGroupIds"],
            )
            for course in courses_json
        ]
        self.student_groups = [
            StudentGroup(
                studentGroupId=studentGroup["studentGroupId"],
                name=studentGroup["name"],
                size=studentGroup["size"],
                department=studentGroup["department"],
                accessibilityRequirement=studentGroup["accessibilityRequirement"],
            )
            for studentGroup in student_groups_json
        ]
