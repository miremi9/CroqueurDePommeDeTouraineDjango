from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.shortcuts import render, get_object_or_404
from django.urls import reverse_lazy
from django.views.generic import UpdateView, CreateView

from administration.forms import SectionForm
from forum.models import Section
from tools import authorisations
from tools.authorisations import is_admin
from tools.views import listview_factory
from users.models import Role, User


# Create your views here.
def edit_sections(request):
    return render(request, 'administration/edit_sections.html')


SectionAdminListView = listview_factory(Section, 'administration:section_detail', 'administration:section_create',
                                        authorisations.is_admin, 'name')
RoleAdminListView = listview_factory(Role, 'administration:role_detail', None, authorisations.is_admin, 'name')
UserAdminListView = listview_factory(User, 'administration:user_detail', None, authorisations.is_admin, 'username')


class SectionEdit(LoginRequiredMixin, UserPassesTestMixin, CreateView, UpdateView):
    model = Section
    form_class = SectionForm
    template_name = 'administration/edit_section.html'
    success_url = reverse_lazy('administration:sections')

    def test_func(self):
        return is_admin(self.request)

    def get_object(self, queryset=None):
        # On tente de récupérer le pk depuis l'URL
        pk = self.kwargs.get('pk')
        if pk:
            # Si pk existe, on récupère l'instance existante
            return get_object_or_404(Section, pk=pk)
        # Sinon, on retourne None pour créer un nouvel objet
        return None
