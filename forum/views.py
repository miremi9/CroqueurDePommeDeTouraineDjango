from django.contrib.auth.mixins import UserPassesTestMixin
# Create your views here.
from django.shortcuts import render
from django.urls import reverse
from django.views import View
from django.views.generic import DetailView, CreateView, UpdateView

import tools.authorisations
from forum.forms import ArticleForm
from forum.models import Section, Article


class ArticleBaseView(UserPassesTestMixin):
    model = Article
    form_class = ArticleForm
    template_name = "forum/article_form.html"

    def get_section(self):
        if 'pk' in self.kwargs:  # Update
            return self.get_object().section
        # Create (on suppose que vous passez le slug de la section dans l'URL)
        return Section.objects.get(slug=self.kwargs['slug'])

    def test_func(self):
        section = self.get_section()
        return tools.authorisations.can_post(self.request.user, section)

    def get_success_url(self):
        return reverse('forum:section_detail', kwargs={'slug': self.object.section.slug})


class ArticleCreateView(ArticleBaseView, CreateView):
    def form_valid(self, form):
        # Associer l'article à la section et à l'auteur lors de la création
        form.instance.section = self.get_section()
        form.instance.author = self.request.user
        return super().form_valid(form)


class ArticleUpdateView(ArticleBaseView, UpdateView):
    pk_url_kwarg = "id"


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
        posts = Article.objects.filter(section_id=section.id)
        context['posts'] = posts
        for post in posts:
            post.edit_form = ArticleForm(instance=post)
        context['can_post'] = tools.authorisations.can_post(self.request.user, section)
        context['article_form'] = ArticleForm()
        return context


class main(View):
    def get(self, request):
        return render(request, "forum/index.html")
