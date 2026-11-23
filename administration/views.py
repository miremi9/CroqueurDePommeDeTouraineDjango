from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.shortcuts import render
from django.urls import reverse_lazy
from django.views.generic import TemplateView

import tools
from administration.forms import SectionForm, SiteBodyForm, RoleForm
from forum.models import Section, Article
from main.models import SiteBody, VisitorLog
from tools import authorisations
from tools.views import listview_factory, formview_factory
from users.models import Role, User

# Couleurs des 3 premières positions de la palette catégorielle (voir skill dataviz) :
# ce sont les seules à valider toutes les paires en "small multiples".
CHART_COLORS = {
    "messages": "#2a78d6",
    "connexions": "#eb6834",
    "visiteurs": "#1baf7a",
}


# Create your views here.
def edit_sections(request):
    return render(request, 'administration/edit_sections.html')


def daily_counts(queryset, date_field):
    """Agrège un queryset par jour sur date_field, sans passer par une table intermédiaire."""
    return list(
        queryset
        .annotate(day=TruncDate(date_field))
        .values("day")
        .annotate(valeur=Count("id"))
        .order_by("day")
    )


class DashboardView(LoginRequiredMixin, UserPassesTestMixin, TemplateView):
    template_name = "administration/dashboard.html"

    def test_func(self):
        return authorisations.is_admin(self.request)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        charts_source = [
            ("messages", "Messages par jour", daily_counts(Article.objects.all(), "created_at")),
            ("connexions", "Connexions par jour", daily_counts(User.objects.filter(last_login__isnull=False), "last_login")),
            ("visiteurs", "Nouveaux visiteurs par jour", daily_counts(VisitorLog.objects.all(), "first_seen")),
        ]

        context["charts"] = [
            {
                "id": chart_id,
                "label": label,
                "color": CHART_COLORS[chart_id],
                "data": [
                    {"date": row["day"].isoformat(), "valeur": row["valeur"]}
                    for row in rows
                ],
            }
            for chart_id, label, rows in charts_source
        ]
        return context


SectionAdminListView = listview_factory(Section, 'administration:section_detail', 'administration:section_create',
                                        authorisations.is_admin, 'name')
RoleAdminListView = listview_factory(Role, 'administration:role_detail', 'administration:role_create', authorisations.is_admin, 'name')
UserAdminListView = listview_factory(User, 'users:profile_edit', None, authorisations.is_admin, 'username')

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
    can_access_function=authorisations.is_admin,
    instance=lambda: SiteBody.get_solo()
)

RoleEditView = formview_factory(
    my_model=Role,
    name_field="name",
    form=RoleForm,
    cancel_url="/administration/roles/",
    my_success_url="/administration/roles/",
    can_access_function=tools.authorisations.is_admin,
)
