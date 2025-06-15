import base64
import pandas as pd
import re

import os
import pika
import json
from io import StringIO
from pydantic import BaseModel
from typing import List, Optional, Literal


"""
    row!: number;
  column!: string;
  message!: string;
  taskId!: string;
  severity!: TaskSeverity;
  createdAt!: Date;
"""


class ErrorType(BaseModel):
    row: int
    column: Optional[str] = None
    message: str
    taskId: str
    severity: Literal["ERROR", "WARNING"] = "ERROR"


# 2: Function to read CSV file
def read_csv(file, taskId, delimiter=",", encoding="utf-8"):
    try:
        df = pd.read_csv(file, delimiter=delimiter, encoding=encoding)
        return df, []
    except Exception as e:
        err = ErrorType(
            row=0,
            column=None,
            message=f"Failed to read CSV: {str(e)}",
            taskId=taskId,
            severity="ERROR",
        )
        return None, [err]


# 3: Function to check headers
def check_headers(
    df,
    taskId,
    expected_columns,
):
    actual_columns = df.columns.tolist()
    missing = [col for col in expected_columns if col not in actual_columns]
    extra = [col for col in actual_columns if col not in expected_columns]
    errors = []
    if missing:
        err = ErrorType(
            row=0,
            column=None,
            message=f"Missing columns: {', '.join(missing)}",
            taskId=taskId,
            severity="ERROR",
        )
        errors.append(err)
    if extra:
        err = ErrorType(
            row=0,
            column=None,
            message=f"Extra columns: {', '.join(extra)}",
            taskId=taskId,
            severity="ERROR",
        )
        errors.append(err)
    return errors


def check_data_types(df, taskId, type_checks):
    errors = []
    for col, expected_type in type_checks.items():
        if col not in df.columns:
            continue
        if expected_type == "numeric":
            if not pd.api.types.is_numeric_dtype(df[col]):
                err = ErrorType(
                    row=0,
                    column=None,
                    message=f"Column '{col}' must be numeric",
                    taskId=taskId,
                    severity="ERROR",
                )
                errors.append(err)
        elif expected_type == "string":
            if not pd.api.types.is_string_dtype(df[col]):
                err = ErrorType(
                    row=0,
                    column=None,
                    message=f"Column '{col}' must be a string",
                    taskId=taskId,
                    severity="ERROR",
                )
                errors.append(err)
    return errors


# 4: Function to check for empty values
def check_empty(df, taskId, required_columns):
    errors = []
    for col in required_columns:
        if col not in df.columns:
            continue
        # missing = df[df[col].isnull()]
        missing = df[df[col].isnull() | (df[col].astype(str).str.strip() == "")]
        for idx in missing.index:
            err = ErrorType(
                row=idx + 1,
                column=col,
                message="Missing value",
                taskId=taskId,
                severity="ERROR",
            )
            errors.append(err)
    return errors


# 5: Helper function to validate email format
def validate_email(email):
    if pd.isnull(email) or not isinstance(email, str):
        return False
    email = email.strip()
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return bool(re.match(pattern, email))


# 6: Function to check format-specific validations
# def check_formats(df,taskId, format_checks):
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


def valid_string(value):
    return isinstance(value, str)


def check_formats(df, taskId, format_checks):
    errors = []
    for col, format_type in format_checks.items():
        if col not in df.columns:
            continue
        if format_type == "email":
            invalid = df[~df[col].apply(validate_email)]
            for idx, row in invalid.iterrows():
                err = ErrorType(
                    row=idx + 1,
                    column=col,
                    message=f"Invalid email format",
                    taskId=taskId,
                    severity="ERROR",
                )
                errors.append(err)

        elif format_type == "uuid":

            def validate_uuid(value):
                try:
                    uuid.UUID(str(value))
                    return True
                except ValueError:
                    return False

            invalid = df[~df[col].apply(validate_uuid)]
            for idx, row in invalid.iterrows():
                err = ErrorType(
                    row=idx + 1,
                    column=col,
                    message=f"Invalid UUID {row[col]}",
                    taskId=taskId,
                    severity="ERROR",
                )
                errors.append(err)

        elif format_type == "boolean":
            valid_bools = [True, False, 1, 0, "True", "False", "1", "0"]
            invalid = df[~df[col].isin(valid_bools)]
            for idx, row in invalid.iterrows():
                err = ErrorType(
                    row=idx + 1,
                    column=col,
                    message=f"Invalid boolean: '{row[col]}'",
                    taskId=taskId,
                    severity="ERROR",
                )
                errors.append(err)

        elif str(format_type).lower() == "string":

            invalid = df[~df[col].apply(valid_string)]
            for idx, row in invalid.iterrows():
                err = ErrorType(
                    row=idx + 1,
                    column=col,
                    message=f"Invalid string: '{row[col]}'",
                    taskId=taskId,
                    severity="ERROR",
                )
                errors.append(err)
    return errors


# 7: Function to check unique constraints
def check_unique(df, taskId, unique_columns):
    errors = []
    for col in unique_columns:
        if col not in df.columns:
            continue
        duplicates = df[df.duplicated(subset=[col], keep=False)]
        if not duplicates.empty:
            dup_values = duplicates[col].unique()
            for val in dup_values:
                rows = duplicates[duplicates[col] == val].index.tolist()
                err = ErrorType(
                    row=rows[0] + 1,
                    column=col,
                    message=f"Duplicate value '{val}' at rows {', '.join(map(str, [r+1 for r in rows]))}",
                    taskId=taskId,
                    severity="ERROR",
                )
                errors.append(err)

    return errors


# 8: Function to check value ranges
def check_value_ranges(df, taskId, value_ranges):
    errors = []
    for col, allowed_values in value_ranges.items():
        if col not in df.columns:
            continue
        invalid = df[~df[col].isin(allowed_values)]
        for idx, row in invalid.iterrows():
            err = ErrorType(
                row=idx + 1,
                column=col,
                message=f"Invalid value '{row[col]}'",
                taskId=taskId,
                severity="ERROR",
            )
            errors.append(err)

    return errors


# 9: Function to check string lengths
def check_lengths(df, taskId, length_checks):
    errors = []
    for col, max_length in length_checks.items():
        if col not in df.columns:
            continue
        too_long = df[df[col].str.len() > max_length]
        for idx, row in too_long.iterrows():
            err = ErrorType(
                row=idx + 1,
                column=col,
                message=f"Value too long: '{row[col]}' (max {max_length} chars)",
                taskId=taskId,
                severity="ERROR",
            )
            errors.append(err)

    return errors


# 10: Function to check numerical constraints
def check_numerical_constraints(df, taskId, numerical_checks):
    errors = []
    for col, constraint in numerical_checks.items():
        if col not in df.columns:
            continue
        # First, ensure the column is numeric
        if not pd.api.types.is_numeric_dtype(df[col]):
            err = ErrorType(
                row=0,
                column=col,
                message=f"Column '{col}' must be numeric",
                taskId=taskId,
                severity="ERROR",
            )
            errors.append(err)

            continue
        # Then, apply the constraint
        if constraint == "positive_integer":
            invalid = df[df[col] <= 0]  # Changed to <= 0 to exclude zero
            for idx, row in invalid.iterrows():
                err = ErrorType(
                    row=idx + 1,
                    column=col,
                    message=f"Invalid value: '{row[col]}' (must be a non negative integer)",
                    taskId=taskId,
                    severity="ERROR",
                )
                errors.append(err)

    return errors


# 11: Function to check for duplicate rows
def check_duplicate_rows(df, taskId):
    duplicates = df[df.duplicated(keep=False)]
    if not duplicates.empty:
        errors = []
        for idx in duplicates.index:
            err = ErrorType(
                row=idx + 1,
                column="All",
                message=f"Duplicate row at {idx+1}",
                taskId=taskId,
                severity="ERROR",
            )
            errors.append(err)

        return errors
    return []


def edit_ids(df: pd.DataFrame, editable_comlumns, prefix=""):
    errors = []

    for column in editable_comlumns:
        if column not in df.columns:
            continue
        df[column] = prefix + df[column].astype(str)
    return errors


def parse(df) -> list[dict]:
    # return df.to_dict(orient="records")
    # return df.fillna(value=None).to_dict(orient="records")
    return df.where(pd.notnull(df), None).to_dict(orient="records")


# 12: Pipeline function to validate CSV
def validate_csv_file(file_path, taskId, category, campus_id):
    config = CONFIGS[category]
    file = StringIO(file_path)
    df, read_errors = read_csv(
        file,
        taskId,
        delimiter=config.get("delimiter", ","),
        encoding=config.get("encoding", "utf-8"),
    )
    if df is None:
        return {"success": False, "errors": read_errors, data: [], "type": category}

    errors = read_errors

    # Check headers first
    header_errors = check_headers(df, taskId, config["expected_columns"])
    errors.extend(header_errors)

    # Proceed with other checks only if headers are correct
    if not header_errors:
        errors.extend(check_empty(df, taskId, config.get("required_columns", [])))
        errors.extend(check_formats(df, taskId, config.get("format_checks", {})))
        errors.extend(check_data_types(df, taskId, config.get("type_checks", {})))
        errors.extend(check_unique(df, taskId, config.get("unique_columns", [])))
        errors.extend(check_value_ranges(df, taskId, config.get("value_ranges", {})))
        errors.extend(check_lengths(df, taskId, config.get("length_checks", {})))
        errors.extend(
            check_numerical_constraints(df, taskId, config.get("numerical_checks", {}))
        )
        errors.extend(check_duplicate_rows(df, taskId))
        errors.extend(edit_ids(df, ID_COLUMNS, campus_id))
    success = len(errors) == 0
    data = []
    if success:
        data = parse(df)
    return {
        "success": success,
        "errors": [error.dict() for error in errors],
        "data": data,
        "type": category,
    }

    # return {"success": success, "errors": errors, "data": data, "type": category}


# edit required fields (id fields, foreign or otherwise, need to be edited by adding campusId to make them unique.)

ID_COLUMNS = [
    "deptId",
    "departmentId",
    # "campusId",
    "courseId",
    "teacherId",
    "studentGroupId",
    "classroomId",
    "buildingId",
    "studentId",
]

DEPARTMENT_CONFIG = {
    "expected_columns": [
        "deptId",  # Will be converted to UUID later if needed
        "name",
        "campusId",
    ],
    "required_columns": ["deptId", "name", "campusId"],
    "unique_columns": ["deptId", "name"],
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
    # "unique_columns": ["studentGroupId", "courseId"],
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

dotenv.load_dotenv()


def publish_result(task_id, result, admin_id, campus_id):
    connection = pika.BlockingConnection(pika.URLParameters(os.getenv("RABBITMQ_URL")))
    channel = connection.channel()
    routing_key = "csv_validation_response"

    # Declare exchange and queue
    channel.queue_declare(queue="csv_validation_response", durable=True)

    # Wrapped payload
    message = {
        "pattern": "csv_validation_response",
        "data": {
            "taskId": task_id,
            "result": result,
            "adminId": admin_id,
            "campusId": campus_id,
        },
    }

    try:
        channel.basic_publish(
            exchange="",
            routing_key=routing_key,
            body=json.dumps(message),
            properties=pika.BasicProperties(delivery_mode=2),
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
        admin_id = data.get("adminId")
        campus_id = data.get("campusId")

        if not task_id or not file_data_encoded or not category:
            raise ValueError("Invalid message format")
        file_data = base64.b64decode(file_data_encoded).decode("utf-8")
        result = validate_csv_file(file_data, task_id, category, campus_id)

        publish_result(task_id, result, admin_id, campus_id)

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
"""
decisions:
    * reject the entire file if there are errors
    * prefix all id columns with a prifix (campus_id) to insure intercampus uniqueness
    * send campus_id to queue both in request and response
    * keep track of tasks for each campus and admin using taskId?
concerns:
    * save admin_id - campus_id - task_id in db
    * save task_id - response in db
"""
