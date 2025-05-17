from django.http import HttpResponseForbidden
import os
from decouple import config


class RestrictAPIMiddleware:
    # API_KEY = os.getenv('API_KEY', 'your-secret-key-here')  # Store in environment variables
    API_KEY = config("PARSER_API_KEY")
    # PROTECTED_PATH = ''
    PROTECTED_PATH = "/api/validate-csv/"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only check API key for the validate-csv endpoint
        if request.path == self.PROTECTED_PATH:
            if request.headers.get("X-API-Key") != self.API_KEY:
                return HttpResponseForbidden("Invalid or missing API key")
        return self.get_response(request)
