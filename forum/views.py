from django.contrib.auth.mixins import UserPassesTestMixin
# Create your views here.
from django.shortcuts import render
from django.urls import reverse_lazy
from django.views import View
from django.views.generic import DetailView, CreateView, UpdateView

import tools.authorisations
from forum.models import Section, Article


class ArticleComposer(UserPassesTestMixin, CreateView, UpdateView):
    model = Article
    form_class = ArticleForm
    template_name = 'forum/edit_article.html'
    success_url = reverse_lazy('forum:sections')


class SectionDetailView(UserPassesTestMixin, DetailView):
    model = Section
    template_name = "forum/section.html"
    context_object_name = "section"  # Nom de la variable dans votre template
    slug_field = 'slug'
    slug_url_kwarg = 'slug'

    def test_func(self):
        section = self.get_object()
        return tools.authorisations.can_read(self.request.user, section)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        section = self.object
        context['posts'] = Article.objects.filter(section_id=section.id)
        context['can_post'] = tools.authorisations.can_post(self.request.user, section)

        return context


class main(View):
    def get(self, request):
        return render(request, "forum/index.html")
