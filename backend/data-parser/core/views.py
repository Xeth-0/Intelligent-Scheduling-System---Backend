import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .utils.csv_validator import validate_csv, CONFIGS


@csrf_exempt
def validate_csv_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests are allowed"}, status=405)

    # Check for required fields
    if "csv_file" not in request.FILES or "category" not in request.POST:
        return JsonResponse({"error": "Missing csv_file or category"}, status=400)

    # Extract file and config
    csv_file = request.FILES["csv_file"]
    category = json.loads(request.POST["category"])
    try:
        config = json.loads(request.POST["config"])
    except json.JSONDecodeError:
        config = CONFIGS[category]
    # Save uploaded file temporarily
    import tempfile

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
