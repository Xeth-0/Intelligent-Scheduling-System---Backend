from django.urls import path
from .views import validate_csv_view

urlpatterns = [
    path("api/validate-csv/", validate_csv_view, name="validate_csv"),
]
