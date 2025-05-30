from models import Classroom, Teacher, Course, StudentGroup

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
        "capacity": 50,
        "type": "lecture",
        "buildingId": "1",
        "floor": 1,
        "roomNumber": 3,
        "isWheelchairAccessible": False,
    },
    {
        "classroomId": "4",
        "name": "NB114",
        "capacity": 200,
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
        "name": "Teacher 5",
        "email": "teacher5@gmail.com",
        "phone": "1234567890",
        "departmentId": "1",
        "needsWheelchairAccessibleRoom": False,
    },
    {
        "teacherId": "6",
        "name": "Teacher 6",
        "email": "teacher6@gmail.com",
        "phone": "1234567890",
        "departmentId": "1",
        "needsWheelchairAccessibleRoom": False,
    },
    {
        "teacherId": "7",
        "name": "Teacher 7",
        "email": "teacher7@gmail.com",
        "phone": "1234567890",
        "departmentId": "1",
        "needsWheelchairAccessibleRoom": False,
    },
    {
        "teacherId": "8",
        "name": "Teacher 8",
        "email": "teacher8@gmail.com",
        "phone": "1234567890",
        "departmentId": "1",
        "needsWheelchairAccessibleRoom": False,
    },
    {
        "teacherId": "9",
        "name": "Teacher 9",
        "email": "teacher9@gmail.com",
        "phone": "1234567890",
        "departmentId": "1",
        "needsWheelchairAccessibleRoom": False,
    },
]

courses_json = [
    {
        "courseId": "7",
        "name": "Fundamental of Electrical Circuits and Electronics",
        "description": "Fundamental of Electrical Circuits and Electronics",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "1",
        "sessionTypes": ["lecture", "lab"],
        "sessionsPerWeek": [1, 1],
        "studentGroupIds": [
            ["SG_Y3_SE_S1", "SG_Y3_SE_S2"],
            ["SG_Y3_SE_S3", "SG_Y3_SE_S4"],
        ],
    },
    {
        "courseId": "8",
        "name": "Computer Architecture and Organization",
        "description": "Computer Architecture and Organization",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "1",
        "sessionTypes": ["lecture"],
        "sessionsPerWeek": [2],
        "studentGroupIds": [
            ["SG_Y3_SE_S1", "SG_Y3_SE_S2"],
            ["SG_Y3_SE_S3", "SG_Y3_SE_S4"],
        ],
    },
    {
        "courseId": "9",
        "name": "Web Design and Development",
        "description": "Web Design and Development",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "2",
        "sessionTypes": ["lecture", "lab"],
        "sessionsPerWeek": [1, 1],
        "studentGroupIds": [
            ["SG_Y3_SE_S1", "SG_Y3_SE_S2"],
            ["SG_Y3_SE_S3", "SG_Y3_SE_S4"],
        ],
    },
    {
        "courseId": "10",
        "name": "Human Computer Interaction",
        "description": "Human Computer Interaction",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "1",
        "sessionTypes": ["lecture"],
        "sessionsPerWeek": [2],
        "studentGroupIds": [
            ["SG_Y3_SE_S1", "SG_Y3_SE_S2"],
            ["SG_Y3_SE_S3", "SG_Y3_SE_S4"],
        ],
    },
    {
        "courseId": "11",
        "name": "Fundamentals of Software Engineering",
        "description": "Fundamentals of Software Engineering",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "3",
        "sessionTypes": ["lecture", "lab"],
        "sessionsPerWeek": [1, 1],
        "studentGroupIds": [
            ["SG_Y3_SE_S1", "SG_Y3_SE_S2"],
            ["SG_Y3_SE_S3", "SG_Y3_SE_S4"],
        ],
    },
    {
        "courseId": "12",
        "name": "Software Project Management",
        "description": "Software Project Management",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "1",
        "sessionTypes": ["lecture"],
        "sessionsPerWeek": [2],
        "studentGroupIds": [
            [
                "SG_Y4_SE_S1",
                "SG_Y4_SE_S2",
            ],
            ["SG_Y4_AI"],
            [
                "SG_Y4_CY",
                "SG_Y4_IT",
            ],
        ],
    },
    {
        "courseId": "13",
        "name": "Enterprise Application Development",
        "description": "Enterprise Application Development",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "2",
        "sessionTypes": ["lecture", "lab"],
        "sessionsPerWeek": [1, 1],
        "studentGroupIds": [["SG_Y4_SE_S1", "SG_Y4_SE_S2"]],
    },
    {
        "courseId": "14",
        "name": "Requirement Engineering, Architecture and Design",
        "description": "Requirement Engineering, Architecture and Design",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "3",
        "sessionTypes": ["lecture"],
        "sessionsPerWeek": [2],
        "studentGroupIds": [["SG_Y4_SE_S1", "SG_Y4_SE_S2"]],
    },
    {
        "courseId": "15",
        "name": "History of Ethiopia and the Horn",
        "description": "History of Ethiopia and the Horn",
        "ectsCredits": 3,
        "department": "1",
        "teacherId": "4",
        "sessionTypes": ["lecture"],
        "sessionsPerWeek": [1],
        "studentGroupIds": [
            ["SG_Y4_SE_S1", "SG_Y4_SE_S2"],
            ["SG_Y4_AI"],
            ["SG_Y4_CY"],
            ["SG_Y4_IT"],
        ],
    },
    {
        "courseId": "16",
        "name": "Fundamentals of Distributed Systems",
        "description": "Fundamentals of Distributed Systems",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "2",
        "sessionTypes": ["lecture"],
        "sessionsPerWeek": [2],
        "studentGroupIds": [["SG_Y4_SE_S1", "SG_Y4_SE_S2"]],
    },
    {
        "courseId": "17",
        "name": "Machine Learning and Big Data",
        "description": "Machine Learning and Big Data",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "5",
        "sessionTypes": ["lecture", "lab"],
        "sessionsPerWeek": [1, 1],
        "studentGroupIds": [["SG_Y4_SE_S1", "SG_Y4_SE_S2", "SG_Y4_CY"]],
    },
    {
        "courseId": "18",
        "name": "Machine Learning",
        "description": "Machine Learning",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "5",
        "sessionTypes": ["lecture", "lab"],
        "sessionsPerWeek": [1, 1],
        "studentGroupIds": [["SG_Y4_AI"]],
    },
    {
        "courseId": "19",
        "name": "Social Network Analysis",
        "description": "Social Network Analysis",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "6",
        "sessionTypes": ["lecture"],
        "sessionsPerWeek": [2],
        "studentGroupIds": [["SG_Y4_AI"]],
    },
    {
        "courseId": "20",
        "name": "Mathematics for AI",
        "description": "Mathematics for AI",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "6",
        "sessionTypes": ["lecture"],
        "sessionsPerWeek": [2],
        "studentGroupIds": [["SG_Y4_AI"]],
    },
    {
        "courseId": "21",
        "name": "Introduction to Robotics and Intelligent Systems",
        "description": "Introduction to Robotics and Intelligent Systems",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "7",
        "sessionTypes": ["lecture", "lab"],
        "sessionsPerWeek": [1, 1],
        "studentGroupIds": [["SG_Y4_AI"]],
    },
    {
        "courseId": "23",
        "name": "Enterprise Systems and Network Security",
        "description": "Enterprise Systems and Network Security",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "7",
        "sessionTypes": ["lecture", "lab"],
        "sessionsPerWeek": [1, 1],
        "studentGroupIds": [["SG_Y4_CY"]],
    },
    {
        "courseId": "24",
        "name": "Cloud Computing Security",
        "description": "Cloud Computing Security",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "8",
        "sessionTypes": ["lecture"],
        "sessionsPerWeek": [2],
        "studentGroupIds": [["SG_Y4_CY"]],
    },
    {
        "courseId": "25",
        "name": "Enterprise Systems and Network Administration",
        "description": "Enterprise Systems and Network Administration",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "8",
        "sessionTypes": ["lecture", "lab"],
        "sessionsPerWeek": [1, 1],
        "studentGroupIds": [["SG_Y4_IT"]],
    },
    {
        "courseId": "26",
        "name": "E-business Strategy and Development",
        "description": "E-business Strategy and Development",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "9",
        "sessionTypes": ["lecture"],
        "sessionsPerWeek": [2],
        "studentGroupIds": [["SG_Y4_IT"]],
    },
    {
        "courseId": "27",
        "name": "Database Administration and Security",
        "description": "Database Administration and Security",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "8",
        "sessionTypes": ["lecture", "lab"],
        "sessionsPerWeek": [1, 1],
        "studentGroupIds": [["SG_Y4_IT"]],
    },
    {
        "courseId": "28",
        "name": "Big Data Modeling and Management System",
        "description": "Big Data Modeling and Management System",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "7",
        "sessionTypes": ["lecture"],
        "sessionsPerWeek": [2],
        "studentGroupIds": [["SG_Y5_S1", "SG_Y5_S2"]],
    },
    {
        "courseId": "29",
        "name": "Distributed and Object Database",
        "description": "Distributed and Object Database",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "2",
        "sessionTypes": ["lecture", "lab"],
        "sessionsPerWeek": [1, 1],
        "studentGroupIds": [["SG_Y5_S1", "SG_Y5_S2"]],
    },
    {
        "courseId": "30",
        "name": "Introduction to Robotics",
        "description": "Introduction to Robotics",
        "ectsCredits": 5,
        "department": "1",
        "teacherId": "6",
        "sessionTypes": ["lecture", "lab"],
        "sessionsPerWeek": [1, 1],
        "studentGroupIds": [["SG_Y5_S1", "SG_Y5_S2"]],
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
    {
        "studentGroupId": "SG_Y3_SE_S1",
        "name": "3rd Year Software Engineering Section 1",
        "department": "1",
        "size": 52,
        "accessibilityRequirement": False,
    },
    {
        "studentGroupId": "SG_Y3_SE_S2",
        "name": "3rd Year Software Engineering Section 2",
        "department": "1",
        "size": 45,
        "accessibilityRequirement": True,
    },
    {
        "studentGroupId": "SG_Y3_SE_S3",
        "name": "3rd Year Software Engineering Section 3",
        "department": "1",
        "size": 60,
        "accessibilityRequirement": False,
    },
    {
        "studentGroupId": "SG_Y3_SE_S4",
        "name": "3rd Year Software Engineering Section 4",
        "department": "1",
        "size": 40,
        "accessibilityRequirement": False,
    },
    {
        "studentGroupId": "SG_Y4_SE_S1",
        "name": "4th Year Software Engineering Section 1",
        "department": "1",
        "size": 33,
        "accessibilityRequirement": False,
    },
    {
        "studentGroupId": "SG_Y4_SE_S2",
        "name": "4th Year Software Engineering Section 2",
        "department": "1",
        "size": 48,
        "accessibilityRequirement": True,
    },
    {
        "studentGroupId": "SG_Y4_AI",
        "name": "4th Year Artificial Intelligence",
        "department": "1",
        "size": 70,
        "accessibilityRequirement": False,
    },
    {
        "studentGroupId": "SG_Y4_CY",
        "name": "4th Year Cybersecurity",
        "department": "1",
        "size": 35,
        "accessibilityRequirement": True,
    },
    {
        "studentGroupId": "SG_Y4_IT",
        "name": "4th Year Information Technology",
        "department": "1",
        "size": 61,
        "accessibilityRequirement": False,
    },
    {
        "studentGroupId": "SG_Y5_S1",
        "name": "5th Year Section 1",
        "department": "1",
        "size": 28,
        "accessibilityRequirement": False,
    },
    {
        "studentGroupId": "SG_Y5_S2",
        "name": "5th Year Section 2",
        "department": "1",
        "size": 39,
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
