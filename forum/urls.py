from django.urls import path

from . import views

app_name = "forum"
urlpatterns = [
    path("section/<slug:slug>/article/create", views.ArticleCreateView.as_view(), name="article_create"),
    path("section/<slug:slug>/article/<str:id>", views.ArticleUpdateView.as_view(), name="article_update"),
    path("section/<slug:slug>/", views.SectionDetailView.as_view(), name="section_detail"),
    path('', views.main.as_view(), name='index'),

]
