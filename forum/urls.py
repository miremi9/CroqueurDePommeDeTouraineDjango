from django.urls import path

from . import views

app_name = "forum"
urlpatterns = [
    path(
        "section/<slug:slug>/",
        views.section_detail,
        name="section_detail"
    ),
    path('', views.main.as_view(), name='index'),
]