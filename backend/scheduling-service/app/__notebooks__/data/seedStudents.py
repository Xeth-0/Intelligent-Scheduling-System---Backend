import csv
import random

# --- Configuration ---

# List of student group IDs (sections 1 through 19)
STUDENT_GROUP_IDS = [f"sgp-sec-{i:02d}" for i in range(1, 20)]

# Sections that require wheelchair accessibility for their students
ACCESSIBLE_GROUPS = {
    "sgp-sec-03",
    "sgp-sec-07",
    "sgp-sec-12",
    "sgp-sec-15",
    "sgp-sec-18",
}

STUDENTS_PER_GROUP = 50
OUTPUT_FILENAME = "students.csv"

# Generic names for random generation
FIRST_NAMES = [
    "Abel",
    "Biniam",
    "Daniel",
    "Elias",
    "Firaol",
    "Girma",
    "Hana",
    "Isaac",
    "Jemal",
    "Kaleb",
    "Lia",
    "Mekdes",
    "Noah",
    "Olivia",
    "Paul",
    "Rahel",
    "Samuel",
    "Tigist",
    "Yonas",
    "Zewde",
    "Abeba",
    "Berhanu",
    "Chala",
    "Dawit",
    "Eden",
]
LAST_NAMES = [
    "Tadesse",
    "Bekele",
    "Haile",
    "Abebe",
    "Lemma",
    "Gebre",
    "Wolde",
    "Mekonnen",
    "Assefa",
    "Berhanu",
    "Tesfaye",
    "Nigussie",
    "Girma",
    "Desta",
    "Kebede",
]


def generate_students_csv():
    """
    Generates a CSV file with student data for all sections.
    """
    student_id_counter = 1
    with open(OUTPUT_FILENAME, "w", newline="") as csvfile:
        fieldnames = [
            "studentId",
            "firstName",
            "lastName",
            "email",
            "password",
            "phone",
            "role",
            "needWheelchairAccessibleRoom",
            "studentGroupId",
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()

        print(f"Generating {len(STUDENT_GROUP_IDS) * STUDENTS_PER_GROUP} students...")

        for group_id in STUDENT_GROUP_IDS:
            # Determine if students in this group need accessible rooms
            needs_accessibility = group_id in ACCESSIBLE_GROUPS

            for _ in range(STUDENTS_PER_GROUP):
                first_name = random.choice(FIRST_NAMES)
                last_name = random.choice(LAST_NAMES)
                student_id_str = f"std-{student_id_counter:04d}"
                phone_str = f"555-{student_id_counter:04d}"
                email_str = f"{first_name.lower()}.{last_name.lower()}{student_id_counter}@example.com"

                writer.writerow(
                    {
                        "studentId": student_id_str,
                        "firstName": first_name,
                        "lastName": last_name,
                        "email": email_str,
                        "password": "password123",  # Generic password
                        "phone": phone_str,
                        "role": "STUDENT",
                        "needWheelchairAccessibleRoom": needs_accessibility,
                        "studentGroupId": group_id,
                    }
                )
                student_id_counter += 1

    print(f"\nSuccessfully created '{OUTPUT_FILENAME}' with {student_id_counter - 1} students.")


if __name__ == "__main__":
    generate_students_csv()