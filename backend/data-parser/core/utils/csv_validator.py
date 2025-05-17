# 1: Import libraries
import pandas as pd
import numpy as np
import re


# 2: Function to read CSV file
def read_csv(file_path, delimiter=",", encoding="utf-8"):
    try:
        df = pd.read_csv(file_path, delimiter=delimiter, encoding=encoding)
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


# 4: Function to check for empty values
def check_empty(df, required_columns):
    errors = []
    for col in required_columns:
        if col not in df.columns:
            continue
        missing = df[df[col].isnull()]
        for idx in missing.index:
            errors.append(f"Missing value in row {idx+1}, column '{col}'")
    return errors


# 5: Helper function to validate email format
def validate_email(email):
    if pd.isnull(email):
        return False
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return bool(re.match(pattern, email))


# 6: Function to check format-specific validations
def check_formats(df, format_checks):
    errors = []
    for col, format_type in format_checks.items():
        if col not in df.columns:
            continue
        if format_type == "email":
            invalid = df[~df[col].apply(validate_email)]
            for idx, row in invalid.iterrows():
                errors.append(f"Invalid email format in row {idx+1}: '{row[col]}'")
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
        if constraint == "positive_integer":
            invalid = df[
                (df[col] < 0) | (~df[col].apply(lambda x: isinstance(x, (int, float))))
            ]
            for idx, row in invalid.iterrows():
                errors.append(
                    f"Invalid value in row {idx+1}, column '{col}': '{row[col]}' (must be positive number)"
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


# 12: Pipeline function to validate CSV
def validate_csv(file_path, config):
    df, read_errors = read_csv(
        file_path,
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
        errors.extend(check_unique(df, config.get("unique_columns", [])))
        errors.extend(check_value_ranges(df, config.get("value_ranges", {})))
        errors.extend(check_lengths(df, config.get("length_checks", {})))
        errors.extend(
            check_numerical_constraints(df, config.get("numerical_checks", {}))
        )
        errors.extend(check_duplicate_rows(df))

    success = len(errors) == 0
    return {"success": success, "errors": errors}
TEACHER_CONFIG = {
        "expected_columns": [
            "userId",
            "firstName",
            "lastName",
            "email",
            "departmentId",
            "role",
        ],
        "required_columns": [
            "userId",
            "firstName",
            "lastName",
            "email",
            "departmentId",
        ],
        "unique_columns": ["userId", "email"],
        "format_checks": {"email": "email"},
        "value_ranges": {"role": ["ADMIN", "TEACHER", "STUDENT"]},
        "length_checks": {"firstName": 50, "lastName": 50},
        "numerical_checks": {"departmentId": "positive_integer"},
    }

def main():

    # 13: Example usage with sample configuration
    

    result = validate_csv("../a.csv", TEACHER_CONFIG)
    if result["success"]:
        print("Validation successful")
    else:
        print("Validation errors:")
        for error in result["errors"]:
            print(error)


if __name__ == "__main__":
    main()

"""
3 mock data, endpoints, schemas
database populate

"""
