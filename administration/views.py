from django.shortcuts import render
from django.urls import reverse_lazy

import tools
from administration.forms import SectionForm, SiteBodyForm, RoleForm
from forum.models import Section
from main.models import SiteBody
from tools import authorisations
from tools.views import listview_factory, formview_factory
from users.models import Role, User


# Create your views here.
def edit_sections(request):
    return render(request, 'administration/edit_sections.html')


SectionAdminListView = listview_factory(Section, 'administration:section_detail', 'administration:section_create',
                                        authorisations.is_admin, 'name')
RoleAdminListView = listview_factory(Role, 'administration:role_detail', None, authorisations.is_admin, 'name')
UserAdminListView = listview_factory(User, 'users:profile_user', None, authorisations.is_admin, 'username')

SectionEditView = formview_factory(
    my_model=Section,
    name_field="name",
    form=SectionForm,
    cancel_url="/administration/sections/",
    my_success_url="/administration/sections/",
    can_access_function=tools.authorisations.is_admin,
)

SiteBodyUpdateView = formview_factory(
    my_model=SiteBody,
    name_field="title",
    form=SiteBodyForm,
    cancel_url=reverse_lazy("forum:index"),
    my_success_url="/",
    can_access_function=lambda request: request.user.is_staff,
    instance=SiteBody.get_solo()
)

RoleEditView = formview_factory(
    my_model=Role,
    name_field="name",
    form=RoleForm,
    cancel_url="/administration/roles/",
    my_success_url="/administration/roles/",
    can_access_function=tools.authorisations.is_admin,
)
