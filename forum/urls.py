from django.urls import path

from . import views

app_name = "forum"
urlpatterns = [
    path(
        "section/<slug:slug>/",
        views.SectionDetailView.as_view(),
        name="section_detail"
    ),
    path('', views.main.as_view(), name='index'),
]
