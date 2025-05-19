from django.urls import path
from .views import (
    validate_classroom_csv_view,
    validate_course_csv_view,
    validate_department_csv_view,
    validate_sgcourse_csv_view,
    validate_student_csv_view,
    validate_studentgroup_csv_view,
    validate_teacher_csv_view,
)

urlpatterns = [
    path("department/", validate_department_csv_view, name="validate_csv"),
    path("teacher/", validate_teacher_csv_view, name="validate_csv"),
    path("course/", validate_course_csv_view, name="validate_csv"),
    path("student/", validate_student_csv_view, name="validate_csv"),
    path("studentGroup/", validate_studentgroup_csv_view, name="validate_csv"),
    path("classroom/", validate_classroom_csv_view, name="validate_csv"),
    path("sgcourse/", validate_sgcourse_csv_view, name="validate_csv"),
]
