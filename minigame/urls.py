from django.urls import path

from . import views

app_name = "minigame"

urlpatterns = [
    path("", views.game, name="game"),
]
