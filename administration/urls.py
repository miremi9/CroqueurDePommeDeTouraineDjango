from django.urls import path

from . import views
from .views import SiteBodyUpdateView

app_name = "administration"
urlpatterns = [
    path('sections/', views.SectionAdminListView.as_view(), name='sections'),
    path('sections/?<int:pk>/', views.SectionEdit.as_view(), name='section_detail'),
    path('sections/create/', views.SectionEdit.as_view(), name='section_create'),
    path('roles/', views.RoleAdminListView.as_view(), name='roles'),
    path('roles/<int:pk>/', views.SectionEdit.as_view(), name='role_detail'),
    path('users/', views.UserAdminListView.as_view(), name='users'),
    path('users/<int:pk>/', views.SectionEdit.as_view(), name='user_detail'),
    path("site/", SiteBodyUpdateView.as_view(), name="sitebody_edit"
         ),
]
