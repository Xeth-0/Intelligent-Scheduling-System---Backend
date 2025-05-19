from django.http import HttpResponseForbidden
from decouple import config


class RestrictAPIMiddleware:
    API_KEY = config("PARSER_API_KEY")
    PROTECTED_PATH = "/api/validate-csv/"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Check if request path starts with the protected path
        if request.path.startswith(self.PROTECTED_PATH):
            if request.headers.get("PARSER-API-KEY") != self.API_KEY:

                return HttpResponseForbidden("Invalid or missing API key", self.API_KEY, request.headers.get('PARSER_API_KEY'))
        return self.get_response(request)
