import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .utils.csv_validator import validate_csv, CONFIGS
import tempfile


@csrf_exempt
def validate(csv_file, config):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as temp_file:
        for chunk in csv_file.chunks():
            temp_file.write(chunk)
        temp_file_path = temp_file.name

    # Run validation
    result = validate_csv(temp_file_path, config)

    # Clean up temporary file
    import os

    os.unlink(temp_file_path)

    return JsonResponse(result)


@csrf_exempt
def validate_teacher_csv_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests are allowed"}, status=405)

    # Check for required fields
    if "csv_file" not in request.FILES:
        return JsonResponse({"error": "Missing csv_file "}, status=400)
    # Extract file and config
    csv_file = request.FILES["csv_file"]
    config = CONFIGS["TEACHER"]

    return validate(csv_file, config)


@csrf_exempt
def validate_department_csv_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests are allowed"}, status=405)

    # Check for required fields
    if "csv_file" not in request.FILES:
        return JsonResponse({"error": "Missing csv_file "}, status=400)
    # Extract file and config
    csv_file = request.FILES["csv_file"]
    config = CONFIGS["DEPARTMENT"]

    return validate(csv_file, config)


@csrf_exempt
def validate_course_csv_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests are allowed"}, status=405)

    # Check for required fields
    if "csv_file" not in request.FILES:
        return JsonResponse({"error": "Missing csv_file "}, status=400)
    # Extract file and config
    csv_file = request.FILES["csv_file"]
    config = CONFIGS["COURSE"]

    return validate(csv_file, config)


@csrf_exempt
def validate_student_csv_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests are allowed"}, status=405)

    # Check for required fields
    if "csv_file" not in request.FILES:
        return JsonResponse({"error": "Missing csv_file "}, status=400)
    # Extract file and config
    csv_file = request.FILES["csv_file"]
    config = CONFIGS["STUDENT"]

    return validate(csv_file, config)


@csrf_exempt
def validate_classroom_csv_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests are allowed"}, status=405)

    # Check for required fields
    if "csv_file" not in request.FILES:
        return JsonResponse({"error": "Missing csv_file "}, status=400)
    # Extract file and config
    csv_file = request.FILES["csv_file"]
    config = CONFIGS["CLASSROOM"]

    return validate(csv_file, config)


@csrf_exempt
def validate_studentgroup_csv_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests are allowed"}, status=405)

    # Check for required fields
    if "csv_file" not in request.FILES:
        return JsonResponse({"error": "Missing csv_file "}, status=400)
    # Extract file and config
    csv_file = request.FILES["csv_file"]
    config = CONFIGS["STUDENTGROUP"]

    return validate(csv_file, config)


@csrf_exempt
def validate_sgcourse_csv_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests are allowed"}, status=405)

    # Check for required fields
    if "csv_file" not in request.FILES:
        return JsonResponse({"error": "Missing csv_file "}, status=400)
    # Extract file and config
    csv_file = request.FILES["csv_file"]
    config = CONFIGS["SGCOURSE"]

    return validate(csv_file, config)
