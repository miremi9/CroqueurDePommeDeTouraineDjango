from django.urls import path

from . import views

app_name = "forum"
urlpatterns = [
    path("section/<slug:slug>/article/create", views.ArticleCreateView.as_view(), name="article_create"),
    path("section/<slug:slug>/article/<str:id>/delete", views.ArticleDeleteView.as_view(), name="article_delete"),
    path("section/<slug:slug>/article/<str:id>", views.ArticleUpdateView.as_view(), name="article_update"),
    path("section/<slug:slug>/", views.SectionDetailView.as_view(), name="section_detail"),
    path('', views.MainPage.as_view(), name='index'),
    path("article/<int:id>/toggle-pin/", views.article_toggle_pin, name="article_toggle_pin"),
    path("article/<int:id>/toggle-pin-main-page/", views.article_toggle_pin_main_page, name="article_toggle_pin_main_page",
         ),

]
