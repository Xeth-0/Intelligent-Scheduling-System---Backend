import base64
import pandas as pd
import re

import os
import pika
import json
from io import StringIO


# 2: Function to read CSV file
def read_csv(file, delimiter=",", encoding="utf-8"):
    try:
        df = pd.read_csv(file, delimiter=delimiter, encoding=encoding)
        return df, []
    except Exception as e:
        return None, [f"Failed to read CSV: {str(e)}"]


# 3: Function to check headers
def check_headers(df, expected_columns):
    actual_columns = df.columns.tolist()
    missing = [col for col in expected_columns if col not in actual_columns]
    extra = [col for col in actual_columns if col not in expected_columns]
    errors = []
    if missing:
        errors.append(f"Missing columns: {', '.join(missing)}")
    if extra:
        errors.append(f"Extra columns: {', '.join(extra)}")
    return errors


def check_data_types(df, type_checks):
    errors = []
    for col, expected_type in type_checks.items():
        if col not in df.columns:
            continue
        if expected_type == "numeric":
            if not pd.api.types.is_numeric_dtype(df[col]):
                errors.append(f"Column '{col}' must be numeric")
        elif expected_type == "string":
            if not pd.api.types.is_string_dtype(df[col]):
                errors.append(f"Column '{col}' must be a string")
    return errors


# 4: Function to check for empty values
def check_empty(df, required_columns):
    errors = []
    for col in required_columns:
        if col not in df.columns:
            continue
        # missing = df[df[col].isnull()]
        missing = df[df[col].isnull() | (df[col].astype(str).str.strip() == "")]
        for idx in missing.index:
            errors.append(f"Missing value in row {idx+1}, column '{col}'")
    return errors


# 5: Helper function to validate email format
def validate_email(email):
    if pd.isnull(email) or not isinstance(email, str):
        return False
    email = email.strip()
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return bool(re.match(pattern, email))


# 6: Function to check format-specific validations
# def check_formats(df, format_checks):
#     errors = []
#     for col, format_type in format_checks.items():
#         if col not in df.columns:
#             continue
#         if format_type == "email":
#             invalid = df[~df[col].apply(validate_email)]
#             for idx, row in invalid.iterrows():
#                 errors.append(f"Invalid email format in row {idx+1}: '{row[col]}'")
#         if format_type == 'boolean':
#             invalid = df[~df[col].apply(lambda x: isinstance(x, bool))]
#             for idx, row in invalid.iterrows():
#                 errors.append(f"Invalid boolean format in row {idx+1}: '{row[col]}'")
#     return errors
import uuid


def check_formats(df, format_checks):
    errors = []
    for col, format_type in format_checks.items():
        if col not in df.columns:
            continue
        if format_type == "email":
            invalid = df[~df[col].apply(validate_email)]
            for idx, row in invalid.iterrows():
                errors.append(f"Invalid email format in row {idx+1}: '{row[col]}'")
        elif format_type == "uuid":

            def validate_uuid(value):
                try:
                    uuid.UUID(str(value))
                    return True
                except ValueError:
                    return False

            invalid = df[~df[col].apply(validate_uuid)]
            for idx, row in invalid.iterrows():
                errors.append(
                    f"Invalid UUID in row {idx+1}, column '{col}': '{row[col]}'"
                )
        elif format_type == "boolean":
            valid_bools = [True, False, 1, 0, "True", "False", "1", "0"]
            invalid = df[~df[col].isin(valid_bools)]
            for idx, row in invalid.iterrows():
                errors.append(
                    f"Invalid boolean in row {idx+1}, column '{col}': '{row[col]}'"
                )
    return errors


# 7: Function to check unique constraints
def check_unique(df, unique_columns):
    errors = []
    for col in unique_columns:
        if col not in df.columns:
            continue
        duplicates = df[df.duplicated(subset=[col], keep=False)]
        if not duplicates.empty:
            dup_values = duplicates[col].unique()
            for val in dup_values:
                rows = duplicates[duplicates[col] == val].index.tolist()
                errors.append(
                    f"Duplicate value '{val}' in column '{col}' at rows {', '.join(map(str, [r+1 for r in rows]))}"
                )
    return errors


# 8: Function to check value ranges
def check_value_ranges(df, value_ranges):
    errors = []
    for col, allowed_values in value_ranges.items():
        if col not in df.columns:
            continue
        invalid = df[~df[col].isin(allowed_values)]
        for idx, row in invalid.iterrows():
            errors.append(f"Invalid value '{row[col]}' in row {idx+1}, column '{col}'")
    return errors


# 9: Function to check string lengths
def check_lengths(df, length_checks):
    errors = []
    for col, max_length in length_checks.items():
        if col not in df.columns:
            continue
        too_long = df[df[col].str.len() > max_length]
        for idx, row in too_long.iterrows():
            errors.append(
                f"Value too long in row {idx+1}, column '{col}': '{row[col]}' (max {max_length} chars)"
            )
    return errors


# 10: Function to check numerical constraints
def check_numerical_constraints(df, numerical_checks):
    errors = []
    for col, constraint in numerical_checks.items():
        if col not in df.columns:
            continue
        # First, ensure the column is numeric
        if not pd.api.types.is_numeric_dtype(df[col]):
            errors.append(f"Column '{col}' must be numeric")
            continue
        # Then, apply the constraint
        if constraint == "positive_integer":
            invalid = df[df[col] <= 0]  # Changed to <= 0 to exclude zero
            for idx, row in invalid.iterrows():
                errors.append(
                    f"Invalid value in row {idx+1}, column '{col}': '{row[col]}' (must be a non negative integer)"
                )
    return errors


# 11: Function to check for duplicate rows
def check_duplicate_rows(df):
    duplicates = df[df.duplicated(keep=False)]
    if not duplicates.empty:
        errors = []
        for idx in duplicates.index:
            errors.append(f"Duplicate row at {idx+1}")
        return errors
    return []


def parse(df) -> list[dict]:
    return df.to_dict(orient="records")


# 12: Pipeline function to validate CSV
def validate_csv_file(file_path, config):
    file = StringIO(file_path)
    df, read_errors = read_csv(
        file,
        delimiter=config.get("delimiter", ","),
        encoding=config.get("encoding", "utf-8"),
    )
    if df is None:
        return {"success": False, "errors": read_errors}

    errors = read_errors

    # Check headers first
    header_errors = check_headers(df, config["expected_columns"])
    errors.extend(header_errors)

    # Proceed with other checks only if headers are correct
    if not header_errors:
        errors.extend(check_empty(df, config.get("required_columns", [])))
        errors.extend(check_formats(df, config.get("format_checks", {})))
        errors.extend(check_data_types(df, config.get("type_checks", {})))
        errors.extend(check_unique(df, config.get("unique_columns", [])))
        errors.extend(check_value_ranges(df, config.get("value_ranges", {})))
        errors.extend(check_lengths(df, config.get("length_checks", {})))
        errors.extend(
            check_numerical_constraints(df, config.get("numerical_checks", {}))
        )
        errors.extend(check_duplicate_rows(df))

    success = len(errors) == 0
    data = []
    if success:
        data = parse(df)
    return {"success": success, "errors": errors, "data": data}


DEPARTMENT_CONFIG = {
    "expected_columns": [
        "departmentId",  # Will be converted to UUID later if needed
        "name",
        "campusId",
    ],
    "required_columns": ["departmentId", "name", "campusId"],
    "unique_columns": ["departmentId", "name"],
    "length_checks": {
        "name": 100  # Adjust max length based on your schema constraints
    },
}

COURSE_CONFIG = {
    "expected_columns": [
        "courseId",  # Will be converted to UUID later
        "name",
        "code",
        "departmentId",  # FK to Department
        "description",  # Optional
        "sessionType",
        "sessionsPerWeek",
    ],
    "required_columns": [
        "courseId",
        "name",
        "code",
        "departmentId",
        "sessionType",
        "sessionsPerWeek",
    ],
    "unique_columns": ["courseId", "code"],
    "length_checks": {
        "name": 100,
        "code": 20,
        "description": 500,  # Optional but still enforce a max length
    },
    "value_ranges": {"sessionType": ["LECTURE", "LAB", "SEMINAR"]},
    "numerical_checks": {"sessionsPerWeek": "non_negative_integer"},
}

TEACHER_CONFIG = {
    "expected_columns": [
        "teacherId",  # Will be converted to UUID later if needed
        "firstName",
        "lastName",
        "email",
        "password",  # Optional
        "phone",
        "role",
        "departmentId",
        "needWheelchairAccessibleRoom",  # Optional
    ],
    "required_columns": [
        "teacherId",
        "firstName",
        "lastName",
        "email",
        "phone",
        "role",
        "departmentId",
    ],
    "unique_columns": ["teacherId", "email"],
    "format_checks": {
        "email": "email",
        "needWheelchairAccessibleRoom": "boolean",
    },
    "value_ranges": {"role": ["TEACHER"]},
    "length_checks": {"firstName": 50, "lastName": 50, "phone": 15},
}

STUDENTGROUP_CONFIG = {
    "expected_columns": [
        "studentGroupId",  # Will be converted to UUID later
        "name",
        "size",
        "accessibilityRequirement",
        "departmentId",  # FK to Department
    ],
    "required_columns": ["studentGroupId", "name", "size", "departmentId"],
    "unique_columns": ["studentGroupId", "name"],
    "length_checks": {"name": 100},
    "numerical_checks": {"size": "non_negative_integer"},
    "format_checks": {
        "accessibilityRequirement": "boolean",
        "size": "non_negative_integer",
    },
}

CLASSROOM_CONFIG = {
    "expected_columns": [
        "classroomId",  # Will be converted to UUID later
        "name",
        "capacity",
        "type",
        "campusId",
        "buildingId",  # Optional
        "isWheelchairAccessible",  # Optional Boolean
        "openingTime",  # Optional (expected as String - format can be validated separately)
        "closingTime",  # Optional (same)
        "floor",
    ],
    "required_columns": [
        "classroomId",
        "name",
        "capacity",
        "type",
        "campusId",
        "floor",
    ],
    "unique_columns": ["classroomId", "name"],
    "length_checks": {"name": 100},
    "type_checks": {"capacity": "numeric", "name": "string"},
    "numerical_checks": {
        "capacity": "non_negative_integer",
        "floor": "non_negative_integer",
    },
    "value_ranges": {"type": ["LECTURE", "LAB", "SEMINAR"]},
    "format_checks": {"isWheelchairAccessible": "boolean"},
}

STUDENT_CONFIG = {
    "expected_columns": [
        "studentId",  # Will be converted to UUID later
        "firstName",
        "lastName",
        "email",
        "password",  # Optional
        "phone",
        "role",
        "needWheelchairAccessibleRoom",  # Optional Boolean
        "studentGroupId",
    ],
    "required_columns": [
        "studentId",
        "firstName",
        "lastName",
        "email",
        "phone",
        "role",
        "studentGroupId",
    ],
    "unique_columns": ["studentId", "email"],
    "length_checks": {"firstName": 50, "lastName": 50, "phone": 20},
    "value_ranges": {"role": ["STUDENT"]},
    "format_checks": {"email": "email", "needWheelchairAccessibleRoom": "boolean"},
}

SGCOURSE_CONFIG = {
    "expected_columns": ["studentGroupId", "courseId"],
    "required_columns": ["studentGroupId", "courseId"],
    # "format_checks": {"studentGroupId": "uuid", "courseId": "uuid"},
    "unique_columns": ["studentGroupId", "courseId"],
}


CONFIGS = {
    "DEPARTMENT": DEPARTMENT_CONFIG,
    "COURSE": COURSE_CONFIG,
    "TEACHER": TEACHER_CONFIG,
    "STUDENTGROUP": STUDENTGROUP_CONFIG,
    "CLASSROOM": CLASSROOM_CONFIG,
    "STUDENT": STUDENT_CONFIG,
    "SGCOURSE": SGCOURSE_CONFIG,
}

# consumer.py
import os
import json
import base64
import pika

import dotenv

# dotenv.load_dotenv()


def publish_result(task_id, result):
    connection = pika.BlockingConnection(pika.URLParameters(os.getenv("RABBITMQ_URL")))
    channel = connection.channel()
    routing_key = "csv_validation_response"

    # Declare exchange and queue
    channel.queue_declare(queue='csv_validation_response', durable=True)

    # Wrapped payload
    message = {
        "pattern": "csv_validation_response",
        "data": {
            "taskId": task_id,
            "result": result
        }
    }

    try:
        channel.basic_publish(
            exchange='',
            routing_key=routing_key,
            body=json.dumps(message),
            properties=pika.BasicProperties(delivery_mode=2)
        )
        print(f"Published event '{routing_key}' to exchange  with payload: {message}")
    except Exception as e:
        print(f"Error publishing event: {e}")
    finally:
        connection.close()

def on_message(ch, method, properties, body):
    print("[x] Received message")
    try:
        payload = json.loads(body)
        print("payload: ", payload)
        data = payload.get("data")
        task_id = data.get("taskId")
        file_data_encoded = data.get("fileData")
        category = data.get("category")

        if not task_id or not file_data_encoded or not category:
            raise ValueError("Invalid message format")
        file_data = base64.b64decode(file_data_encoded).decode("utf-8")
        result = validate_csv_file(file_data, CONFIGS[category])

        publish_result(task_id, result)

    except Exception as e:

        print(f"[!] Error processing message: {e}")

    ch.basic_ack(delivery_tag=method.delivery_tag)

import time


def start_consumer():
    print("[*] Starting consumer service...")
    for i in range(10):  # retry up to 10 times
        try:
            print(f"Attempt {i + 1}: Connecting to RabbitMQ...")
            connection = pika.BlockingConnection(
                pika.URLParameters(os.getenv("RABBITMQ_URL"))
            )
            channel = connection.channel()
            channel.queue_declare(queue="csv_validation_request", durable=True)
            print("connection successful", connection.is_open)
            channel.basic_consume(
                queue="csv_validation_request", on_message_callback=on_message
            )
            print("queue and channel: ", channel.is_open)
            print("to consume...")
            channel.start_consuming()
            print("consuming.....")
            # setup queues, consume, etc.
            break
        except pika.exceptions.AMQPConnectionError as e:

            print(f"Connection failed: {e}, retrying in 5s...")
            time.sleep(5)
    else:
        print("Failed to connect to RabbitMQ after multiple attempts.")


if __name__ == "__main__":
    print("we here!!!")
    start_consumer()

